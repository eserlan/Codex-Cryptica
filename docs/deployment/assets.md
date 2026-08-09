# Where images live

Two homes, and the rule for choosing between them was undocumented until now.
It existed only in `docs/archive/CLOUDFLARE_MIGRATION_PLAN.md`, which is an
archived migration plan rather than current guidance, so the repo drifted into
holding both patterns and new assets landed wherever the neighbouring file did.

## R2, at `assets.codexcryptica.com`

**Bucket:** `codex-cryptica-statics`. Keys mirror the URL path.

Put an image here when it **changes independently of the code**, or when it
benefits from format negotiation:

- product screenshots (`screenshots/*`)
- blog imagery (`images/blog/*`)
- demo vault portraits (`vault-samples/images/*`)

Two reasons, both concrete:

1. **Screenshots are recaptured every time the interface changes.** Committed to
   the repo, each revision stays in git history forever. The five feature
   captures were 594KB; a year of redesigns turns that into megabytes nobody can
   remove without rewriting history.
2. **Cloudflare Images negotiates the format.** Requested through the transform
   prefix, a 1600px JPEG serves as AVIF to browsers that accept it. Measured on
   the current set: 136KB becomes 85KB, and 92KB becomes 31KB.

### Referencing

For `<img>` in the app, go through the transform so the CDN picks the format:

```
https://assets.codexcryptica.com/cdn-cgi/image/format=auto,quality=80/screenshots/feature-connect.jpg
```

For `og:image` and `twitter:image`, link the **plain** object instead:

```
https://assets.codexcryptica.com/screenshots/feature-connect.jpg
```

Social scrapers do not send `Accept` headers the way browsers do, so a
transformed URL can hand them AVIF and break the preview. This distinction is
easy to miss and produces a bug nobody sees until a link is shared.

### Uploading

```sh
bunx wrangler r2 object put \
  codex-cryptica-statics/screenshots/feature-connect.jpg \
  --file=path/to/feature-connect.jpg \
  --content-type=image/jpeg \
  --remote
```

`--remote` is required. Without it wrangler writes to the local simulator and
reports success, and the object never reaches the bucket.

Verify both forms before referencing anything:

```sh
curl -sI https://assets.codexcryptica.com/screenshots/<key>.jpg | head -1
curl -s -o /dev/null -w '%{content_type} %{size_download}\n' -H 'Accept: image/avif,*/*' \
  https://assets.codexcryptica.com/cdn-cgi/image/format=auto,quality=80/screenshots/<key>.jpg
```

## `apps/web/static/`, served from the site origin

Keep an image here when it is **part of the application shell** and has to be
available without a network hop to another host:

- `favicon.png`, `logo.png`, `og-image.png`
- theme textures under `static/themes/`

These change rarely, are small, and are wanted at the same origin.

`static/screenshots/living-lore-graph.png` predates this rule. It is referenced
only from schema.org JSON-LD in `lib/config/index.ts` and is not rendered on any
page. It should move to R2 whenever that is next touched.

## Capturing screenshots

The five feature captures were taken with a throwaway Playwright script against
the cyberpunk demo vault. Three conditions mattered, all learned the hard way:

- **Dark appearance.** The theme resolves by the app's appearance setting, so
  the cyberpunk demo renders as the pale `cyberpunk_light` ("Vapor Dawn") unless
  the browser reports a dark colour scheme. Neon Night only appears in dark.
- **Re-solve the layout before shooting.** The load-time solve runs against a
  partially synced graph and leaves nodes scattered; fitting that lands at 0.30x
  with nodes as dots and no labels. Calling `graph.requestLayout()`, waiting for
  it to settle, then fitting, lands at 0.48x with the web legible.
- **Enough entities to be worth photographing.** A seven-entity vault cannot
  show density. The cyberpunk demo carries 35 entities and 55 connections for
  this reason.

Resize to 1600px and compress before uploading; the CDN handles format, not
dimensions.
