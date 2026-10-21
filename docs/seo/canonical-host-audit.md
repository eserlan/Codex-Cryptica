# Canonical hostname audit (issue #4303)

## Canonical policy

The preferred public host is **`https://codexcryptica.com`** (without `www`).
Public sitemaps, canonical tags, Open Graph URLs and internal navigation should
refer to this host consistently. A Google Search Console impression for a
`www` URL does **not** prove that both versions are currently indexable; it
might be an old URL in a reporting window.

This repository controls the page metadata and Cloudflare Pages path redirects.
**Host-level redirects depend on Cloudflare DNS/custom-domain/Redirect Rules
configuration and cannot be verified by reviewing the Git files alone.**

## Run the production check

From a machine with access to public DNS and HTTPS:

```bash
node scripts/check-canonical-host.mjs
```

The read-only script checks representative home, Answer, generator, tools and
`/for` routes, including nested paths. It verifies:

- Non-`www` responses are HTTP 200, and canonical/OG URLs use the apex domain.
- HTTP and HTTPS-`www` visits redirect permanently (301 or 308) and retain
  the original path and query string.
- `sitemap.xml` and `robots.txt` consistently advertise the apex host.
- Public pages do not return `X-Robots-Tag: noindex`.

If it fails because of DNS or a Cloudflare challenge, **report that separately**
from a confirmed redirect defect. Run with a browser/curl as a second check;
the script does not edit any Cloudflare settings.

## Cloudflare follow-up if a problem is confirmed

1. Check that both `codexcryptica.com` and `www.codexcryptica.com` are
   configured and can receive HTTP(S) requests.
2. Use a Cloudflare zone-level **Redirect Rule** to permanently send
   `www.codexcryptica.com` to `https://codexcryptica.com`, preserving
   path and query string; enable always-HTTPS as appropriate.
3. Do not try to implement a hostname rule in Pages `_redirects`: that
   file is primarily for path mapping.
4. Re-run the probe for both direct visits and indexed deep links. Check the
   final response, not just the first redirect.

## Search Console verification

- Inspect a sample of both host variants, particularly those from the
  2026-10-21 export, using **URL Inspection**. Record Google's selected
  canonical and the indexed status.
- Recheck the same URLs after a confirmed redirect change. Search Console
  reporting can retain historic impressions even after consolidation.
- Do not mark #4303 complete from metadata and sitemap checks alone.
  Live redirect verification and Search Console canonical selection remain
  required before closing the issue.
