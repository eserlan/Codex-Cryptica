# Contract: Import rail integration (web app)

## 1. Widen `DiscoveredEntity` (option A)

`packages/importer/src/types.ts`:

```ts
// before
suggestedType: "Character" | "Location" | "Item" | "Lore" | "Unknown";
// after
suggestedType: "Character" |
  "Location" |
  "Item" |
  "Lore" |
  "Unknown" |
  "Creature";
```

**Guarantee**: existing importer behaviour is unchanged for all current types; only a new permitted
value is added. The Oracle analysis prompt is **not** modified.

## 2. Map `creature` in the save path

`apps/web/src/lib/components/settings/ImportSettings.svelte` — `mapType()`:

```ts
if (t === "creature") return "creature";
```

**Guarantee**: a `DiscoveredEntity` with `suggestedType: "Creature"` is written as a vault entity of
type `creature` (not collapsed to `note`). All other mappings unchanged.

## 3. Pack section in the upload step

`ImportSettings.svelte`, `step === "upload"`:

- Render a "Creature Packs" section beside the dropzone listing `listPacks()` as cards
  (name + description + entry count).
- On selecting a pack:

```ts
discoveredEntities = packToDiscoveredEntities(pack, knownTitleToId);
step = "review";
```

where `knownTitleToId` is built from `vault.entities` (the same lookup the file flow already builds).

**Guarantee**: selecting a pack jumps straight to the existing `review` step; no upload, no AI/Oracle
call. The rest of the flow (`ReviewList` preview/select → existing save path) is reused unchanged.

## 4. Empty-vault call-to-action

- When the active vault has no entities, show a "Populate with a pack" CTA in the existing empty-state
  surface (alongside the current empty-state create CTA).
- Activating it routes to the importer with the pack section in view.
- The CTA is not rendered when the vault has entities.

**Guarantee**: additive only; no change to non-empty vault rendering.

## 5. Help content (Constitution VII)

- Add a help article to `apps/web/src/lib/config/help-content.ts` describing creature packs:
  what they are, how to preview/select/import, and that imported creatures are normal editable
  entities. User-facing wording uses "Creature Packs" / "Populate Vault" (Constitution IX).
