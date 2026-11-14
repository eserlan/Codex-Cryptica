---
name: adventure-artwork
description: Generate, convert, upload to R2, validate, and register Solo Adventure Mode artwork (locations, scenes, portraits, atmospheres) in Codex Cryptica. Use when adding adventure illustrations, converting preview/display WebP variants, uploading to codex-cryptica-statics, or updating seedArtwork.
---

# Adventure Artwork Generation & Publishing Skill

Use this skill when creating, converting, uploading, validating, or registering illustrations for Solo Adventure Mode (`packages/adventure-artwork-engine`).

---

## Hard Rules

1. **No Bitmaps in Git**: Never commit `.jpg`, `.png`, or `.webp` files to the repository. Generate and convert inside a temporary/scratch directory and delete all local image files immediately after uploading to R2.
2. **R2-Only Public URLs**: Upload to Cloudflare R2 bucket `codex-cryptica-statics` under `adventure-artwork/<id>-<variant>-<sha12>.webp`, served from:
   `https://assets.codexcryptica.com/adventure-artwork/<id>-<variant>-<sha12>.webp`
   No query strings, fragments, or `%`-encoding.
3. **Immutable & Content-Addressed**: Never overwrite or replace an existing published asset ID's variants. To retire an asset, mark it `withdrawn: true` and add a new ID; keep historical IDs in `packages/adventure-artwork-engine/src/catalogue/released-baseline.json`.
4. **Valid Cues & Unique Genres**: Every cue in `primaryCues`, `settingCues`, `moodCues`, `timeCues`, and `excludes` must be recognized by `isArtworkCue()` in `packages/adventure-artwork-engine/src/cues.ts` (<= 24 total cues per asset, no duplicates across lists, no duplicate `genres`).

---

## Variant Dimensions & Size Budgets

Defined in `packages/adventure-artwork-engine/src/catalogue.ts`:

| Asset Type                        | Variant   | Target Dimensions | Max Dimensions     | Max Size             | MIME         |
| --------------------------------- | --------- | ----------------- | ------------------ | -------------------- | ------------ |
| `location`, `scene`, `atmosphere` | `preview` | `320×180` (16:9)  | `max(w, h) <= 320` | `32 KB` (32,768 B)   | `image/webp` |
| `location`, `scene`, `atmosphere` | `display` | `1280×720` (16:9) | `1280×720`         | `384 KB` (393,216 B) | `image/webp` |
| `npc`                             | `preview` | `240×320` (3:4)   | `max(w, h) <= 320` | `32 KB` (32,768 B)   | `image/webp` |
| `npc`                             | `display` | `768×1024` (3:4)  | `768×1024`         | `256 KB` (262,144 B) | `image/webp` |

---

## Workflow

### Step 1 — Generate the Source Illustration

Use `codex exec --skip-git-repo-check -C <scratch-dir> -s workspace-write` (OpenAI `gpt-image-1` house style, matching `merchant-01`/`worker-01`) or the `image-generator` subagent as fallback, saving into a scratch folder outside tracked repo paths and deleting before commit:

- **Aspect ratio**: `16:9` for `location` / `scene` / `atmosphere`; `3:4` for `portrait` (`npc`).
- **Exact Codex Prompt Format** (keep the subject concise, ~10–18 words, and include a **4–6 word pose/action cue** on portraits so subjects don't all default to the same arms-crossed/chin-up stance):
  - **Portraits (`npc`)**:
    `Painterly tabletop RPG character illustration, vertical 3:4 portrait, expressive bust or half-body: <concise subject + pose/action + setting>. Atmospheric lighting, cohesive fantasy palette. No text, watermarks, borders or UI.`
  - **Environments (`location` / `scene` / `atmosphere`)**:
    `Painterly tabletop RPG environment illustration, wide 16:9 scene: <concise setting + mood/time>. Atmospheric lighting, cohesive fantasy palette. No text, watermarks, borders or UI.`
- **Quota handling**: If `gemini-3.1-flash-image` returns `429 RESOURCE_EXHAUSTED`, record which IDs succeeded vs remain and stop retrying generation until the quota window resets.

### Step 2 — Encode `display` & `preview` WebP Variants and Hash

Convert the generated image into both `display` and `preview` WebP files, verify dimensions and byte budgets, and compute each file's `sha256` and `bytes`.

Name each file with the first 12 hex chars of its SHA-256 digest:

- `<id>-preview-<sha12>.webp`
- `<id>-display-<sha12>.webp`

Example with `ffmpeg`:

```bash
# Landscape (16:9)
ffmpeg -y -i "$SRC" -vf "scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720" -c:v libwebp -quality 82 "$OUT/display.webp"
ffmpeg -y -i "$SRC" -vf "scale=320:180:force_original_aspect_ratio=increase,crop=320:180" -c:v libwebp -quality 78 "$OUT/preview.webp"
```

### Step 3 — Upload Both Variants to Cloudflare R2

Always unset `CF_API_TOKEN` and `CLOUDFLARE_API_TOKEN` so `wrangler` uses OAuth login rather than a stale shell token:

```bash
env -u CF_API_TOKEN -u CLOUDFLARE_API_TOKEN bunx wrangler r2 object put \
  "codex-cryptica-statics/adventure-artwork/<id>-preview-<sha12>.webp" \
  --file "$OUT/<id>-preview-<sha12>.webp" \
  --remote \
  --content-type image/webp \
  --cache-control "public, max-age=31536000, immutable"

env -u CF_API_TOKEN -u CLOUDFLARE_API_TOKEN bunx wrangler r2 object put \
  "codex-cryptica-statics/adventure-artwork/<id>-display-<sha12>.webp" \
  --file "$OUT/<id>-display-<sha12>.webp" \
  --remote \
  --content-type image/webp \
  --cache-control "public, max-age=31536000, immutable"
```

### Step 4 — Clean Up Local Files Immediately

Delete all temporary/scratch `.jpg`, `.png`, and `.webp` files and verify `git status -s` shows zero image files.

### Step 5 — Register in the Catalogue

Add the `ArtworkAsset` record to `packages/adventure-artwork-engine/src/catalogue/seed.ts` with:

- `id`, `version: 1`, `type`, `genres`, `primaryCues`, `settingCues`, `moodCues`, `timeCues`, `excludes`, `alt`
- `variants.preview` and `variants.display` (`url`, `mime: "image/webp"`, `width`, `height`, `bytes`, `sha256`)
- `origin: "team-generated-ai"`, `provenance` (`tool`, `model`, `generatedAt`, `prompt`, `creator`, `distributionBasis`, `referencePermissions`, `attribution`), and `review` (`status: "approved"`, `reviewer`, `date`, `notes`)

If adding to an offline pack, update `packages/adventure-artwork-engine/src/collections.ts` as well.

### Step 6 — Validate

1. Run engine and validator tests:
   ```bash
   bun run --filter @codex/adventure-artwork-engine test
   bun test scripts/validate-adventure-artwork.test.ts
   ```
2. Verify live R2 bytes/hashes/dimensions using `scripts/validate-adventure-artwork.mjs` (`verifyArtworkVariants` + `openArtworkDecoder`).
3. Confirm the asset appears in the Asset Ledger at `https://assets.codexcryptica.com/gallery` under **Adventure Artwork** (note: `oracle-proxy` caches `/gallery` for 5 minutes).
