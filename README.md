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

### One-time Cloudflare setup

Run these from this folder after `npm install` and `npx wrangler login`.

1. **Email Routing.** In the Cloudflare dashboard for dakotahorizons.com, enable Email Routing and add `service@dakotahorizons.com` as a verified destination address. Sending through the `send_email` binding only works to verified destinations.
2. **D1 database.**
   ```bash
   npx wrangler d1 create dakota-horizons-leads
   ```
   Copy the printed `database_id` into `wrangler.toml`, then apply the table:
   ```bash
   npm run db:migrate:remote
   ```
3. **Queues.**
   ```bash
   npx wrangler queues create dakota-horizons-form-emails
   npx wrangler queues create dakota-horizons-form-emails-dlq
   ```
4. **Email Worker.**
   ```bash
   npm run worker:email:deploy
   ```
5. **Turnstile.** In the dashboard, create a Turnstile widget for dakotahorizons.com. Put the site key in `src/_data/site.json` (`turnstileSiteKey`; the current value is Cloudflare's always-pass test key) and add the secret key to the Pages project:
   ```bash
   npx wrangler pages secret put TURNSTILE_SECRET_KEY --project-name dakota-horizons
   ```
6. **Deploy the site** with `npm run pages:deploy`, or connect the repository in the dashboard (build command `npm run build`, output directory `_site`). The D1 and queue bindings come from `wrangler.toml`.

### Local testing

Create a `.dev.vars` file (already ignored by git) with Cloudflare's always-pass test secret:

```
TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA
```

Then run `npm run db:migrate:local` once and `npm run pages:dev`. Submissions are saved to the local D1 database; emails are only sent once deployed.

Run the unit tests with `npm test`.

### Reading saved leads

```bash
npx wrangler d1 execute dakota-horizons-leads --remote --command "SELECT id, created_at, name, email, interest FROM contact_submissions ORDER BY id DESC LIMIT 20"
```
