# Internal grounding contract and entry-point inventory

All production play AI calls must prepare local context before provider dispatch. Low-level ai-engine and generator-engine remain reusable transports; app callers cannot treat them as a grounding bypass. Stubs/evaluation-only direct calls are explicitly marked and separately tested.

| Entry point                                                    | Current provider path                                                                        | Required preparation                                                        |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| adventure-opening.ts                                           | generation.generate → direct/worker                                                          | Opening/world-entry, canonical anchors and scene context                    |
| adventure-actions.ts                                           | generation.generate → direct/worker                                                          | Action/location, commitments and available provisional state                |
| adventure-rolls.ts                                             | generation.generate → direct/worker                                                          | Persisted originating action, supplied roll outcome, relevant world context |
| adventure-background.ts / AdventureSurface.svelte registration | grounding.prepare → createAdventureBackgroundRequest → backgroundRumourService.generateDraft | Background purpose, bounded location/date context and GM/player policy      |

## Boundary

The coordinator is installed by AdventureRuntime around both injected and default generation transport. Caller supplies session snapshot, purpose and action/roll inputs, not a trusted ready flag. Coordinator resolves through injected local context service. Only successful preparation constructs an envelope accepted for dispatch. A structural TypeScript brand alone is not a security boundary: production wiring and integration assertions verify provider calls cannot occur first. Worker receives plain prepared data; callbacks and cancellation stay in existing transport handling.

Ready-empty is permitted. Failed, cancelled, stale, required-source-unavailable and budget-overflow outcomes prohibit dispatch. No raw errors/lore in user messages or logs. Check authority/session validity before dispatch and again through existing commit validation. Missing optional search matches are omitted. A canonical character, starting location or source anchor explicitly selected for the session is required; missing records cause a recoverable unavailable-source outcome with guidance to restore the record or edit the selection. Do not silently turn that failure into a rumour fallback. After grounding succeeds, an optional generator error or malformed rumour may use the existing local fallback.

Preserve source IDs/roles, temporal classification and separate GM/player channels. GM instructions are allowed in GM generation context; player-facing projection must exclude them. Model-generated disclosure remains subject to existing validation and regression evaluation.

## Extension rule

Every future standalone summary, dialogue, elaboration, extraction or consequence AI call must add an inventory row, choose a purpose-aware context policy, route through shared preparation and add a success plus meaningful negative integration test. No speculative new call types are implemented solely for this issue.

## Budgets and freshness

Use limits in ../data-model.md. Freshly resolve each request. Retained provider conversation must be cleared before each new interaction until a reliable Vault-wide revision signal exists; reuse the same prepared snapshot for repairs only while still valid. Diagnostics use counts/durations/outcome codes, no source text.

Preparation failures use AdventureGroundingError with safe lookup/unavailable/budget codes; cancellation uses AbortError, and superseded scope uses a safe stale/control error. None constructs a ready envelope. Required sources also include a committed canonical current-location reference. Source records that become newly ranked during temporal reclassification remain deferred until the next interaction, preserving the hydration bound.

Inventory audit: AdventureEvaluationRunner is an explicit offline evaluation harness whose default generator throws until configured; it is not a production play entry point. oracle-bridge and oracle.worker only transport the already prepared turn request. Provisional entity extraction and suggestions currently occur within the turn request, not through additional AI calls.
