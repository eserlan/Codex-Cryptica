# Research: Biome Explorer

All Technical Context items are resolved. No `NEEDS CLARIFICATION` remains.

## R1. Where the logic lives

- **Decision**: A new framework-free package `packages/biome-engine` holds the catalogue, schemas' helpers, search, comparison, profile operations, validation, Markdown rendering, prompt building and the AI suggestion service. The persisted record shape (`BiomeProfileSchema`) lives in `packages/schema`.
- **Rationale**: Principle I (library-first) and the pattern of `hex-crawl-engine`, `entity-template-engine` and `solo-session-engine`. `schema` already owns every persisted vault shape (`statSheet`, `report`, `languageProfile`), so keeping the profile shape there avoids a `schema → biome-engine` dependency cycle.
- **Alternatives**: Put it all in `apps/web` (rejected: breaks Principle I and makes the Markdown/prompt logic hard to test). Extend `generator-engine` (rejected: the issue explicitly says this is "not another random generator").

## R2. How a profile is stored

- **Decision**: A profile is an ordinary **Note** entity with `kind: "biome"`, a Label `biome`, and one additive optional structured field `biome` in frontmatter. The structured field is canonical. `content` holds a **generated Markdown rendering** of the profile, refreshed on every save from the Explorer, so vault search, the Oracle, the graph and exports can read it without knowing the structured shape. The user's own free-form notes go in the existing `lore` field.
- **Rationale**: The issue requires "a structured vault worldbuilding entity/profile, not just a disconnected text response". The `report` (`kind: "report"` plus provenance) and `point-crawl` (`kind: "point-crawl"`) features set the precedent: ordinary Note plus `kind`, no new storage format, no migration. Optional fields are tolerated by older readers.
- **Trade-off acknowledged**: Two representations (structured field and rendered `content`). Mitigation: the structured field always wins when the profile is opened in the Explorer, and the Help article says to edit biomes in the Explorer. If someone edits `content` by hand, the next Explorer save overwrites it. This is the same posture as `report` entities.
- **Alternatives**:
  - Markdown-only with parsed headings (rejected: fragile round-trip, can't separate reference from invention reliably).
  - A new entity type or a new vault file like `.codex/biomes/*.json` (rejected: adds sync, backup, export and restore work, and the user wants profiles to appear with other vault content).
  - A `statSheet`-style template (rejected: stat sheets are rules mechanics, not setting prose).

## R3. Catalogue content, images and provenance

- **Decision**:
  - The catalogue text is **bundled** (TypeScript data modules, one per biome, plus a shared `sources.ts`), so it works offline and needs no network call.
  - **Images are mostly AI-generated illustrations, made once by the team before release.** Each biome has one main generated illustration. A licensed photograph is added as a secondary image only where a good public-domain or Creative Commons one exists. Nothing is generated at runtime, and the app never calls an image model for the catalogue.
  - Images are hosted on R2 under `https://assets.codexcryptica.com/biomes/<biome-id>/<n>.<ext>` and referenced by URL. No image files are committed (AGENTS.md rule).
  - `ImageRef` is a union on `origin`:
    - `generated`: `url`, `alt`, `kind: "illustration"`, `tool` (model name), `generatedAt`, `prompt`, and `review: { reviewedBy, reviewedAt, notes }`.
    - `licensed`: `url`, `alt`, `creator`, `sourceUrl`, `licence` (`CC0-1.0`, `PD`, `CC-BY-4.0`, `CC-BY-SA-4.0`), `licenceUrl`, `kind: "photograph" | "illustration"`.
  - **Consistent style and honest realism.** All generated images share one style constant (`BIOME_ILLUSTRATION_STYLE` in `catalogue/images.ts`) so the library looks like one set. Library illustrations are realistic landscape illustrations of the real biome. The "fantasy, illustration of" prefix is only for users' own fictional profiles (FR-026) and is never used for the catalogue.
  - **Prompts come from the biome's own data.** Each generated image's prompt is written from the biome's vegetation, landscape and light/weather statements, naming the plants, animals and landforms the text already says are typical. This keeps the picture and the description consistent and makes review a direct comparison.
  - **Human review gate.** A person checks each generated image against the biome's statements (right plants, right animals, no impossible features, no text or logos, no people unless intended) and records `review`. Images that fail are regenerated. Alt text is written by the reviewer, not copied from the prompt.
  - **Labelling.** The UI shows "AI illustration" on every generated image, with tool and date available beside it, and never presents one as a photograph.
  - **Two-tier tests.** The **catalogue-integrity test** (always on) fails the build if: any image lacks `alt`; a `generated` image lacks `tool`, `generatedAt` or `prompt`, or has an incomplete `review`; a `licensed` image lacks creator, source, licence or an allow-listed licence; any biome's first image is not `generated`; any biome has no cited source; or a statement lacks a basis label. The **catalogue-release test** (run at the release gate) additionally fails if any `generated` image has no complete `review`. Image URLs follow a deterministic R2 pattern, so data modules can be written before the images exist.
  - **Tool**: the team's existing image-generation path (the Oracle image / art-direction pipeline already in the app, so the model name is whatever that path is configured to use). The exact model name is recorded in each image's `tool` field. If a different tool is used for the catalogue, its name goes there instead.
  - Terms check (content gate): confirm the image tool's terms allow commercial use of its output before release, and record the tool and terms date in the provenance checklist.
- **Rationale**: Removes the slow part of the original plan (finding and licensing about 30 photos) while keeping provenance honest. A single consistent set reads better than a patchwork of photos, and generating once keeps the app offline-friendly and AI-optional. The review gate addresses the issue's accuracy concern directly.
- **Risks**: Generated images can contain subtle ecological errors (the wrong species or the wrong climate cues). Mitigation: prompts derived from the biome's own data, mandatory review, and photographs where a faithful one exists. Residual risk is accepted and called out in the Help article.
- **Allowed photograph sources**: public domain and CC0 (for example NASA, USGS, NPS, many Wikimedia Commons works) and CC-BY / CC-BY-SA works where attribution is shown. Excluded: Pinterest, ArtStation, image boards and any "free for personal use" images with unclear terms.
- **Sources for the factual text** (examples to cite; final list chosen at curation): Köppen–Geiger climate summaries (Beck et al. 2018), WWF terrestrial ecoregions / Olson et al. 2001, Whittaker's biome diagram (cited as a **simplification**, not a rule), FAO and IUCN habitat descriptions, Ramsar for wetlands, and regional ecology textbooks. Whittaker and Köppen are cited as simplifications on purpose (FR-013).
- **Alternatives**: Photos only (rejected for now: slow licensing and curation). Fetch images live from Wikimedia at runtime (rejected: unreliable, hot-linking, no offline, licence drift). Commit images (rejected by repo policy). Generate images in the app per user (out of scope: cost, consistency, and the privacy and AI-optional goals).

## R4. Catalogue size and which biomes

- **Decision**: Plan for **10 biomes**: the eight in the issue (temperate woodland, boreal forest, grassland/steppe, hot desert, tundra, wetland, tropical rainforest, coastline) plus **savanna** and **alpine/montane**. The package exports `BIOME_CATALOGUE` as an ordered list, so adding more is data-only. The spec deliberately does not freeze the list, so this is a planning decision and can change in review.
- **Rationale**: Savanna and alpine are the two most frequently asked-for gaps in the issue's own list, and alpine introduces the **elevation** axis the spec asks for. Ten keeps curation (images and citations) realistic for an MVP.
- **Note**: Coastline and wetland are landform/habitat types rather than climate zones. The data model has a `category` facet (`climate-zone` / `landform-habitat`) so the UI can be honest about that and the comparison view can show "n/a" for climate rows that don't apply instead of inventing values.

## R5. Representing "documented tendencies vs. simplifications vs. exceptions"

- **Decision**: Every descriptive statement in a reference biome is a `Statement { text, basis: "pattern" | "simplification" | "exception", sourceIds[] }`. Conditions use `Range { low, high, unit, note? }` (never a single point). The UI shows a small text badge ("Common pattern", "Simplification", "Exception") that does not rely on colour alone.
- **Rationale**: Makes FR-010 to FR-012 testable at data level (the integrity test checks every statement has a basis and every source id resolves).
- **Alternatives**: Free-text with a footnote (rejected: not testable). A numeric rainfall/temperature matrix as the biome definition (rejected: FR-013 forbids presenting it as classification).

## R6. Fictional alterations

- **Decision**: `Alteration { id, aspect, description, cause, effects? }` where `aspect` is one of the editable aspects (climate, terrain, vegetation, water, pressures, other). `cause` is the cause-and-effect note: **encouraged, never required** (spec FR-019 and User Story 6, scenario 2). The save step returns a non-blocking warning per alteration with an empty `cause`. Alterations are rendered and exported in their own section and are never merged into the real-world fields.
- **Rationale**: Matches the spec decision that the note is a reminder, not a gate.

## R7. Relationship to hex-crawl terrain

- **Decision**: No dependency. Hex terrain (`plains`, `forest`, `desert`, …) is a nine-value tile preset for per-hex records, not a biome model, as the issue states. The Biome Explorer must not import `hex-crawl-engine`, and `hex-crawl-engine` must not import `biome-engine`. Linking them is #4290.
- **Rationale**: FR-031 and the issue's integration boundary. A dependency-direction check in the package's tests (no import of map or hex-crawl packages) guards it.

## R8. Entry point and navigation

- **Decision**: A dedicated app route `/biomes`, with a nav item "Biomes" in the `view` group using the **overflow** placement (as Play and Rolls & Decks do), icon `icon-[lucide--mountain-snow]`. It also gets a Help hint in the "Get unstuck" group of `feature-groups.ts`. It is not placed in the generators list.
- **Rationale**: The issue wants "an obvious entry point under worldbuilding/exploration rather than pretending it is another random generator". Overflow placement avoids crowding the fixed phone bottom bar (the same reasoning documented for Play).
- **Alternatives**: A sidebar tool like the Entity Explorer (rejected: needs a large comparison surface). An entity-detail tab (rejected: touches the 605-line `EntityDetailPanel`, and a reference library is not about one entity).

## R9. Where profile editing happens

- **Decision**: All profile creation and editing happens in the Explorer's **My biomes** view and editor. The generic entity detail panel is not modified; it simply shows the generated Markdown `content` like any Note. The Explorer opens a profile from a deep link `/biomes?profile=<entityId>`.
- **Rationale**: Keeps `EntityDetailPanel` untouched (Principle XIV) and avoids two editors disagreeing about the same structured data.
- **Follow-up (not in this plan)**: an "Open in Biome Explorer" action on biome entities.

## R10. Image attachment and reference links

- **Decision**: The user-attached image reuses the entity's existing `image` field and its existing upload, thumbnail and WebP conversion path. External links are stored as `referenceLinks: { url, label }[]` inside the `biome` field after validating `https:` only. Library images are never copied into the vault, so licence terms stay with the catalogue.
- **Rationale**: FR-027 (kept distinct from library images). Reuses a proven path (Principle III).
- **Guest/publish impact**: the `biome` field is user content and follows the entity's own visibility, like other entity fields. `GuestExporter` strips `biome.referenceLinks` (the user's personal research links) from every guest and published projection, in the same way it sanitises `statSheet`; everything else in `biome` is exported with a visible entity. Hidden and draft biome entities are excluded. Tests cover both. Library image URLs are not rewritten.

## R11. Markdown rendering and export

- **Decision**: `renderProfileMarkdown(profile)` produces fixed headings: `Reference`, `My changes`, `Fictional alterations`, `Illustration prompt` (only when set), `Sources`. Copy uses the existing `ClipboardService` smart-copy (Markdown plus HTML). A "Download .md" action uses a Blob download. Library biomes can also be copied as Markdown (read-only).
- **Rationale**: SC-004 (no mixing). Reuses `ClipboardService` (2815-smart-copy).

## R12. Illustration prompt

- **Decision**: `buildIllustrationPrompt(profile)` starts with the literal prefix `fantasy, illustration of` and then composes: biome name, landscape, vegetation, water/weather mood, notable wildlife, and each fictional alteration as an extra clause. It is deterministic and local. A length cap keeps it usable in common image tools (default 600 characters, trimmed at a clause boundary). It is a copyable string; no image generation is performed.
- **Rationale**: FR-026 and FR-028. Deterministic means testable.
- **Alternatives**: AI-written prompts (rejected: unneeded and would not work offline).

## R13. The optional AI action

- **Decision**: One action, **Suggest effects**, on a fictional alteration. It sends the alteration text and a short profile summary through the existing `aiClientManager`, behind an injected `SuggestRunner`, and returns up to three structured suggestions (`{ effect, plausibility_note }`) validated with zod. Each suggestion is shown as a proposal with **Add** and **Dismiss**. Nothing is written without a click, and accepted text is stored as the user's own and labelled as "Suggested by AI" in the editor only. The action is hidden or disabled with a plain explanation when AI is off (`discoveryPolicyStore` gate) or no key is configured. The first-use notice mirrors the hex-crawl pattern (`HINT_KEYS.BIOME_AI_NOTICE`, device-local).
- **Rationale**: The user's standing preference is for AI to be prominent in new tools with GM-authorship guardrails and an offline fallback; the spec requires it to be optional. The offline fallback is simply that the user writes the note themselves, and nothing else depends on it.
- **Scope guard**: This is the only AI feature in the slice. If review prefers a strictly AI-free MVP, drop `suggest.ts`, its runner and the notice; no other module depends on them.

## R14. Accessibility and small screens

- **Decision**:
  - Cards are real links/buttons with visible focus; the library grid is a list with accessible names.
  - Comparison is a semantic `<table>` with column and row headers on wide screens, and a stacked per-attribute layout under the phone breakpoint, so there is no horizontal page scroll.
  - Images have alt text from the catalogue; the placeholder has a text label.
  - Basis badges use text, not colour only.
  - Details use disclosure widgets (`<details>`/button + `aria-expanded`) so "deeper details on demand" is keyboard and screen-reader friendly.
  - Live region announces filter result counts and save success or failure.
- **Rationale**: FR-029, SC-006. Follows the project's existing patterns (see `docs/STYLE_GUIDE.md`).

## R15. Persistence of in-progress drafts

- **Decision**: The editor holds the working draft in the store. It is persisted only on explicit Save. A `beforeunload`/navigation guard warns on unsaved changes. If saving fails, the draft stays in the store and a retry or export is offered. No automatic draft is written to disk.
- **Rationale**: FR-025 and the spec edge case about failed saves. Writing hidden drafts into the vault would clutter it.

## R16. Telemetry

- **Decision**: None. Per the stored vault privacy boundary, nothing inside the authenticated vault app is tracked, not even first-party privacy-safe events. Success criteria that need user testing (SC-009) are measured through an offline user study, not instrumentation.

## R17. Testing strategy

- **Decision**:
  - `biome-engine`: unit tests per module, a **catalogue-integrity** test (provenance, licences, sources, statement bases, range sanity), a **round-trip** test (create → render → parse-free reopen of structured data), a prompt-prefix test, an AI-suggest test with a fake runner (success, invalid JSON, runner error, cancel), and a dependency-direction test.
  - `schema`: accepts and rejects `biome` shapes, and accepts entities without it.
  - Web: store tests (DI fakes for vault, clipboard, storage, AI), component tests for library, detail, compare, editor, alteration list and image fallback, and a route test for the deep link.
  - E2E: one Playwright path (browse → compare → make my own → add alteration → save → reload → reopen → copy Markdown), plus an offline/AI-disabled variant.
  - Each feature includes at least one failure-path test (vault write fails, image 404, clipboard unavailable, AI disabled/runner error, missing name).
- **Rationale**: AGENTS.md requires success plus failure coverage and impacted-only validation.
