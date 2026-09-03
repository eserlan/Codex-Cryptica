# Codex Cryptica Silhouette Pipeline Guide

This guide documents the end-to-end workflow for designing, generating, vectorizing, registering, and deploying vector silhouettes in Codex Cryptica.

Silhouettes provide thematic, lightweight, zero-latency visuals for entities across:

1. **Entity Detail Header**: Full-size avatar presentation (`SilhouetteAvatar.svelte`).
2. **Cytoscape Relationship Graph**: Live node backgrounds when entities don't have custom portrait photos uploaded (`ImageManager.ts`).
3. **Silhouette Picker Modal**: User customization modal allowing players and GMs to override the default heuristic (`SilhouettePickerModal.svelte`).

---

## 1. Why Vector Silhouettes?

- **Zero API Cost & Instant Load**: Embedded directly into the client schema or fetched from CDN with no external AI calls at runtime.
- **Theme-Reactive Accent Coloring**: SVGs use `fill="currentColor"`. In the UI and Cytoscape graph, they dynamically inherit the active world theme's primary accent (e.g. Amber Gold, Cyberpunk Cyan, Blood Crimson, Amethyst Purple).
- **Scalable & Crisp**: Looks sharp at 32px inside graph nodes as well as 320px in the hero detail panel.
- **Local-First & Offline**: Stored directly in `packages/schema/src/silhouettes.ts` for instantaneous offline usage, while mirrored to Cloudflare R2 for CDN hosting.

---

## 2. Architecture Overview

| Component                     | Path                                                           | Responsibility                                                                                                     |
| ----------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Registry & Heuristics**     | `packages/schema/src/silhouettes.ts`                           | Canonical list of silhouettes, Zod schema definitions, token-based heuristic scoring, and SVG Data URI conversion. |
| **Avatar Component**          | `apps/web/src/lib/components/ui/SilhouetteAvatar.svelte`       | Reactive Svelte 5 component with sizes (`xs` through `4xl`), radial gradients, and hover states.                   |
| **Entity Detail Integration** | `apps/web/src/lib/components/entity-detail/DetailImage.svelte` | Renders the hero silhouette when `entity.image` is absent, and opens the picker modal on click.                    |
| **Graph Image Manager**       | `packages/graph-engine/src/sync/ImageManager.ts`               | Resolves silhouette data URIs for graph nodes without images and sets `isSilhouette` data.                         |
| **Graph Style Engine**        | `packages/graph-engine/src/transformer.ts`                     | Configures `node[isSilhouette]` with `contain`, 72% dimensions, and theme-accent borders.                          |
| **R2 Upload Script**          | `scripts/upload-silhouettes.mjs`                               | Batch uploads all SVGs to Cloudflare R2 (`codex-cryptica-statics/silhouettes/...`).                                |

---

## 3. The Creation Pipeline (Step-by-Step)

### Step 1: AI Generation (The Prompt Formula)

We generate high-contrast monochrome studio drawings using Gemini / Imagen.

#### Prompt Template:

```text
Pure solid black silhouette of a [SUBJECT] on a pure seamless solid white background.
[VIEW ANGLE, e.g. "Profile 3/4 bust view," "Frontal architectural view," "Wide perspective view"].
[DISTINCTIVE SILHOUETTE FEATURES, e.g. gear, weapons, clothing folds, rooflines, chimneys, banners].
High contrast, sharp clean silhouette edges, studio minimalist graphic, pure monochrome black and white, zero gradients, zero shadows.
```

#### Key Rules for Prompts:

1. **Always specify "pure seamless solid white background"**: Eliminates stray background noise and textures that would ruin vector tracing.
2. **Always specify "zero gradients, zero shadows"**: Ensures clear, binary black-and-white pixel boundaries.
3. **Emphasize outer contours and negative space**: Intricate details like braids, staff crystals, gargoyles, smoke plumes, or hanging signs create stunning vector outlines.

---

### Step 2: Vectorization with Potrace

We use `potrace` to trace the raster image into smooth bezier vector curves.

```ts
import potrace from "potrace";

function traceRasterToSvg(imagePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    potrace.trace(imagePath, { threshold: 128, optCurve: true }, (err, svg) => {
      if (err) return reject(err);
      resolve(svg.trim());
    });
  });
}
```

- `threshold: 128`: Clean half-way cutoff between black illustration and white backdrop.
- `optCurve: true`: Merges redundant line segments into smooth Bézier splines.

---

### Step 3: Color Hygiene & Cleaning (`fill="currentColor"`)

> **The Trailing `fill="black"` Gotcha**:
> Potrace automatically appends `stroke="none" fill="black"` at the very end of the `<path>` attribute list. If left in place, `fill="black"` overrides any parent `<svg fill="currentColor">`, causing the silhouette to render solid black. On dark node backgrounds (such as Cytoscape's dark surface `#1c1917`), a black silhouette becomes completely invisible!

#### Mandatory Cleaning Regex:

```ts
let cleanSvg = svg.trim();

// 1. Remove all hardcoded black fills
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

// 4. Keep exactly one fill per element. Step 1 rewrites potrace's trailing
//    fill="black", and step 3 prepends one of its own, so a traced path ends
//    up carrying two — see the well-formedness rule below.
cleanSvg = cleanSvg.replace(/<[a-z]+\b[^>]*>/g, (tag) => {
  let seen = false;
  return tag.replace(/\s+fill="[^"]*"/g, (attr) => {
    if (seen) return "";
    seen = true;
    return attr;
  });
});

// 5. Give the root an intrinsic size taken from its viewBox. Each attribute is
//    checked on its own — injecting a width beside an existing one would
//    recreate exactly the duplicate-attribute failure step 4 just cleaned up.
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

#### The two rules a graph node will not forgive

A silhouette is painted on a `<canvas>` as an SVG data URI, which is stricter
than the DOM in two ways. Both failures are silent — no console error, just a
wrong-looking node — and both are covered by tests in
`packages/schema/src/silhouettes.test.ts`.

1. **It must be well-formed XML.** The HTML parser drops a repeated attribute
   and carries on; an SVG loaded as an image refuses to decode, and the node
   renders as a flat block of colour with no glyph. A duplicated `fill` (step 4
   above) is the way this happens in practice.
2. **It must declare `width` and `height`.** Cytoscape samples the image with a
   source rectangle taken from its intrinsic size. Without those attributes the
   browser reports a default box that does not match the rasterisation, so a
   corner of the artwork is sampled and stretched across the node — the glyph
   looks cropped and off-centre. Match them to the `viewBox` (step 5).

---

### Step 4: Register in Schema

Add the new definition to `SILHOUETTES` in `packages/schema/src/silhouettes.ts`:

```ts
{
  id: "location-fantasy-village",
  name: "Fantasy Village",
  category: "location",
  genres: ["fantasy"],
  archetype: "structure",
  gender: "neutral",
  tags: ["village", "hamlet", "cottage", "settlement", "rural", "countryside", "farm", "mill"],
  r2Path: "silhouettes/location/fantasy/village.svg",
  svgContent: `<svg viewBox="0 0 ... fill="currentColor" xmlns="http://www.w3.org/2000/svg">...</svg>`,
}
```

#### Taxonomy Constraints:

- **`category`**: `"character"` | `"creature"` | `"location"` | `"item"` | `"faction"` | `"event"` | `"note"`
- **`genres`**: Array of `"fantasy"` | `"gothic"` | `"scifi"` | `"cyberpunk"` | `"western"` | `"modern"` | `"cosmic-horror"` | `"steampunk"`
- **`archetype`**: `"warrior"` | `"caster"` | `"rogue"` | `"scientist"` | `"noble"` | `"inquisitor"` | `"outlaw"` | `"pilot"` | `"hacker"` | `"beast"` | `"dragon"` | `"horror"` | `"construct"` | `"relic"` | `"structure"` | `"insignia"` | `"generic"`
- **`tags`**: Rich keyword list matching entity titles, kinds, labels, or content for automatic inference.

---

### Step 5: Heuristic Inference Validation

The heuristic engine `resolveEntitySilhouette()` scores candidates based on:

1. **Explicit Selection** (`entity.silhouette` override takes highest priority).
2. **Target Category** (e.g. `type: "location"` matches location silhouettes).
3. **World Genre Context** (e.g. active theme `gothic` favors gothic silhouettes).
4. **Token Matching** (matches tags against entity title, labels, and content).

#### Add Unit Tests in `packages/schema/src/silhouettes.test.ts`:

```ts
it("resolves fantasy village for rural hamlet location", () => {
  const match = resolveEntitySilhouette(
    {
      type: "location",
      title: "Oakhaven Village",
      labels: ["hamlet", "cottage", "settlement"],
      content: "A quiet farming community with thatched roof huts.",
    },
    { worldTheme: "fantasy" },
  );
  expect(match.id).toBe("location-fantasy-village");
});
```

Run test suite:

```bash
bun test packages/schema/src/silhouettes.test.ts
```

---

### Step 6: Deploy to Cloudflare R2

Run the R2 upload script:

```bash
bun scripts/upload-silhouettes.mjs
```

This writes the SVG files to Cloudflare R2 bucket `codex-cryptica-statics` at both:

- `silhouettes/<category>/<genre>/<name>.svg`
- `silhouettes/<id>.svg`

And makes them accessible via:
`https://assets.codexcryptica.com/silhouettes/<id>.svg`

> **No Local Image Commits**:
> In accordance with repository constitution and guidelines, temporary `.jpg` and `.png` image files generated during vectorization must **never** be committed to git. They should reside only in the artifact scratch directory and be cleaned up.

---

## 4. Alternative Quick Source: Game-Icons Library

When AI image generation is unnecessary or for standard symbols/items (e.g. daggers, dice, shields, spellbooks), you can import directly from `@iconify-json/game-icons` (which has 4,100+ open-source game icons):

```ts
import gameIcons from "@iconify-json/game-icons/icons.json" with { type: "json" };

const icon = gameIcons.icons["tavern-sign"];
const svg = `<svg viewBox="0 0 512 512" fill="currentColor" xmlns="http://www.w3.org/2000/svg">${icon.body}</svg>`;
```

All game icons share standard `0 0 512 512` viewBoxes and clean single/multi-path bodies.
