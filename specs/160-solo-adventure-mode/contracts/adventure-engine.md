# Contract: `@codex/adventure-engine`

The engine is browser-independent domain logic. It must not import Svelte,
Dexie, OPFS, the Gemini/OpenAI SDKs, or vault stores.

## Public API

```ts
export function parseAdventureSession(input: unknown): AdventureSession;

export function parseTurnProposal(input: unknown): AdventureTurnProposal;

export function prepareTurn(input: PrepareTurnInput): PreparedAdventureTurn;

export function applyCompletedTurn(
  session: AdventureSession,
  proposal: CompletedTurnProposal,
  meta: CommitMetadata,
): Result<AdventureSession, AdventureValidationError[]>;

export function applyRollRequest(
  session: AdventureSession,
  proposal: RollRequiredProposal,
  meta: CommitMetadata,
): Result<AdventureSession, AdventureValidationError[]>;

export function dismissPendingRoll(
  session: AdventureSession,
  inputId: string,
  meta: CommitMetadata,
): Result<AdventureSession, AdventureValidationError[]>;

export function recordPendingRollOutcome(
  session: AdventureSession,
  inputId: string,
  outcome: SuppliedRollOutcome,
  meta: CommitMetadata,
): Result<AdventureSession, AdventureValidationError[]>;

export function createPlayerTranscript(
  session: AdventureSession,
): PlayerTranscript;

export function detectHiddenLeakage(
  session: AdventureSession,
  proposal: AdventureTurnProposal,
): HiddenLeakageFinding[];
```

## Behavioral Guarantees

- Inputs are never mutated.
- A failure returns no candidate session.
- A completed proposal creates exactly one committed turn and increments the
  revision exactly once.
- Reusing an `inputId`, turn ID, or consumed roll outcome is rejected.
- A roll-required proposal creates/replaces no visible or hidden world state;
  it only persists `pendingRoll` and optional safe setup narration.
- Only explicitly named secret IDs may become revealed.
- `createPlayerTranscript` has no hidden-state fields in its type or runtime
  object graph.
- Patch operations are deterministic and preserve unrelated facts.
- Individual state text, collection counts, and the 32,000-character aggregate
  serialized-state ceiling are enforced after the complete patch is applied.
- A supplied roll outcome is persisted in `PendingRoll` before resolution,
  cannot be replaced or dismissed, and moves to exactly one committed turn.
- Date, ID, and budget decisions come from inputs or injected ports, never
  ambient globals.

## Error Categories

`invalid-schema`, `invalid-transition`, `duplicate-input`, `unknown-fact`,
`conflicting-patch`, `unknown-secret`, `hidden-leakage`, `canon-conflict`,
`invalid-roll`, `state-budget-exceeded`, and `incompatible-version`.

Every error has a safe user-facing summary and an optional developer detail.
Developer detail must not include hidden-state text.
