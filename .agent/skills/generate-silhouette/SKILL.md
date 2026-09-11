---
name: generate-silhouette
description: Design, generate, vectorize, validate, register, and deploy theme-reactive vector silhouettes in Codex Cryptica. Use when creating new silhouettes, expanding genre silhouette coverage, vectorizing raster images with potrace, or deploying SVG token art to Cloudflare R2.
---

# Vector Silhouette Generation & Deployment Skill

Use this skill when adding, generating, vectorizing, testing, or publishing vector silhouettes for Codex Cryptica.

Silhouettes provide zero-latency, theme-reactive visuals across:

1. **Entity Detail Header**: Hero avatar display (`SilhouetteAvatar.svelte`).
2. **Cytoscape Graph Nodes**: Background images for entities without custom photos (`ImageManager.ts`).
3. **Silhouette Picker Modal**: User customization modal (`SilhouettePickerModal.svelte`).
4. **Public Silhouette Gallery**: Standalone creator utility at `/silhouettes`.

---

## Absolute Rule: Bespoke Art Only (Never Use External Icon Packs)

**NEVER use external icon packs, game-icons, or generic symbol libraries (such as `@iconify-json/game-icons` or Lucide) for silhouettes.**

All silhouettes in Codex Cryptica MUST be custom, bespoke studio drawings generated via AI and vectorized with `potrace`. Mixing flat UI icons into the silhouette catalog degrades visual quality and breaks stylistic coherence. If image generation is temporarily rate-limited, wait for the quota window to reset — never fall back to third-party icon packs.

---

## The Rule of No Inlined SVGs in Git

1. **Metadata Only in Schema**: `packages/schema/src/silhouettes.ts` holds metadata only (id, name, category, genres, archetype, tags, r2Path). **Never inline raw SVG paths directly in `silhouettes.ts`** or commit image/SVG files to the repo.
2. **Cloudflare R2 Storage**: All SVG assets belong in Cloudflare R2 (`codex-cryptica-statics` bucket) served via `https://assets.codexcryptica.com/silhouettes/<id>.svg`.
3. **Local Cleanup**: All temporary raster images (`.jpg`, `.png`) and intermediate `.svg` files must reside only in temporary/scratch folders and must be deleted after upload.

---

## Workflow Steps

### Step 1 — AI Silhouette Generation (Gemini / Imagen)

Every silhouette in Codex Cryptica is a bespoke, custom-generated studio drawing designed for clean vectorization and visual consistency across the app.

#### The Prompt Formula:

```text
Pure solid black silhouette of a [SUBJECT] on a pure seamless solid white background.
[VIEW ANGLE, e.g. "Profile 3/4 bust view," "Frontal architectural view," "Wide perspective view"].
[DISTINCTIVE SILHOUETTE FEATURES, e.g. gear, weapons, clothing folds, rooflines, chimneys, banners].
High contrast, sharp clean silhouette edges, studio minimalist graphic, pure monochrome black and white, zero gradients, zero shadows.
```

#### Key Rules for Prompts:

1. **Always specify "pure seamless solid white background"**: Eliminates stray background noise and textures that would ruin vector tracing.
2. **Always specify "zero gradients, zero shadows"**: Ensures binary black-and-white pixel boundaries for potrace.
3. **Emphasize outer contours and negative space**: Intricate details like braids, staff crystals, antennas, thruster ports, and canopy lines create crisp vector outlines.
4. **Safety & Filter Awareness**: Avoid words like "hunter", "mercenary", "weapon", "gun", "pistol" if an API filter triggers; substitute with role/equipment descriptors like "galactic tracker", "armored scout", "energy staff", "flight vest".

---

### Step 2 — Vectorization with Potrace

Trace raster images using `potrace`:

```ts
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const potrace = require("potrace");

function traceRaster(imagePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    potrace.trace(imagePath, { threshold: 128, optCurve: true }, (err, svg) => {
      if (err) return reject(err);
      resolve(svg.trim());
    });
  });
}
```

---

### Step 3 — SVG Cleaning & Color Hygiene (`fill="currentColor"`)

An SVG loaded on a `<canvas>` as a data URI for Cytoscape must meet strict rules:

1. **No hardcoded black fills**: Replace `fill="black"` or `fill="#000000"` with `fill="currentColor"`.
2. **Root SVG has fill and dimensions**: Must have `fill="currentColor"` and explicit `width` & `height` matching the `viewBox`.
3. **Exactly one `fill` per element**: Remove duplicate `fill` attributes so the XML is strictly well-formed.

Cleaning pipeline:

```ts
let cleanSvg = svg.trim();

// 1. Remove hardcoded black fills
cleanSvg = cleanSvg.replace(
  /fill="(black|#000|#000000)"/g,
  'fill="currentColor"',
);

// 2. Ensure root svg has fill="currentColor"
if (!cleanSvg.includes('fill="currentColor"')) {
  cleanSvg = cleanSvg.replace("<svg", '<svg fill="currentColor"');
}

// 3. Ensure path elements have fill="currentColor"
cleanSvg = cleanSvg.replace(/<path(?!\s+fill)/g, '<path fill="currentColor"');

// 4. Keep exactly one fill per element (no duplicate attributes)
cleanSvg = cleanSvg.replace(/<[a-z]+\b[^>]*>/g, (tag) => {
  let seen = false;
  return tag.replace(/\s+fill="[^"]*"/g, (attr) => {
    if (seen) return "";
    seen = true;
    return attr;
  });
});

// 5. Explicit width and height from viewBox
cleanSvg = cleanSvg.replace(/^<svg\b([^>]*?)\s*>/, (tag, attrs) => {
  const viewBox = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(attrs);
  if (!viewBox) return tag;
  const missing = [
    /\bwidth=/.test(attrs) ? "" : ` width="${viewBox[1]}"`,
    /\bheight=/.test(attrs) ? "" : ` height="${viewBox[2]}"`,
  ].join("");
  return missing ? `<svg${missing}${attrs}>` : tag;
});
```

---

### Step 4 — Register in Schema (`packages/schema/src/silhouettes.ts`)

Add entry to `SILHOUETTES`:

```ts
{
  id: "scifi-captain-commander",
  name: "Starship Captain / Commander",
  category: "character",
  genres: ["scifi"],
  archetype: "noble",
  gender: "neutral",
  tags: ["captain", "commander", "officer", "fleet", "admiral", "starship", "bridge"],
  r2Path: "silhouettes/character/scifi/captain-commander.svg",
}
```

Constraints:

- **`category`**: `"character"` | `"creature"` | `"location"` | `"item"` | `"faction"` | `"event"` | `"note"`
- **`genres`**: Array of `"fantasy"` | `"gothic"` | `"scifi"` | `"cyberpunk"` | `"western"` | `"modern"` | `"cosmic-horror"` | `"steampunk"`
- **`archetype`**: `"warrior"` | `"caster"` | `"rogue"` | `"scientist"` | `"noble"` | `"inquisitor"` | `"outlaw"` | `"pilot"` | `"hacker"` | `"beast"` | `"dragon"` | `"horror"` | `"construct"` | `"relic"` | `"structure"` | `"insignia"` | `"generic"`
- **`tags`**: Rich keyword list matching entity titles, labels, or content for heuristic matching.

---

### Step 5 — Upload to Cloudflare R2

Write the clean SVGs to a temporary working directory (e.g. `./scratch_silhouettes/<id>.svg`), then run:

```bash
bun scripts/upload-silhouettes.mjs ./scratch_silhouettes --dry-run
bun scripts/upload-silhouettes.mjs ./scratch_silhouettes
```

The script validates XML well-formedness and uploads to both:

- `silhouettes/<category>/<genre>/<name>.svg` (canonical `r2Path`)
- `silhouettes/<id>.svg` (flat alias)

Delete the temporary scratch directory immediately afterwards.

---

### Step 6 — Verification & Quality Gates

1. Run schema unit tests:
   ```bash
   bun test packages/schema/src/silhouettes.test.ts
   ```
2. Verify type checks and lints:
   ```bash
   bun run lint:types
   bun run lint
   ```
3. Verify public CDN resolution:
   ```bash
   curl -sI "https://assets.codexcryptica.com/silhouettes/<id>.svg?v=$(date +%s)" | head -n 1
   ```

---

### Step 7 — Update R2 Asset Database (`docs/deployment/r2-asset-db.md`)

Record the newly deployed assets in [`docs/deployment/r2-asset-db.md`](file:///home/espen/Projects/remotecc/docs/deployment/r2-asset-db.md) under the `## silhouettes/` table with their key, approximate size, and archetype / purpose description.
