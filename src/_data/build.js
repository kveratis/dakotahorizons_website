// Cache-busting version for CSS and JS URLs. Cloudflare Pages sets
// CF_PAGES_COMMIT_SHA during builds; local builds fall back to a timestamp.
export default {
  version: (process.env.CF_PAGES_COMMIT_SHA || Date.now().toString(36)).slice(0, 8)
};
