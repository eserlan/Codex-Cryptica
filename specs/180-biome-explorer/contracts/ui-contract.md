# Contract: Biome Explorer UI and persistence boundary

## Route

| Route                        | Purpose                                                                                                                           |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `/biomes`                    | Workspace with three views: **Library**, **Compare**, **My biomes**                                                               |
| `/biomes?biome=<id>`         | Opens the Library with that biome's details expanded                                                                              |
| `/biomes?profile=<entityId>` | Opens the editor for a saved profile; shows a plain "not found" message and a link back if the entity is missing or isn't a biome |

The nav item is "Biomes" (`view` group, overflow placement, `icon-[lucide--mountain-snow]`). The route works with no vault open for the Library and Compare views. **My biomes** and Save need an open, writable vault and otherwise explain why.

## Views and key interactions

| View      | Contents                                                                                             | Key behaviours                                                                            |
| --------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Library   | Search box, filter chips ("Filters"), card grid                                                      | Live result count announced politely; empty state with "Clear search"; card opens details |
| Details   | Image carousel with attribution, summary, expandable sections, sources, related links                | Sections are disclosure widgets; "Make my own", "Add to compare", "Copy as Markdown"      |
| Compare   | 2–3 biomes, aligned rows                                                                             | Remove a biome; fewer than 2 prompts to add one; stacks on phones                         |
| My biomes | List of saved profiles                                                                               | Open, make a copy, delete (confirmed), export as Markdown                                 |
| Editor    | Reference column (read-only) beside "My version" fields, alterations list, prompt panel, attachments | Unsaved-changes guard; Save shows warnings without blocking                               |

## Component responsibilities (one each)

| Component             | Responsibility                                                                       |
| --------------------- | ------------------------------------------------------------------------------------ |
| `BiomeLibrary`        | Query and filter state → card grid                                                   |
| `BiomeCard`           | One concise illustrated card                                                         |
| `BiomeDetail`         | On-demand ecology/climate details and sources for one biome                          |
| `BiomeImage`          | Image, "AI illustration" label or photo credit, alt text, labelled fallback on error |
| `BiomeCompare`        | Comparison table / stacked layout                                                    |
| `BiomeProfileEditor`  | Reference-versus-mine fields and save/discard                                        |
| `BiomeAlterationList` | Add, edit and remove fictional alterations; optional "Suggest effects"               |
| `BiomeProfileList`    | Saved profiles                                                                       |

## Store contract (`biome-explorer.svelte.ts`)

Constructor-injected dependencies (class + default singleton, per ADR 007):

```ts
new BiomeExplorerStore({
  vault: BiomeVaultGateway,     // create/update/delete/list biome entities
  clipboard: ClipboardService,  // smart-copy Markdown
  storage: StorageLike,         // last-view preference (device-local)
  suggest?: SuggestRunner | null,
  isAiAllowed: () => boolean,   // discovery-policy gate
  now: () => number,
  newId: () => string,
})
```

State: `query`, `activeFilters`, `compareIds`, `view`, `draft` (`{ entityId?, title, profile, dirty }`), `saveState` (`idle | saving | failed`), `profiles`.

Behavioural guarantees:

- `save()` calls `validateForSave`; errors block and are shown next to the field, warnings are shown and do not block.
- A failed `vault` write sets `saveState = "failed"` and **keeps the draft**; `exportDraftMarkdown()` stays available.
- `discardDraft()` requires confirmation when `dirty`.
- `duplicateProfile(id)` creates a new draft; the original is not modified.
- Search, filters and compare are pure derivations from the engine; no network.

## Vault gateway contract (`biome-vault-gateway.ts`)

```ts
interface BiomeVaultGateway {
  list(): Promise<BiomeEntitySummary[]>; // entities with kind "biome"
  load(
    entityId: string,
  ): Promise<{ title: string; profile: BiomeProfile } | null>;
  create(
    title: string,
    profile: BiomeProfile,
    content: string,
  ): Promise<string>; // returns entity id
  update(
    entityId: string,
    title: string,
    profile: BiomeProfile,
    content: string,
  ): Promise<void>;
  remove(entityId: string): Promise<void>;
}
```

- `create` makes a Note with `kind: "biome"`, labels `["biome", <reference name>]`, `biome` set, `content` set to the rendered Markdown.
- `load` parses `biome` with `BiomeProfileSchema`; an invalid or missing field returns `null` and the UI explains the profile can't be opened in the Explorer (the Note itself remains readable).
- User-attached images use the entity's existing `image` path and are not handled by this gateway.

## Persistence compatibility

- `EntitySchema.biome` is optional and additive. Existing entities, backups and synced vaults are valid without change.
- No IndexedDB version bump, no OPFS layout change, no migration.
- Device-local keys: `codex-biome-explorer-view` (last view) in `localStorage`, and `biome-ai-notice-seen` (`HINT_KEYS.BIOME_AI_NOTICE`) for the first-use AI notice. Both are read and written inside try/catch.

## Accessibility contract

- Every interactive element is keyboard reachable in a logical order, with visible focus.
- Images: `alt` from the catalogue; fallback placeholder includes the biome name as text.
- Comparison: a real table with header cells at column widths ≥ the tablet breakpoint; a definition-style stacked layout below it.
- Basis badges and warnings use text and an icon, not colour alone.
- Filter results, save success/failure and AI suggestions are announced through polite live regions.
- Dialogs (delete, discard) trap focus and return it on close.
- No horizontal page scroll at 360 px width.

## Non-goals (contract boundary)

- No change to map, hex-crawl or generator code paths or data.
- No analytics or event tracking of any kind.
- No automatic writes: nothing reaches the vault without the user pressing Save, and nothing from the AI action is applied without an explicit Add.
