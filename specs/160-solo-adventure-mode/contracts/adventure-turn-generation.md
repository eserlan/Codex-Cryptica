# Contract: Adventure Turn Structured Generation

Adventure generation uses the existing Oracle proxy operation
`structured-generation`. It uses the stateless operation request shape
(`operation`, `messages`, `schema`) rather than the Interactions request shape;
it sends no `input`, `previous_interaction_id`, or conversation-storage field.

## Request

```ts
interface AdventureTurnGenerationRequest {
  requestId: string;
  sessionId: string;
  expectedRevision: number;
  phase: "action" | "roll-resolution" | "opening";
  playerCharacter: PlayerCharacterPromptView;
  visibleState: VisibleAdventureState;
  hiddenState: HiddenAdventureState;
  provisionalFacts: ProvisionalFact[];
  sourceExcerpts: ResolvedSourceExcerpt[];
  recentTurns: PlayerTranscriptTurn[];
  playerAction?: string;
  rollResolution?: SuppliedRollOutcome;
}
```

Only the dedicated Adventure worker method can construct this request. Normal
Oracle services cannot access `hiddenState` or `provisionalFacts`.

The serialized request is capped at 96,000 characters. Behavior/schema uses up
to 16,000, complete state plus current input/outcome up to 36,000, anchors up to
24,000, relevant excerpts up to 12,000, and recent transcript up to 8,000.
Complete state is never truncated; schema validation prevents it from exceeding
its reserved section.

## Response

```ts
type AdventureTurnProposal =
  | {
      kind: "complete";
      narration: string;
      visiblePatch: VisibleStatePatch;
      hiddenPatch: HiddenStatePatch;
      revealSecretIds: string[];
      provisionalFacts: ProposedProvisionalFact[];
      sourceRecordIds: string[];
    }
  | {
      kind: "roll-required";
      setupNarration?: string;
      uncertainty: string;
      stakes: string;
      dice?: {
        expression: string;
        outcomeBands: OutcomeBand[];
      };
      sourceRecordIds: string[];
    };
```

The JSON Schema uses a discriminated union: complete proposals cannot contain a
roll request, and roll-required proposals cannot contain world-state patches or
reveal IDs.

## Generation behavior

- Oracle controls situations, NPCs, factions, and consequences, never the player
  character's voluntary actions, dialogue, decisions, thoughts, or feelings.
- Canonical excerpts override provisional conflicts.
- A roll is requested only when uncertainty and meaningful stakes both exist.
- Basic dice expressions and non-overlapping outcome bands are declared before
  rolling.
- A supplied roll outcome is authoritative and used once.
- Unrevealed hidden content may guide GM reasoning but cannot appear or be
  presented as player knowledge.
- Most completed responses end at an actionable situation or question.
- Output is JSON only and must match the supplied schema.

## Failure behavior

Transport failure, cancellation, invalid JSON, schema mismatch, invalid patch,
hidden leakage, stale revision, lost lease, or save failure produces no completed
turn. The manager retains the player's input and exposes retry/change-action.
Offline requests are not dispatched. Typed actions remain local, and a supplied
roll outcome remains durably `ready-to-resolve` for the same retry after
reconnection.

## Context isolation

- Operation: `structured-generation`.
- Request shape contains `messages` and `schema`, never Interactions `input`,
  `previous_interaction_id`, or `store`.
- No normal Oracle history is included.
- No output enters normal Oracle history.
- No proactive discovery, automatic archival, or drafting event is emitted.
- Requests and logs must redact prompt bodies and hidden-state content.
