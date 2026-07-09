# Duplication Analysis

Audit of duplicate/near-duplicate code across the monorepo, looking for logic
that's copy-pasted (or reimplemented with slight variation) across multiple
files and could be extracted into a shared helper or abstraction.

Scope covered:

- `packages/generator-engine/src` (the `public-*.ts` procedural generators)
- `apps/web/src/lib/components` (Svelte UI)
- `apps/web/src/lib/services` and `apps/web/src/lib/stores`

This is a research report only — nothing below has been fixed yet. Findings
are ranked within each section by **(lines saved × extraction safety)** —
highest-value, lowest-risk items first.

---

## 1. `packages/generator-engine` — procedural generators

All 11 `public-*.ts` files (`faction`, `settlement`, `npc`, `ship`, `pantheon`,
`social-hub`, `kingdom`, `nation`, `magic-item`, `quest`, `names`) follow the
same shape: a local `Rng` type, a `defaultRng`, a `pickFrom` helper, a name
generator, a `*Config` data table, a `build*Prompt` / `parse*Response` /
`generate*Local` triad, and a `resolve*` internal function. Most of that
scaffolding is duplicated verbatim rather than shared.

### 1.1 `pickFrom<T>()`, `Rng`, `defaultRng` — identical in all 11 files

- `public-faction.ts:17`, `public-settlement.ts:18`, `public-npc.ts:20`,
  `public-ship.ts:19`, `public-pantheon.ts:21`, `public-social-hub.ts:17`,
  `public-kingdom.ts:17`, `public-nation.ts:17`, `public-magic-item.ts:17`,
  `public-quest.ts:17`, `public-names.ts:11`
- Body is identical everywhere: `arr[Math.floor(rng() * arr.length)]`, plus
  `export type Rng = () => number;` and
  `const defaultRng: Rng = () => Math.random();` duplicated at the top of
  every file.
- **Fix:** extract `Rng`, `defaultRng`, `pickFrom<T>()` into a shared
  `random-utils.ts`. ~33 lines removed. Zero risk — pure function, no
  external deps.

### 1.2 `getRandomItems<T>()` (Fisher-Yates partial shuffle) — identical in 3 files

- `public-settlement.ts:22-33`, `public-npc.ts:24-35`, `public-ship.ts:23-34`
- Identical 12-line body: Fisher-Yates shuffle then `slice(0, count)`.
- **Fix:** fold into the same `random-utils.ts` as `pickRandomItems<T>()`.
  ~36 lines removed. Zero risk.

### 1.3 Fenced-JSON parsing boilerplate — same 4-line pattern repeated 13×

- `public-faction.ts:991-996,1272,1457`, `public-npc.ts:1236-1241`,
  `public-magic-item.ts:407-412`, `public-nation.ts:328-332`,
  `public-kingdom.ts:250-255`, `public-quest.ts:571-576`,
  `public-settlement.ts:1289-1294`, `public-ship.ts:958-963`,
  `public-names.ts:461-465`
- Pattern: `text.trim().replace(/^```json\s*/i, "").replace(/```$/, "").trim()`
  then `JSON.parse(cleanText)`.
- `public-pantheon.ts:643-661` and `public-social-hub.ts:511-520`
  reimplement roughly the same thing under different names
  (`cleanJson`/`str`/`rec`/`arr` vs `parseJson`/`stringField`) — confirms
  this need is recognized but not shared.
- **Fix:** `parseFencedJson<T>(text: string): T` (+ optional `asString`/
  `asRecord`/`asArray` accessors) in a shared `llm-response-utils.ts`.
  ~50-60 lines removed. Low risk — worth a quick check that no site relies
  on a subtly different fence syntax before collapsing.

### 1.4 `generateName()` placeholder generator — identical in 7 files

- `public-faction.ts:21-31`, `public-npc.ts:~37`, `public-pantheon.ts:25`,
  `public-social-hub.ts:21`, `public-kingdom.ts:21`, `public-nation.ts:21`,
  `public-quest.ts:21`
- Identical 8-prefix/8-suffix arrays (`Ael/Bran/Cael/Dax/Kael/Morg/Thor/Vael`
  × `dar/wen/ric/mar/thas/gar/rin/on`) and identical body.
- **Fix:** move to `random-utils.ts` (or `fallback-names.ts`) as
  `generatePlaceholderName(rng)`. ~70 lines removed. Zero risk — pure,
  unparameterized.

### 1.5 `public-kingdom.ts` vs `public-nation.ts` — near-total near-duplicate module

- `public-nation.ts` (452 lines) is structurally a genre-aware superset of
  `public-kingdom.ts` (361 lines): byte-identical `buildRealmName`/
  `buildCapitalName` (`kingdom.ts:87-94` vs `nation.ts:87-94`), same
  `REALM_ROOTS`/`CAPITAL_WORDS` tables, same `resolve*`/`build*Prompt`/
  `parse*Response` shape. Nation just adds a `genre` dimension
  (`polityTypesByGenre`) where kingdom has a flat `polityTypes` array.
- Both are live (exported from `index.ts`; `kingdom` is consumed by
  `apps/web/src/lib/services/seo/generator-engine.ts`) — not dead code.
- **Fix — needs a judgment call, not purely mechanical:** either (a)
  genre-parameterize kingdom as a single-genre case of nation and have it
  delegate, or (b) at minimum extract the shared name-building
  functions/tables into the name-utils file. (b) is the safe first step;
  (a) risks behavior drift and wants product sign-off before merging.

### 1.6 `forGenre<T>()` — same shape, diverging fallback semantics

- `public-settlement.ts:35`: `record[genre] ?? record["Fantasy"]`
- `public-ship.ts:36`: `record[genre] ?? record["Sci-Fi"] ?? Object.values(record)[0]`
- Same concept, different default-genre fallback per entity type.
- **Fix:** a shared `pickForGenre<T>(record, genre, fallbackGenre)`
  parameterized by fallback key — unifies both without changing behavior.

### Not duplicated (checked, no action needed)

- `campaign-generator-registry.ts` (~700 lines) is mostly per-entity registry
  metadata (labels, categories, banned-title lists), not reimplemented logic.
- `public-generator-adapters.ts` (144 lines) is a thin adapter layer with no
  duplicate RNG/JSON logic.

### Suggested order

1. `random-utils.ts`: `Rng`, `defaultRng`, `pickFrom`, `getRandomItems`,
   `generatePlaceholderName` — ~140+ lines removed across 11 files, no
   behavior change.
2. `llm-response-utils.ts`: fenced-JSON parsing — ~13 call sites, ~50-60
   lines removed, low risk.
3. `pickForGenre<T>(record, genre, fallbackGenre)` — 2 call sites today,
   will scale as more genre-aware generators are added.
4. Kingdom/Nation consolidation — flag as a follow-up ticket; needs a design
   decision, not a pure mechanical refactor.

---

## 2. `apps/web/src/lib/components` — Svelte UI

### 2.1 Modal shell markup — highest impact, safest extraction

Nearly every modal reimplements the same shell from scratch: full-screen
backdrop button (`fixed inset-0 ... bg-black/70-85 backdrop-blur ...
z-[100-200]`) + `role="dialog" aria-modal="true"` container + header with
title/icon + a close button (`aria-label="Close"` with an
`icon-[lucide--x]` span).

- Files with the pattern repeated near-verbatim: `modals/ConfirmationModal.svelte:28-50`,
  `settings/UnpublishConfirmModal.svelte:14-42`, `modals/ChangelogModal.svelte:86-127`,
  `modals/NodeReadModal.svelte:150-212`, `vaults/VaultSwitcherModal.svelte:200-222`,
  `settings/SettingsModal.svelte:118-208`, `generators/CampaignGeneratorModal.svelte:341-391`,
  `modals/RevisionInstructionModal.svelte:63-95`, `canvas/EdgeLabelModal.svelte:58-83`,
  `modals/SoundBiteModal.svelte:45-46`, `canvas/CanvasSelectionModal.svelte`,
  `modals/GuestLoginModal.svelte:62-67`, `seo/EntityDetailModal.svelte`,
  `seo/SaveToCodexModal.svelte`.
- **A11y gap found alongside the duplication:** of ~35 modal-like files, only
  6 (`GuestChatModal`, `ImagePromptReviewModal`, `MobileCreateEntitySheet`,
  `ConfirmationModal`, `RevisionInstructionModal`, `CampaignGeneratorModal`)
  actually use `use:focusTrap` from `$lib/actions/focusTrap` — the rest lack
  focus trapping. A shared shell fixes this for free across the board.
- **Fix:** a `ModalShell.svelte` (or extend `modals/GlobalModalProvider.svelte`)
  taking `title`, `icon`, `dangerous`, `onClose`, and slot content, wiring
  backdrop + `focusTrap` + Escape-to-close + transition once.

### 2.2 Decorative "glow card" chrome — exact duplicate

- `modals/ConfirmationModal.svelte:52-57,107-112` (corner glows + corner
  brackets) copy-pasted almost verbatim into
  `entity-detail/RelatedEntityModal.svelte:314-317` (`blur-[80px]` glow divs,
  `border-t-2 border-l-2 border-theme-primary/40` corner brackets). Same
  class strings, same structure.
- **Fix:** small presentational component/snippet (`DecorativeGlowFrame.svelte`)
  wrapping content with the glow + corner-bracket chrome.

### 2.3 Confirmation dialogs not reusing `ConfirmationModal`

- `settings/UnpublishConfirmModal.svelte` (83 lines) reimplements the same
  "are you sure, dangerous action" dialog (warning-icon header, red-tinted
  destructive button, cancel button) instead of routing through the app's
  global `notificationStore.confirmationDialog` + `ConfirmationModal.svelte`.
  Compare `UnpublishConfirmModal.svelte:14-83` vs
  `ConfirmationModal.svelte:28-115` — same intent, different plumbing
  (`show`/`onConfirm` bindable prop vs store-driven dialog).
- **Fix:** route through the existing confirmation store/modal (pass
  `isDangerous` + custom message); eliminates ~80 lines wholesale. Safe,
  since `ConfirmationModal` is already global/singleton-driven.

### 2.4 Inline "empty state" blocks bypassing `ui/EmptyState.svelte`

`ui/EmptyState.svelte` (icon + headline + optional body/CTA) exists but is
only consumed in `explorer/EntityList.svelte:342-355` (and `GraphView.svelte`,
`oracle/OracleChat.svelte`). Others hand-roll the same block:

- `map/PinLinker.svelte:108-110` — `No entities found matching...`
- `dialogs/BulkLabelDialog.svelte:352-356` — `No labels found...`
- `quicknote/NoteHistory.svelte:53-56` — `No notes found`
- `ui/Autocomplete.svelte:48-49` — `"No results found."` (text-only, lower priority)
- **Fix:** swap these 3-4 inline blocks for `<EmptyState headline="..."
icon="..."/>`; mechanical, low risk, unifies visual language.

### 2.5 Spinner/loading markup — lower confidence, needs a closer look

The double-ring spinner in `entity-detail/RelatedEntityModal.svelte:487-493`
appears one-off, but 41 files use bare `animate-spin` with varying wrapper
markup (`VaultControls.svelte`, `entity-detail/DetailStatusTab.svelte`,
`oracle/ChatMessage.svelte`, `zen/ZenSidebar.svelte`, etc.) with no shared
`<Spinner>`/`<LoadingIndicator>` component. Worth a follow-up pass — 41 files
is a lot, but many may be simple single-span spinners not worth abstracting.

### Ranking

1. Modal shell extraction (2.1) — biggest win, ~15+ files, mechanical but
   needs care re: per-modal transition/animation parity.
2. Confirmation dialog consolidation (2.3) — small, very safe, removes a
   whole component.
3. Decorative glow frame (2.2) — tiny, 2 files, purely mechanical.
4. EmptyState adoption (2.4) — small, safe, mechanical swap-in.
5. Spinner unification (2.5) — needs more investigation before committing
   to an abstraction.

---

## 3. `apps/web/src/lib/services` and `apps/web/src/lib/stores`

### 3.1 Orphaned shared `debounce()` — 4 files reimplement it manually

- `apps/web/src/lib/utils/debounce.ts` exports a generic `debounce(fn, delay)`
  — **zero importers anywhere in the codebase.**
- Reimplemented ad hoc instead:
  - `stores/vault/registry.ts:95-103` — module-level `refreshTimeout` +
    `triggerRefresh()` (clear-then-setTimeout, 100ms)
  - `stores/ui/layout-ui.svelte.ts:279-290` — `debounceWrite(side, key,
width)` (clear-then-setTimeout, 500ms, per-side timer fields)
  - `stores/vault/entity-persistence.ts:~90-130` — per-entity `_saveTimers`
    Map with clear-then-setTimeout (also tracks resolvers/options per id —
    needs a keyed variant, not a straight swap)
  - `stores/vault/sync-store.svelte.ts:479-484` — `savedTimer`
    clear-then-setTimeout (reverts "saved"→"idle" after 3s; a timer, not
    really an input debounce — lower priority to migrate)
- **Fix:** adopt `utils/debounce.ts` directly in `registry.ts` and
  `layout-ui.svelte.ts` (trivial fit). Extend the util with a
  `keyedDebounce(fn, delay)` factory before reusing it in
  `entity-persistence.ts`.

### 3.2 Retry/backoff loops reimplemented 3× with no shared helper

- `services/publishing/PublishingService.svelte.ts:371-393` — `while
(retryCount < 6)` on HTTP 429, exponential backoff `Math.min(1000 * 2**n,
30000)`, honors `Retry-After`.
- `stores/vault/entity-persistence.ts:262-280` — `for` loop over
  `DISK_WRITE_ATTEMPTS`, linear backoff `DISK_RETRY_BASE_MS * (attempt+1)`.
- `services/gdrive-auth.ts:51-58` — polling loop waiting for the Google
  Identity library to load, fixed 100ms interval, max 50 attempts (a
  "wait for condition" shape, not backoff, but the same
  `await new Promise(setTimeout...)` bookkeeping).
- **Fix:** extract a small `retryWithBackoff(fn, { attempts, delayFn })`
  util, plus a separate `waitUntil(predicate, { intervalMs, timeoutMs })`
  for the polling case. Not fully mechanical — each site has distinct
  trigger conditions (HTTP status vs. exception vs. polling) — but the
  delay/attempt bookkeeping is identical boilerplate.

### 3.3 `structuredClone` fallback duplicated

- `services/ai/text-generation-context.ts:1-9` — `safeSnapshot<T>(obj)`,
  already shared across 4 of the 5 AI text-generation services.
- `services/ai/client-manager.ts:326-350` — `cloneRequestPayload<T>(request)`
  reimplements the exact same try-`structuredClone`-catch-fallback-to-
  `JSON.parse(JSON.stringify)` logic independently, with its own
  `console.warn` messages.
- **Fix:** have `client-manager.ts` import `safeSnapshot` (or hoist both
  into a shared `utils/clone.ts`) instead of keeping a private
  `cloneRequestPayload`.

### 3.4 "Extract JSON from model response" regex duplicated 3×

- `services/ai/text-generation-creation.service.ts:48-53` and `:236-241` —
  both do `text.match(/\{[\s\S]*\}/)` then `JSON.parse(jsonMatch[0])` with
  slightly different fallback behavior.
- `services/ai/text-generation-revision.service.ts:137-143` — same
  `/\{[\s\S]*\}/` regex + `JSON.parse`.
- **Fix:** extract a shared `extractJsonFromModelResponse(text): unknown |
undefined` in `services/ai/` (alongside `text-generation-context.ts`) and
  reuse across all three call sites. Purely mechanical, small blast radius.

### Not duplicated / checked, no action needed

- `api-error-classifier.ts` is used consistently everywhere it's needed
  (chat, image-generation, revision, seo/generator-engine) — HTTP-status
  checks in `gdrive-sync.ts`/`PublishingService.svelte.ts` are unrelated
  transport-layer checks, not misclassified AI-response errors.
- `stores/vault.svelte.ts`, `stores/graph.svelte.ts`,
  `stores/vault/entity-store.svelte.ts`,
  `stores/vault/entity-index-maintainer.svelte.ts` — no duplicate
  rebuild/incremental-index logic; `vault.svelte.ts` correctly delegates to
  `entity-store`/`entity-index-maintainer` rather than reimplementing
  indexing. Already properly factored from the recent decomposition.
- `resolveTemplate` (`EntityTemplateService.svelte.ts`) /
  `resolveTemplateSync` (`EntityTemplateConstants.ts`) — single source of
  truth each, no duplicate template-resolution logic.
- `EntityTemplateConstants.ts` (~812 lines) is mostly repeated _data_
  (per-theme markdown template bodies with parallel section structure), not
  duplicated _logic_ — expected content repetition, not a refactor target.
- `PublishingService.svelte.ts` (575 lines) — no significant internal
  repetition; cohesive method list, not god-file-shaped.

### Ranking

1. Wire up the already-existing, currently-unused `debounce()` util in
   `registry.ts` + `layout-ui.svelte.ts` — dead code already exists,
   near-zero risk.
2. Extract `extractJsonFromModelResponse()` for the 3 regex/`JSON.parse`
   sites — small, mechanical, localized to `services/ai/`.
3. Unify `client-manager.ts`'s `cloneRequestPayload` with `safeSnapshot` —
   trivial, one file.
4. Extract `retryWithBackoff`/`waitUntil` helpers for the 3 retry loops —
   more valuable long-term, needs per-site care.
5. Extend the shared debounce util for keyed/per-id use in
   `entity-persistence.ts` — highest complexity, do last.

---

## Overall priority across all three areas

Ordered by (impact × safety), collapsing the sub-rankings above:

1. **`random-utils.ts` in generator-engine** (§1.1, §1.2, §1.4) — ~250 lines
   removed across 11 files, zero behavior risk.
2. **Wire up the orphaned `debounce()` util** (§3.1, first two call sites) —
   dead code already exists, just needs adoption.
3. **`extractJsonFromModelResponse()` / `parseFencedJson()`** — two versions
   of the same need, one in generator-engine (§1.3) and one in AI services
   (§3.4); could even share one implementation if the two packages already
   depend on each other, otherwise duplicate the one small util per package.
4. **Modal shell extraction** (§2.1) — biggest UI win, also closes an a11y
   gap (missing focus traps) as a side effect.
5. **Confirmation dialog consolidation** (§2.3) and **glow frame** (§2.2) —
   small, safe, mechanical.
6. **EmptyState adoption** (§2.4) — small, safe.
7. **`client-manager.ts` clone unification** (§3.3) — trivial.
8. **Retry/backoff helper extraction** (§3.2) — valuable but each site
   needs individual care.
9. **Kingdom/Nation consolidation** (§1.5) — flag as a follow-up ticket;
   needs a product/design decision, not a pure mechanical refactor.
10. **Spinner unification** (§2.5) — needs more investigation first.

This was a research pass only — no code was changed while producing this
report.
