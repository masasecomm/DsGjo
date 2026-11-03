type TurnstileVerification = "verified" | "invalid" | "unavailable";

type TurnstileSiteverifyResponse = {
  success?: unknown;
};

export async function verifyTurnstileToken(formData: FormData): Promise<TurnstileVerification> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  const token = formData.get("cf-turnstile-response");

  if (!secret) {
    console.error("Could not verify Turnstile token: TURNSTILE_SECRET_KEY is not configured.");
    return "unavailable";
  }
  if (typeof token !== "string" || !token.trim()) return "invalid";

  const body = new URLSearchParams({ secret, response: token });
  let response: Response;
  try {
    response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    console.error("Could not reach Cloudflare Turnstile Siteverify.", error);
    return "unavailable";
  }

  if (!response.ok) {
    console.error(`Cloudflare Turnstile Siteverify returned HTTP ${response.status}.`);
    return "unavailable";
  }

  let result: TurnstileSiteverifyResponse;
  try {
    result = await response.json() as TurnstileSiteverifyResponse;
  } catch (error) {
    console.error("Cloudflare Turnstile Siteverify returned invalid JSON.", error);
    return "unavailable";
  }

  return result.success === true ? "verified" : "invalid";
}
