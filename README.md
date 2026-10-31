# DPSA Jobs

A Next.js jobs website with a WordPress-style admin area, powered by Supabase.

## Stack

- **GitHub** stores the source code and can trigger deployments.
- **Vercel** runs and serves the Next.js website.
- **Supabase** provides PostgreSQL, admin authentication, comments, and the private job-alert subscriber list.

Firebase is not required for this setup. GitHub Pages alone cannot run the server-side admin and database features in this project.

## Run locally

1. Install Node.js 20.9 or newer.
2. Copy `.env.example` to `.env.local`.
3. Add the public URL and publishable key from your Supabase project to `.env.local`. Set `NEXT_PUBLIC_SITE_URL=https://ds-gjo.vercel.app` until the custom domain is moved to this Vercel project.
4. Run `npm install`, then `npm run dev`.

The homepage and visual layout can be previewed without Supabase. Vacancy publishing, comments, subscriptions, and admin sign-in require a configured Supabase project.

## Supabase setup

1. Create a Supabase project.
2. Open **SQL Editor**, run [`supabase/schema.sql`](./supabase/schema.sql), then wait for it to finish. If this project already has the earlier schema, run [`supabase/migrations/20261030_add_imported_dpsa_circulars.sql`](./supabase/migrations/20261030_add_imported_dpsa_circulars.sql) if circular tracking is not installed yet, followed by [`supabase/migrations/20261030_add_structured_dpsa_job_details.sql`](./supabase/migrations/20261030_add_structured_dpsa_job_details.sql) to add structured vacancy data and support larger circular imports. To enable actual popular-search counts and the admin search/page-view reports, run [`supabase/migrations/20261031_add_job_search_analytics.sql`](./supabase/migrations/20261031_add_job_search_analytics.sql) followed by [`supabase/migrations/20261031_add_page_view_analytics.sql`](./supabase/migrations/20261031_add_page_view_analytics.sql).
3. In **Authentication → Users**, create your administrator account.
4. In SQL Editor, promote that account (replace the address):

   ```sql
   update public.profiles
   set role = 'admin'
   where email = 'you@example.com';
   ```

5. Add the project URL and publishable key to `.env.local`, and to Vercel’s environment variables for Production, Preview, and Development as appropriate.
6. Deploy the project to Vercel and add the GitHub repository under the Vercel project’s Git settings for automatic deploys.

The app uses Vercel’s production domain for canonical URLs, `robots.txt`, and the sitemap. Locally, `NEXT_PUBLIC_SITE_URL` supplies the site URL. Published vacancies with future closing dates are included in the sitemap; expired vacancies are hidden from public listings and marked `noindex`. Individual open vacancies with a parsed location include Google `JobPosting` structured data. After deployment, verify the production domain in Google Search Console and submit `/sitemap.xml`; indexing and job-search rich results are subject to Google’s review and are not guaranteed.

The schema enables row-level security. Public visitors can read published vacancies and approved comments, submit comments for review, and add their email to the alert list. Only admins can manage vacancies, moderate comments, or read subscriber emails. Never put a Supabase service-role key in browser code or `NEXT_PUBLIC_*` variables.

## Current features

- Mobile-friendly homepage and vacancy search.
- Vacancy detail pages with moderated comments.
- Job-alert email capture and a private subscriber list.
- Admin sign-in, vacancy creation and publishing, comment moderation, and a dashboard.
- Admin circular discovery: checks the official DPSA vacancy-circular listing, shows up to five newest circulars not yet imported with their posting dates, and parses PDFs into a spreadsheet-style table. One **Publish all** action publishes every parsed vacancy in that circular (up to 1,000).
- Sitemap and robots metadata for search engines.

PDF text is extracted in the admin’s browser; files are not stored. Scanned/image-only PDFs need OCR and are not supported. Parsed records store explicit reference, province, employment type, salary, level, source, and structured application/qualification details; unknown employment types stay unset rather than defaulting to permanent. After an admin selects **Publish all**, circular tracking and all published vacancy records are saved together in one Supabase transaction to prevent duplicate imports.

**Email delivery is not configured yet.** The current alert form stores consented email signups, but a mail provider and a sending workflow must be connected before the site can send vacancy notifications. The privacy policy is a draft and must be completed with the site owner’s contact details. Public forms also need rate limiting and bot protection before production.

## Before moving the existing site/domain

The current site uses WordPress URLs and a large sitemap. This project starts with a new database and does not import WordPress posts or preserve existing URL paths automatically. Before pointing the live domain here, import the existing jobs/content, preserve their URL slugs where possible, and set up and test permanent redirects for any paths that change. Otherwise, existing search rankings and backlinks may be lost.

## Validation

Run `npm run lint`, `npm run typecheck`, and `npm run build`.
