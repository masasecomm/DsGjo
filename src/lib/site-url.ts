const fallbackSiteUrl = "https://ds-gjo.vercel.app";

export function getSiteUrl() {
  const productionDomain = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const configuredUrl = productionDomain
    ? `https://${productionDomain}`
    : process.env.NODE_ENV === "production"
      ? fallbackSiteUrl
      : process.env.NEXT_PUBLIC_SITE_URL || fallbackSiteUrl;

  try {
    return new URL(configuredUrl).origin;
  } catch {
    throw new Error("The configured site URL must be a valid absolute URL.");
  }
}
