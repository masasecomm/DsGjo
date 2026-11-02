const productionSiteUrl = "https://www.dpsagovernmentjobs.co.za";

export function getSiteUrl() {
  const configuredUrl = process.env.NODE_ENV === "production"
    ? productionSiteUrl
    : process.env.NEXT_PUBLIC_SITE_URL
      || (process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : productionSiteUrl);

  try {
    return new URL(configuredUrl).origin;
  } catch {
    throw new Error("The configured site URL must be a valid absolute URL.");
  }
}
