# Research: shared grounding boundary

## Decision: app-level grounded generation coordinator

**Rationale:** `adventure-opening.ts`, `adventure-actions.ts` and `adventure-rolls.ts` currently perform inconsistent retrieval. `adventure-generation.svelte.ts` is the common direct/worker transport adapter; `adventure-dependencies.ts` injects transport and context independently. Add a constructor-injected coordinator immediately before transport; callers submit intent/session rather than trusted caller-built excerpts. Keep Vault access in the app. Pure context policy/types and budgets belong in the existing adventure-engine.

**Alternatives:** Per-caller fixes leave bypass opportunities. Provider-level retrieval would couple Vault/browser dependencies into ai-engine and worker transport. A new package/vector store is unnecessary.

## Decision: fresh resolution first; no retrieval cache in this slice

**Rationale:** Current resolver has no reliable global Vault revision contract. Fresh bounded lookup satisfies validity requirements without speculative invalidation infrastructure. Existing retained provider interactions still require invalidation on changed source/disclosure/temporal scope; inspect and test their incremental-source behaviour.

**Alternatives:** Caching by session revision alone misses Vault edits; caching arbitrary excerpts risks stale secrets and chronology.

## Decision: fail closed with safe retry

**Rationale:** No requirement for an automatic degraded-generation mode. Successful empty results are valid; storage/search failures block provider calls, preserve input and use existing error/retry handling. Check abort/staleness after retrieval and before transport/save.

## Reused foundations

`AdventureContextService` implements anchor, opening, action and temporal lookup. AdventureSurface wires local Vault record loading/search. Temporal policies already distinguish uncertain/future facts; normal opening/action parity must be checked. Current prompt includes provisionalFacts and canonical precedence. Background preparation is an additional production AI path to inventory, not an exemption.

## Clarifications after review

`allocatePromptBudget` already bounds final prompt sections and serialized size. Reuse it; the retrieval cap bounds unique hydrated candidate records, not a replacement text allocator. The Vault stores per-entity `updatedAt`, but inspection did not establish a reliable vault-wide revision signal; clearing retained interactions on each new request avoids stale provider history, without claiming atomic reads. Missing explicitly selected canonical records are recoverable errors. Background grounding errors propagate; optional rumour generation failure after successful grounding retains its existing local fallback. Deterministic projection tests and probabilistic model evaluation are separate.

## Implemented boundary and validation

Fallow guard reports no additional import/call restrictions for the scoped app services or existing engine packages. The runtime, rather than the dependency factory, installs the coordinator because it owns current Vault/session/revision, read-only state and lease control. Validation repeats before persistence. The optional commit hooks remain unexecuted.

The background path now builds only from prepared Adventure context, bypassing the general campaign builder that can sample current-world lore and swallow search failures. The existing final prompt allocator is reused. Required sources cannot silently lose essential text through final allocation. Relevant future/uncertain/hidden records may reach the GM only with their applicability/disclosure labels; this does not make them character knowledge. Provider history resets at every new request, while response repair remains within the prepared request. Pending roll action, uncertainty, stakes and supplied outcome are explicitly carried in state so they survive that reset.
