# Contract: `biome-engine` public API

Framework-free. No imports from Svelte, the web app, `map-engine`, `hex-crawl-engine` or any generator package (guarded by a test). Types come from zod schemas; `BiomeProfileSchema` is owned by `schema` and re-exported.

## Catalogue

```ts
BIOME_CATALOGUE: readonly ReferenceBiome[]        // ordered; stable ids
BIOME_SOURCES: Readonly<Record<string, Source>>
getBiome(id: string): ReferenceBiome | undefined
```

Invariants are checked in two tiers. The **catalogue-integrity test** (always on) checks structure. The **catalogue-release test** (`tests/catalogue-release.test.ts`, run at the release gate, T035f and T101) checks the content that only exists after the images are made and reviewed.

Integrity (structure):

- ids are unique and kebab-case;
- every `ImageRef` has non-empty `alt`; a `generated` one has `tool`, `generatedAt`, `prompt`, is `kind: "illustration"`, and if it has a `review` that review is complete; a `licensed` one has `creator`, `sourceUrl`, `licenceUrl`, an allow-listed `licence` and a `kind`;
- every biome's first image is `generated`, and every biome has at least one source, and every `sourceIds` entry resolves;
- every `Statement` has a `basis`;
- every `Range` has `low <= high` and a unit;
- no image `url` is a local path; image `url`s follow the deterministic pattern `https://assets.codexcryptica.com/biomes/<biome-id>/<n>.webp`.

Release (content, run before shipping):

- every `generated` image has a complete `review` (`reviewedBy`, `reviewedAt`, `notes`) and none is still marked as a placeholder;
- every biome has a `generated` first image;
- the reachability of each image URL is checked by hand against R2 (T035e), since unit tests make no network calls.

Maintainer helper: `buildBiomeImagePrompt(biome): string` in `catalogue/images.ts` composes the generation prompt from a biome's own statements. It is used only by maintainers and tests, is never imported by the web app, and so is dropped from the app bundle by tree-shaking.

## Search and filter

```ts
type BiomeQuery = { text?: string; filters?: FilterFacet[] }
searchBiomes(query: BiomeQuery, catalogue?: readonly ReferenceBiome[]): SearchResult[]
listFilterFacets(catalogue?): { facet: FilterFacet; label: string; count: number }[]
```

- Text matching is case- and diacritic-insensitive over name, summary and statement text.
- Multiple filters are an **AND**. An empty query returns the full catalogue in catalogue order.
- Never throws on odd input (empty string, regex characters).

## Comparison

```ts
buildComparison(biomeIds: string[]): ComparisonMatrix
// 2–3 ids. Fewer than 2 -> { ok: false, reason: "needs-two" }. More than 3 -> { ok: false, reason: "too-many" }.
// Unknown ids are skipped and reported in `missing`.
```

Rows are always in the same fixed order, and a cell with no data holds `{ kind: "not-applicable" }`.

## Profile operations (pure, immutable)

```ts
createProfileFromReference(biome: ReferenceBiome, now: number): BiomeProfile
createBlankProfile(): BiomeProfile
setOwnField(p: BiomeProfile, field: keyof OwnFields, value: ...): BiomeProfile
addAlteration(p, input: { aspect; description; cause?; }, id: string): BiomeProfile
updateAlteration(p, id, patch): BiomeProfile
removeAlteration(p, id): BiomeProfile
setReferenceLinks(p, links): { profile: BiomeProfile; rejected: string[] }   // non-https rejected
computeDepartures(p: BiomeProfile): Departure[]
```

- `createProfileFromReference` snapshots the reference (including resolved sources) and leaves every `own` field empty.
- Operations never mutate their input and never touch `reference`.

## Validation

```ts
validateForSave(title: string, p: BiomeProfile):
  { ok: true; warnings: Warning[] } | { ok: false; errors: Error[] }
```

- Errors: empty or over-long title, an alteration with an empty `description`, oversize text fields.
- Warnings: an alteration with an empty `cause` (`code: "alteration-missing-cause"`, carries the alteration id). Warnings never block saving.

## Rendering

```ts
renderProfileMarkdown(title: string, p: BiomeProfile): string
renderReferenceMarkdown(biome: ReferenceBiome): string
buildIllustrationPrompt(p: BiomeProfile, opts?: { maxLength?: number }): string
```

- `renderProfileMarkdown` emits, in order and only when non-empty: `# {title}`, `## Reference` (name and values from the snapshot), `## My changes`, `## Fictional alterations` (each with description, cause, effects), `## Illustration prompt`, `## Sources`. Fictional alterations never appear under `Reference` or `My changes`.
- `buildIllustrationPrompt` always begins with the exact text `fantasy, illustration of`, includes every alteration, is deterministic for the same input, and is trimmed at a clause boundary to `maxLength` (default 600).

## Optional AI suggestions

```ts
type SuggestRunner = (input: { system: string; user: string; signal?: AbortSignal }) => Promise<string>
suggestEffects(
  deps: { run: SuggestRunner },
  input: { profileSummary: string; alteration: Alteration },
  signal?: AbortSignal,
): Promise<{ ok: true; suggestions: Suggestion[] } | { ok: false; reason: "disabled" | "invalid-response" | "runner-error" | "cancelled" }>
```

- `Suggestion = { effect: string; plausibilityNote: string }`, at most 3.
- The model response is parsed leniently (JSON object extraction) and validated with zod. Invalid output returns `invalid-response`; it never throws and never returns partial unvalidated text.
- The engine never writes to a profile. The caller applies a suggestion only after the user accepts it.

## Persisted shape (in `schema`)

`BiomeProfileSchema` is exported from `schema` and is the value of the optional `EntitySchema.biome` field. See [data-model.md](../data-model.md).
