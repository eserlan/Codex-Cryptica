# Quickstart: validating the Biome Explorer

Use this to check that the feature works end to end once built. Follow AGENTS.md: run **impacted-only** checks, never repo-wide ones.

## Prerequisites

```bash
bun install
```

A vault with at least one entity is useful for the persistence checks. The Library and Compare checks work without one.

## 1. Engine and schema (fast, no browser)

```bash
cd packages/biome-engine && bun test
cd ../schema && bun test
```

Expect:

- catalogue-integrity passes (every image has alt; generated images have tool, date, prompt and review; licensed images have creator, source and licence; every biome's first image is generated; every statement has a basis; every source resolves);
- search, compare, profile, validate, markdown, prompt and suggest tests pass, including the failure paths;
- the dependency-direction test confirms no import of map or hex-crawl packages;
- `schema` accepts an entity with and without `biome`, and rejects a malformed one.

## 2. Impacted checks for the web app

```bash
bun scripts/lint-changed.mjs
bun scripts/test-changed.mjs
cd apps/web && bunx svelte-check --tsconfig ./tsconfig.json --threshold error
bun scripts/affected-workspaces.mjs
```

Expect 0 errors from each.

## 3. Manual walkthrough (dev server)

```bash
cd apps/web && bun run dev
```

| #   | Do this                                                         | Expect                                                                                                                                                     |
| --- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Open the navigation drawer, choose **Biomes**                   | The Library shows illustrated cards (spec FR-001, FR-004)                                                                                                  |
| 2   | Search "desert", then clear it; apply a "cold" filter           | Matching cards only; result count announced; empty state offers "Clear search" (FR-003)                                                                    |
| 3   | Open **Boreal forest** details                                  | Climate shown as ranges; statements labelled Common pattern / Simplification / Exception; sources listed (FR-010–012)                                      |
| 4   | Look at any image                                               | A generated image shows an "AI illustration" label with tool and date; a photograph shows creator, source and licence; both have alt text (FR-006, FR-008) |
| 5   | Add two biomes to compare, then remove one                      | Aligned rows; with one left you're asked to add another; at phone width it stacks with no sideways scroll (FR-014, FR-015)                                 |
| 6   | Choose **Make my own** from Tundra; change vegetation and water | Reference stays visible and unchanged; edits shown as departures (FR-016–018)                                                                              |
| 7   | Add a fictional change ("ash rain") with no cause, then Save    | A reminder about the missing cause appears, and saving still works (FR-019)                                                                                |
| 8   | Leave the title empty and Save                                  | You are asked for a name; nothing is saved (story 4, scenario 4)                                                                                           |
| 9   | Save with a name, reload the app, open **My biomes**            | The profile reopens exactly as saved (FR-021, FR-022)                                                                                                      |
| 10  | **Copy as Markdown** and paste it                               | Headings: Reference, My changes, Fictional alterations (and Sources); alterations never under Reference (FR-024, SC-004)                                   |
| 11  | **Copy illustration prompt**                                    | Starts with `fantasy, illustration of` and mentions the ash rain (FR-026)                                                                                  |
| 12  | Attach an image and a link                                      | Image shows on the profile; library images are not copied into the vault (FR-027)                                                                          |
| 13  | **Make a copy** of the saved profile and edit it                | The original is unchanged (FR-023)                                                                                                                         |

## 4. Failure and offline checks

| Check                                                            | Expect                                                                                     |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Browser offline, reload `/biomes`                                | All text works; images show labelled placeholders (FR-005, FR-009, SC-007)                 |
| AI disabled in settings                                          | No AI action is shown or it explains why it is unavailable; everything else works (FR-028) |
| AI enabled, press **Suggest effects**                            | Up to three proposals, each with Add / Dismiss; nothing changes until you press Add        |
| Make the vault write fail (read-only or storage error in a test) | Clear message; draft kept; Markdown export still works (story 5, scenario 6)               |
| Block clipboard permission                                       | The text is shown selectable so it can be copied by hand (story 7, scenario 3)             |
| Open `/biomes?profile=does-not-exist`                            | Plain "not found" message with a link back                                                 |
| Navigate away with unsaved edits                                 | A confirmation appears                                                                     |

## 5. Accessibility and boundaries

- Tab through Library → Details → Compare → Editor with the keyboard only; everything is reachable and operable (SC-006).
- With a screen reader, confirm result counts, save results and warnings are announced.
- Run the existing map, hex-crawl and generator tests that are impacted; they must pass unchanged (SC-008). Nothing in `apps/web/src/lib/stores/map*` or `packages/hex-crawl-engine` should appear in the diff.
- Publish/guest export a vault with a biome profile: the profile is included only when its entity is visible, and hidden ones are excluded.

## 6. Content gate (before release)

- [ ] Every catalogue image is uploaded to R2 under `biomes/` and referenced by URL; no image files are in the git diff.
- [ ] Every generated image has a recorded human review against its biome's statements (right plants, animals and landforms; no text, logos or stray people), and any failures were regenerated.
- [ ] The image tool's terms allow commercial use of its output (tool and terms date recorded).
- [ ] Any licensed photograph's licence and attribution has been checked against its source page.
- [ ] Every biome's facts are traceable to at least one cited source.
- [ ] Help article `biome-explorer` is published and linked from the feature hint.
