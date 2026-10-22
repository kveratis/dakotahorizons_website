# Dakota Horizons website

The marketing site for Dakota Horizons, built with [Eleventy](https://www.11ty.dev/) 3 and hosted on Cloudflare Pages.

## Run it locally

Requires Node.js 18 or newer (22 recommended).

```bash
npm install
npm start        # dev server at http://localhost:8080 with live reload
npm run build    # production build into _site/
```

## Project layout

```
src/
  _data/site.json          Site name, URL, email and navigation
  _includes/layouts/       Page layout (base.njk)
  _includes/partials/      Header, footer and call-to-action band
  assets/css/tokens.css    Design tokens from the Dakota Horizons design system
  assets/css/main.css      Site styles
  assets/fonts/            Plus Jakarta Sans (SIL Open Font License)
  assets/img/              Logo files
  index.njk                Home
  services.njk             Services
  about.njk                About
  contact.njk              Contact form
  thanks.njk               Shown after the contact form is sent
  404.njk                  Not found page
  _headers                 Cloudflare Pages security and cache headers
functions/api/contact.js   Pages Function for the contact form (Turnstile, D1, queue)
functions/_lib/            Shared validation, queue and response helpers
workers/form-email-consumer/  Worker that sends queued form emails
migrations/                D1 database schema
tests/                     Unit tests (npm test)
wrangler.toml              Pages bindings for D1 and the email queue
```

To change the email address or menu, edit `src/_data/site.json`. Colors, spacing and corner sizes live in `src/assets/css/tokens.css` and should match the design system.

## Deploy to Cloudflare Pages

1. Push this folder to a GitHub or GitLab repository.
2. In Cloudflare, go to **Workers & Pages > Create > Pages > Connect to Git** and choose the repository.
3. Build settings:
   - Framework preset: **None**
   - Build command: `npm run build`
   - Build output directory: `_site`
   - Environment variable: `NODE_VERSION` = `22`
4. Add your custom domain (dakotahorizons.com) under the project's **Custom domains** tab.

Cloudflare picks up the `functions/` folder automatically, so the contact form endpoint deploys with the site. Complete the contact form setup below before the first deploy.

## Contact form setup

The contact form follows the same pattern as the Soul Detailers site:

1. The form posts to `/api/contact` (`functions/api/contact.js`) using htmx, and falls back to a normal form post without JavaScript.
2. The function checks Cloudflare Turnstile, validates the fields and saves the submission to the D1 database `dakota-horizons-leads`, so a lead is never lost.
3. It then puts an email job on the queue `dakota-horizons-form-emails`.
4. The `workers/form-email-consumer` Worker reads the queue and sends the email to **service@dakotahorizons.com** from `noreply@dakotahorizons.com`, with Reply-To set to the visitor. Failed sends retry 5 times, then move to `dakota-horizons-form-emails-dlq`.

A separate Worker is needed because Pages Functions cannot use the `send_email` binding.

Email goes out through **Cloudflare Email Sending**, the same as Soul Detailers. It does not use Email Routing, so incoming mail for dakotahorizons.com still goes to our own mail server. Sending only needs the records Cloudflare manages on the `cf-bounce` subdomain (`cf-bounce` MX and SPF, and `cf-bounce._domainkey` DKIM).

### Cloudflare resources

| Resource | Name | Notes |
| --- | --- | --- |
| Email Sending domain | dakotahorizons.com | Enabled and configured |
| D1 database | `dakota-horizons-leads` | Id in `wrangler.toml`; migration `0001` applied |
| Queue | `dakota-horizons-form-emails` | Producer: Pages Function. Consumer: email Worker |
| Dead letter queue | `dakota-horizons-form-emails-dlq` | Messages that failed 5 sends |
| Turnstile widget | `DakotaHorizonsForms` | Site key in `src/_data/site.json`; secret is the Pages secret `TURNSTILE_SECRET_KEY` |
| Pages project | `dakota-horizons` | GitHub `kveratis/dakotahorizons_website`, branch `main`, build `npm run build`, output `_site` |
| Worker | `dakota-horizons-form-email-consumer` | Deploy with `npm run worker:email:deploy` |

### Recreating the setup

If these ever need to be rebuilt (for example in another account), after `npm install` and `npx wrangler login`:

```bash
npx wrangler d1 create dakota-horizons-leads      # put the new id in wrangler.toml
npm run db:migrate:remote
npx wrangler queues create dakota-horizons-form-emails
npx wrangler queues create dakota-horizons-form-emails-dlq
npm run worker:email:deploy
npx wrangler pages secret put TURNSTILE_SECRET_KEY --project-name dakota-horizons
```

Add the domain under **Email Service > Email Sending** in the dashboard, and create a Turnstile widget for the site's hostnames.

### Local testing

Create a `.dev.vars` file (already ignored by git) with Cloudflare's always-pass test secret:

```
TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA
```

Then run `npm run db:migrate:local` once and `npm run pages:dev`. Submissions are saved to the local D1 database; emails are only sent once deployed. The local Turnstile widget needs Cloudflare's always-pass test site key (`1x00000000000000000000AA`) in `site.json` if `localhost` verification gives you trouble.

Run the unit tests with `npm test`.

### Reading saved leads

```bash
npx wrangler d1 execute dakota-horizons-leads --remote --command "SELECT id, created_at, name, email, interest FROM contact_submissions ORDER BY id DESC LIMIT 20"
```
