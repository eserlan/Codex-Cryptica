# ADR 021: Adventure sources, playthrough state, and Oracle canon

- **Status:** Accepted design direction (implementation is incremental)
- **Decision date:** 2026-11-15
- **Related:** [Adventure import slice #4832](https://github.com/eserlan/Codex-Cryptica/issues/4832), [PR #4844](https://github.com/eserlan/Codex-Cryptica/pull/4844), [Adventure runner #4813](https://github.com/eserlan/Codex-Cryptica/issues/4813), [Progression controller #4814](https://github.com/eserlan/Codex-Cryptica/issues/4814)

## Context

The Oracle should run imported/published adventures within a user's existing Vault without corrupting the authored source, collapsing independent playthroughs into one history, or quietly rewriting established world facts. Humans decide product and plot-critical compromises; routine adaptation and continuity tracking should not require constant GM approval.

These are **target architecture decisions**, not a declaration that current Adventure Mode already implements them. Slice #4832 / PR #4844 concerns the deterministic, offline Markdown source-package foundation only; review UI, other import formats, running turns, AI analysis and continuity integration belong to later work.

## Decisions

### 1. Source and playthrough are different records

- Preserve an **immutable, versioned adventure source package** containing the imported material, source IDs, citations, extracted structure and provenance. Multiple playthroughs may reference the same package.
- Store its **evolving state separately per playthrough/campaign**: decisions, discovered facts, active situations, outcomes and adaptations. Never overwrite the authored source with generated or played material.
- The approved proposed package path for the import foundation is `.codex/adventures/packages/<documentHash>.json` in local-first Vault storage. This path is *not* a mandate for cloud sync; any remote backup/sync remains governed by explicit consent under Constitution V.
- Treat the imported file's hash as the source identity, not as the identity of any campaign or continuity.

### 2. Facts have truth, visibility and provenance

- Persist established campaign observations and events automatically **within the appropriate campaign/continuity scope**; do not silently promote another playthrough's discoveries into this one.
- Distinguish observed/verified facts, unverified testimony or rumours, and hidden GM truths. Attach source/provenance, visibility and relevant time/scope to claims. An NPC claim is not automatically objective world truth.
- Oracle-invented content must be distinguishable from source-grounded material and from unresolved interpretations. Unknown or contradictory source information remains flagged rather than fabricated into a source fact.
- GM-only material must never be exposed to player-facing retrieval merely because it appears in a Markdown continuation or a generated summary; treat secret filtering as a strict boundary.

### 3. World canon takes precedence, without destroying the adventure

- Compare an imported adventure against **the selected Vault, campaign and world date**. Existing Vault canon outranks conflicting imported details *for that playthrough*; preserve the source intact and record any adaptation separately.
- The Oracle may independently resolve minor and safe, non-plot-critical inconsistencies. Escalate changes to plot-critical elements or changes that could break clue chains, character motives, causal dependencies or intended revelations.
- Keep published source details recognisable and traceable by citation. Oracle improvisation is allowed in the *playthrough*, not as a silent rewrite of the original adventure.

### 4. Analyse once; adapt per playthrough

- **Import stage:** Analyse the full authored adventure for scene structure, secrets, intended revelations, dependencies and ambiguous source material. Its reusable source representation is not tied to one specific Vault.
- **Preparation stage:** For each playthrough, analyse compatibility with the chosen Vault and timeline; propose/record an adaptation overlay. Resolve safe differences autonomously and escalate plot-critical conflicts before affected play.
- **Runtime:** Retrieve bounded, relevant scene excerpts; do not re-send the complete source at every turn. Re-evaluate new facts without violating past commitments.
- Stage-1 deterministic parsing in PR #4844 is narrower than a full dependency/compatibility analysis. No AI or network call is required for that import slice.

### 5. Established history is binding

- Once information is observed, revealed, or has causally affected an event, treat it as a commitment even if players do not yet know the secret.
- Uncommitted preparations and unrevealed plans may change when circumstances evolve, but the Oracle must preserve causal consistency. Plot-critical revision requires GM approval.
- Keep a reversible/provenance-aware event and adaptation history so users can inspect what happened; this is a design requirement for later slices, not a claim of present storage support.

### 6. Campaigns and world continuities are distinct

- Campaign/playthrough timelines are **isolated by default**.
- The GM may explicitly associate multiple campaigns with one shared world continuity so compatible established world events can matter across them.
- A fresh playthrough of the same adventure must not inherit another playthrough's evolving state merely because they share a source package.

## Open design question (not approved yet)

When two opted-in campaigns in a shared continuity establish incompatible events at different in-world dates, the exact conflict-resolution policy is **undecided**. A chronological event log with GM arbitration for genuine contradictions was proposed, but **not selected**. Do not silently choose first-writer-wins, automatic continuity forks, or invented retcons as settled policy.

## Consequences and implementation boundaries

- Keep source packages immutable and their content-addressed identity separate from per-playthrough state and world-continuity identity.
- Include explicit provenance and GM/player visibility checks at parser, retrieval, context-assembly and presentation boundaries.
- Design future import review, Oracle runner, progression and world-state work around these boundaries; don't expand PR #4844 beyond its slice.
- **Current deployed behaviour may differ.** The existing [Adventure Mode help](../../apps/web/src/lib/content/help/adventure-mode.md) describes provisional invented material that users review before promotion; update that user-facing help only when automatic campaign-canon persistence is actually implemented and verified.
