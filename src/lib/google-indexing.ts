import { createSign } from "node:crypto";
import { isJobPostingIndexable, type Job } from "@/lib/jobs";
import { getSiteUrl } from "@/lib/site-url";

type GoogleServiceAccount = {
  client_email: string;
  private_key: string;
};

type GoogleTokenResponse = {
  access_token?: unknown;
};

type IndexingResult = {
  ok: boolean;
  quotaExceeded?: boolean;
  message?: string;
};

function getServiceAccount(): GoogleServiceAccount | null {
  const rawAccount = process.env.GOOGLE_INDEXING_SERVICE_ACCOUNT_JSON;
  if (!rawAccount) return null;

  try {
    const account: unknown = JSON.parse(rawAccount);
    if (
      typeof account !== "object"
      || account === null
      || !("client_email" in account)
      || typeof account.client_email !== "string"
      || !("private_key" in account)
      || typeof account.private_key !== "string"
    ) {
      return null;
    }

    return { client_email: account.client_email, private_key: account.private_key };
  } catch {
    return null;
  }
}

export function isGoogleIndexingConfigured() {
  return getServiceAccount() !== null;
}

export function isJobIndexable(
  job: Pick<Job, "status" | "closing_date" | "location" | "province" | "description">,
) {
  return isJobPostingIndexable(job);
}

async function getAccessToken(
  account: GoogleServiceAccount,
): Promise<{ accessToken: string } | { error: string }> {
  const now = Math.floor(Date.now() / 1000);
  const encode = (value: string) => Buffer.from(value).toString("base64url");
  const unsignedToken = [
    encode(JSON.stringify({ alg: "RS256", typ: "JWT" })),
    encode(JSON.stringify({
      iss: account.client_email,
      scope: "https://www.googleapis.com/auth/indexing",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    })),
  ].join(".");
  let signature: string;
  try {
    signature = createSign("RSA-SHA256")
      .update(unsignedToken)
      .end()
      .sign(account.private_key)
      .toString("base64url");
  } catch (error) {
    console.error("Could not sign the Google service-account token.", error);
    return { error: "The Google service-account key is invalid. Add a valid JSON key in Vercel." };
  }
  const assertion = `${unsignedToken}.${signature}`;

  let response: Response;
  try {
    response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    console.error("Could not reach Google OAuth.", error);
    return { error: "Could not connect to Google. Please try again." };
  }

  if (!response.ok) {
    console.error(`Google OAuth returned HTTP ${response.status}.`);
    return {
      error: "Google could not verify the service account. Check the service-account key and try again.",
    };
  }

  let token: GoogleTokenResponse;
  try {
    token = await response.json() as GoogleTokenResponse;
  } catch (error) {
    console.error("Google OAuth returned invalid JSON.", error);
    return { error: "Google returned an invalid sign-in response. Please try again." };
  }

  if (typeof token.access_token !== "string") {
    console.error("Google OAuth response did not contain an access token.");
    return { error: "Google did not provide an access token. Check the service-account setup." };
  }

  return { accessToken: token.access_token };
}

export async function notifyGoogleOfJobUpdate(
  accessToken: string,
  slug: string,
): Promise<IndexingResult> {
  const url = new URL(`/${slug}`, getSiteUrl()).toString();
  let response: Response;

  try {
    response = await fetch("https://indexing.googleapis.com/v3/urlNotifications:publish", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url, type: "URL_UPDATED" }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    console.error("Could not send a URL update notification to Google.", error);
    return { ok: false, message: "Could not connect to Google. Please try again." };
  }

  if (response.ok) return { ok: true };

  let googleMessage = "";
  try {
    const body: unknown = await response.json();
    if (typeof body === "object" && body !== null && "error" in body) {
      const error = body.error;
      if (typeof error === "object" && error !== null && "message" in error && typeof error.message === "string") {
        googleMessage = error.message;
      }
    }
  } catch {
    googleMessage = "";
  }

  const quotaExceeded = response.status === 429
    || /quota exceeded|daily limit/i.test(googleMessage);
  if (quotaExceeded) {
    return {
      ok: false,
      quotaExceeded: true,
      message: "Google’s daily indexing request limit has been reached. Try again after the quota resets.",
    };
  }

  console.error(`Google Indexing API returned HTTP ${response.status}.`, googleMessage);
  if (response.status === 403) {
    return {
      ok: false,
      message: "Google denied this request. Confirm the Indexing API is enabled and the service account owns the Search Console property.",
    };
  }
  return { ok: false, message: `Google could not accept this indexing request (HTTP ${response.status}).` };
}

export async function requestGoogleIndexing(
  slugs: string[],
): Promise<{ submitted: number; failed: number; message?: string; quotaExceeded?: boolean }> {
  const account = getServiceAccount();
  if (!account) {
    return {
      submitted: 0,
      failed: 0,
      message: "Google Indexing is not configured. Add a valid service-account JSON key as GOOGLE_INDEXING_SERVICE_ACCOUNT_JSON in Vercel.",
    };
  }

  if (slugs.length === 0 || slugs.length > 10 || slugs.some((slug) => !slug || slug.startsWith("/") || slug.includes(".."))) {
    return { submitted: 0, failed: 0, message: "The indexing request was invalid. Refresh the page and try again." };
  }

  const tokenResult = await getAccessToken(account);
  if ("error" in tokenResult) {
    return { submitted: 0, failed: 0, message: tokenResult.error };
  }

  const results = await Promise.all(
    slugs.map((slug) => notifyGoogleOfJobUpdate(tokenResult.accessToken, slug)),
  );
  const submitted = results.filter((result) => result.ok).length;
  const failures = results.filter((result) => !result.ok);
  const firstFailure = failures[0];
  return {
    submitted,
    failed: failures.length,
    ...(firstFailure?.message && { message: firstFailure.message }),
    ...(failures.some((result) => result.quotaExceeded) && { quotaExceeded: true }),
  };
}
