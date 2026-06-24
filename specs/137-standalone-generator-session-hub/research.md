# Phase 0 Research: Standalone Generator Session Hub

This phase resolves the three open assumptions from the spec plus the key architectural choices surfaced by inspecting the existing code.

## Existing foundation (what we build on)

- **`apps/web/src/lib/services/seo/session-context.ts`** — `SESSION_DRAFTS_KEY = "__codex_session_drafts"`; `getSessionContext()` reads up to 8 drafts from `sessionStorage` and renders a prompt fragment ("Existing campaign elements created this session — weave in references…").
- **`apps/web/src/lib/components/seo/SEOGeneratorLayout.svelte`** — holds `sessionDrafts` state, `addToSessionHub()` (opt-in via "Link to Hub"), `removeFromSessionHub()`, `clearSessionHub()`, `handleSaveAllToCodex()`, and the "Session Hub" widget UI. Persists to `sessionStorage`.
- **`apps/web/src/lib/services/seo/generator-engine.ts`** — every `generate*` prompt builder already calls `getSessionContext()` and injects it.
- **`apps/web/src/lib/services/seo/import-handler.ts`** — `SeoImportService` saves an array of drafts into a vault (creates entities + connections), via the `__codex_pending_import` localStorage handoff.
- **Public `GeneratorOutput`** (`generator-helpers.ts`) carries `type, title, summary, content, lore, labels, status` — **no structured `connections`** (that exists only on the in-vault package output `GeneratorOutput`/`SuggestedConnection`).

**Implication**: ~50% of #1524 already ships (session list, opt-in reuse-as-context, save-all). The work is the delta: per-entity reuse toggle, provenance, review, save single/subset, session-vs-vault distinction — plus a Library-First extraction.

---

## Decision 1 — Default reuse state (FR-009)

**Decision**: Newly generated entities are added to the session list automatically and default to **"Use in future generations" = ON, visibly**, with a one-tap toggle to pause. This replaces today's opt-in "Link to Hub" gesture for _list membership_, while keeping an explicit toggle for _reuse_.

**Rationale**: Matches the spec's "generous but visible" guidance (Assumptions) and the issue's connected-mini-world goal — the settlement → faction → NPC flow works without the user discovering a "Link to Hub" button first. The toggle keeps the user in control ("do not use this yet"). Visibility prevents the surprise of silent reuse.

**Alternatives considered**:

- _Keep opt-in (must click to add)_ — current behavior; rejected because it makes the headline "build on each other" value depend on discovering a button, and the issue explicitly lists generous defaults as acceptable.
- _Add to list but default reuse OFF (opt-in reuse)_ — rejected as the primary default (more friction for the core flow) but retained as a possible setting; the toggle exists either way.

**Open for `/speckit-clarify`**: whether list membership should still require an explicit "keep" action, or be automatic with easy dismissal.

---

## Decision 2 — Provenance detection: "actually used" (FR-008, FR-010, US3)

**Decision**: Detect used session entities **post-hoc** by matching the titles of the entities that were _offered as context_ against the generated output text (`title` + `summary` + `content` + `lore`), using normalized exact/whole-word matching. Display "Used: …" only for entities whose title is found. No new structured AI output is required for v1.

**Rationale**:

- The public generator output has no `connections` field, so the in-vault structured-connection approach is unavailable without touching every `public-*.ts` generator and parser (heavy; violates YAGNI).
- The session context already instructs the model to "weave in references"; a reference that lands in the output is, by the spec's definition, an entity "actually used". Matching offered titles in the output yields true-usage provenance (not merely the offered set, satisfying FR-008/Acceptance #4).
- Cheap, uniform across all 16 generators, fully client-side, and the matcher is a pure function → easily unit-tested and reusable by #1525.

**Refinement / risk handling**:

- Normalize (case-fold, strip punctuation, collapse whitespace); require whole-word/title boundary to avoid substring false positives (e.g. "Ash" in "Ashes").
- Ambiguity on duplicate titles handled by the data model (entities keyed by id; matching dedupes by title).
- **Optional enhancement (deferred, not v1)**: append a machine-readable "Referenced: <titles>" hint line to the session-context prompt and parse it, falling back to title-matching. Recorded as a future improvement, not required to satisfy the spec.

**Alternatives considered**:

- _Show the offered set as "Used"_ — rejected; spec requires actual usage, not what was offered.
- _Structured `connections` for public generators_ — rejected for v1 (large surface change across generators/parsers; the in-vault path already owns structured connections).
- _Embedding/semantic similarity_ — rejected (overkill, non-deterministic, hard to test; violates Simplicity).

---

## Decision 3 — Session lifetime / persistence (FR-012)

**Decision**: Continue using **`sessionStorage`** keyed by `SESSION_DRAFTS_KEY`. The session persists across reloads and navigation between standalone generator pages within the same tab/browsing session, and is naturally discarded when the tab/session ends. Not account- or device-bound.

**Rationale**: Already implemented and matches the spec assumption exactly (single browsing session, not permanent). `sessionStorage` is per-tab which fits "this session". Graceful degradation already present (try/catch → in-memory for the page when storage is blocked).

**Alternatives considered**:

- _`localStorage`_ — rejected; would persist across unrelated visits and leak one "session" into another, contradicting the temporary-session framing.
- _In-memory only_ — rejected; loses the hub on reload, failing the "review previously generated" promise after refresh.

---

## Decision 4 — Reuse the engine `GeneratorSession`, or the lightweight `sessionStorage` hub?

**Decision**: **Lightweight `sessionStorage` hub**, extracted into a DI store. Do not adopt the package's `GeneratorSession`/`LoreDeltaTracker`/interaction-id machinery for the standalone path.

**Rationale**: `GeneratorSession` is built around the stateful AI _interaction_ API (previous-interaction-id replay, lore delta partitioning) used by the in-vault `CampaignGeneratorService`. The public generators are stateless single calls with a text-context fragment. Pulling in that machinery would be over-engineering (Principle III). Instead, the **pure helpers** (provenance matcher, context budgeting) go into the package so both paths converge on shared logic without sharing the heavyweight session object.

---

## Decision 5 — Context budgeting / large sessions (FR-011)

**Decision**: When the set of reuse-flagged entities exceeds a bounded budget (today's hard cap is `slice(0, 8)`), select a **prioritized subset** (most recent first, with any user-pinned entities kept) and surface a lightweight, non-blocking notice that not all session entities were used as context. Encapsulate selection in a pure, tested `generator-engine` helper.

**Rationale**: The current silent `slice(0, 8)` violates FR-011's "must not silently produce a degraded generation". Recency-first preserves the connected-flow intuition; pinning lets the user force-keep key anchors. Bounded payload protects prompt size/cost.

**Alternatives considered**:

- _No cap (send everything)_ — rejected; unbounded prompt growth, cost, and quality degradation.
- _Silent cap (status quo)_ — rejected per FR-011.
- _Token-accurate budgeting_ — deferred; entity-count + char-length heuristic is sufficient and simpler for v1.

---

## Decision 6 — Save single / selected subset (FR-014)

**Decision**: Extend `SeoImportService` / the save flow to accept a chosen list of session entities (one, a selected subset, or all). The existing `handleSaveAllToCodex()` becomes a special case ("all"). Per-entity and multi-select selection drive the `__codex_pending_import` payload.

**Rationale**: Save-all already works end-to-end; single/subset is a payload-scoping change plus selection UI, not a new persistence path. Relationship preservation between saved entities (FR-015) reuses the import-handler's existing connection creation, scoped to the saved subset.

---

## Session-vs-vault distinction (FR-013)

**Decision**: Treat this as a presentation requirement met by labeling and styling — session entities live under explicit "This session / Generated so far" headings with a distinct visual treatment (e.g. a "session" chip/badge), clearly separated from any vault concepts the save flow introduces. No data-model ambiguity exists in the standalone path because there is no vault context present; the requirement is satisfied by copy + styling and by never mislabeling a session entity as saved.

---

## Summary of resolved unknowns

| Topic                | Resolution                                                          |
| -------------------- | ------------------------------------------------------------------- |
| Default reuse state  | Auto-added, reuse ON by default, visible per-entity toggle          |
| Provenance mechanism | Post-hoc title matching of offered entities in output (pure helper) |
| Session lifetime     | `sessionStorage`, single browsing session (status quo)              |
| Session object       | Lightweight DI store; do not adopt engine `GeneratorSession`        |
| Large context        | Recency-first prioritized subset + visible notice                   |
| Save scope           | Extend import to single/subset/all                                  |
| Session-vs-vault     | Copy + styling; no data ambiguity in standalone path                |

No `NEEDS CLARIFICATION` markers remain that block Phase 1. The two items worth confirming in `/speckit-clarify` are Decision 1 (default membership/reuse) and, secondarily, whether the optional structured-reference prompt hint (Decision 2 enhancement) should be in scope.
