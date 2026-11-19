
# DPSA Government Jobs

The public website is being moved from Vercel and Supabase to a static export on
Cloudflare Pages. Published vacancy source files live in `content/jobs/`; the
GitHub Actions workflow builds HTML into `generated-site/`. Cloudflare Pages
Functions and D1 provide the API and private data storage. The admin interface
is the unpacked Chrome extension in `extension/`.

The migration is not complete until the Cloudflare project, secrets, database,
GitHub workflow, and domain have been configured and tested. No external
deployment or DNS changes are made by this repository.

## One-time data export from Supabase

Keep the current website and Supabase project available until the replacement
has been verified.

1. Back up the current Supabase database.
2. Put the existing Supabase URL and publishable key in `.env.local` as
   `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
3. Run `npm run export:public-jobs`. It writes published vacancies as JSON under
   `content/jobs/` and removes stale JSON exports. Review the resulting slugs
   and content before committing them.
4. To migrate drafts, comments, and subscriber records, also set
   `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` and run
   `npm run export:supabase-private-data`. This writes personal data to the
   ignored `migration-private/cloudflare-data.sql`; never commit or share it.
5. After verifying the migration, remove the local private SQL file and revoke
   the Supabase service-role key. The Supabase package is retained only for
   these one-time export scripts; the deployed site does not use Supabase.

Do not commit `.env.local`, migration SQL, or any secret. The public vacancy
JSON files are intended to be committed as the site's source content.

### Starting with new vacancy data

The Supabase egress limit is currently preventing data export. To start fresh,
skip the Supabase export and do not enter a service-role key. Leave
`content/jobs/` empty until the extension is connected to the Cloudflare Pages
preview. The site can build without listings; the extension will parse new
circular PDFs, let you review the vacancies, and publish selected records to
GitHub.

## Cloudflare setup

1. Create a Cloudflare D1 database named `dpsa-government-jobs` and copy its ID
   into `wrangler.toml` in place of `REPLACE_WITH_CLOUDFLARE_D1_DATABASE_ID`.
2. Apply the schema with `npm run cf:db:migrate:remote`.
3. If private Supabase data was exported, import it with
   `npm run cf:db:import-private`.
4. Create a Cloudflare Pages project connected to this repository. Set the
   production branch to `main`, leave the build command empty, and set the
   output directory to `generated-site`. Pages Functions must be enabled for
   the project, with a D1 binding named `DB` pointing to the database above.
5. Add these production environment variables/secrets to the Pages project:
   - `SITE_ORIGIN`: `https://www.dpsagovernmentjobs.co.za`
   - `GITHUB_REPOSITORY`: `masasecomm/DsGjo`
   - `GITHUB_BRANCH`: the branch Cloudflare Pages builds (normally `main`)
   - `ADMIN_SECRET`: a long, unique secret used by the extension
   - `GITHUB_TOKEN`: a fine-grained token with repository Contents read/write
     permission; it is used by the Pages Function, never embedded in the
     extension
   - Add `NEXT_PUBLIC_TURNSTILE_SITE_KEY` as a GitHub Actions repository
     variable (the workflow builds the static site) and
     `TURNSTILE_SECRET_KEY` as a Pages Function secret. Set
     `TURNSTILE_HOSTNAME` to `www.dpsagovernmentjobs.co.za`.
   - `GOOGLE_INDEXING_SERVICE_ACCOUNT_JSON` only if Google Indexing is needed
6. Enable the GitHub Actions workflow permission to write repository contents.
   The workflow runs on pushes to `main`, builds the export, and commits the
   resulting HTML and assets to `generated-site/`.
7. Build the extension with `npm run extension:build`. In Chrome, open
   `chrome://extensions`, enable Developer mode, select **Load unpacked**, and
   choose the repository's `extension/` folder. Enter the Cloudflare Pages
   preview address and `ADMIN_SECRET` when prompted by the extension. The
   extension accepts the website domain and Cloudflare Pages preview addresses.

Do not place `GITHUB_TOKEN`, `ADMIN_SECRET`, the Turnstile secret, or Google
service-account credentials in GitHub source files or the extension.

## Verify before switching the domain

Use the Cloudflare Pages preview URL first. Connect the extension to that
preview, parse a circular, review the extracted vacancies, and publish a
vacancy. Confirm it creates a JSON source file in GitHub and that the next
workflow run updates the static site. Then check the homepage, vacancy and
circular URLs, search filters, pagination, sitemap, robots file, comments,
subscriber form, and admin moderation.

Keep the current Vercel deployment and DNS configuration available for
rollback. Only switch DNS after the preview and production checks pass; remove
Vercel and Supabase after the new site is verified.

## Local checks

```sh
npm ci
npm run typecheck
npm run lint
npm run build
npm run extension:build
```
