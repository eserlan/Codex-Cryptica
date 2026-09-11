# Contract: faction turn AI service

**Feature**: 161-faction-turn-influence
**Location**: `packages/ai-engine/src/faction-turn-generation.service.ts`

Modelled on `adventure-turn-generation.service.ts` (research R5), with one deliberate divergence: **this service never throws.** The adventure service raises `invalid-adventure-response` on malformed output; here every failure mode must collapse to a benign fallback, because FR-021c and FR-021d require the turn to resolve regardless.

---

## Request

```ts
export interface FactionTurnAiRequest {
  factionTitle: string;
  factionSummary: string; // short lore excerpt
  targetTitle: string;
  targetSummary: string;
  resolution: FactionResolution; // includes mechanicalBand and permittedBands
  existingHold: { factionTitle: string; strength: number }[];
  wantBandSelection: boolean; // FR-021f
  wantNarration: boolean; // FR-021f
  signal?: AbortSignal;
}
```

The model receives the roll, the margin, the opposition provenance and the existing holds — it is _interpreting_ the dice, not replacing them.

## Response

```ts
export interface FactionTurnAiResult {
  band: OutcomeBandId | null; // null when unavailable, disabled, or invalid
  reason: string | null;
  narrative: string | null; // null ⇒ caller uses the template
  aiUsed: boolean;
}
```

## Method

```ts
/**
 * How long to wait for the provider before falling back to the mechanical
 * band and template narration (FR-021d).
 *
 * THIS IS THE ONE PLACE TO CHANGE THE TIMEOUT. It is deliberately a named
 * export rather than an inline default so tuning it is a one-line edit that
 * grep finds immediately.
 *
 * 8s rationale: oracle-proxy allows providers up to 60s for long generative
 * work, which is far too long to block a GM mid-turn. A band choice plus two
 * sentences is a small completion; 8s covers a normal round trip with headroom
 * while the interaction still feels synchronous.
 */
export const FACTION_AI_TIMEOUT_MS = 8000;

export class FactionTurnGenerationService {
  constructor(deps?: { client?: FactionAiClient; timeoutMs?: number });
  generate(request: FactionTurnAiRequest): Promise<FactionTurnAiResult>;
}
```

**Timeout override order** (first one set wins):

1. `deps.timeoutMs` passed to the constructor — used by tests and by the store if it ever needs a different budget.
2. `FACTION_AI_TIMEOUT_MS` — the shipped default, and the single line to edit.

Promoting the timeout to a per-vault setting is deliberately **not** done: a timeout dial is implementation jargon in a GM-facing settings panel (Principle IX). If real usage shows 8s is wrong for some providers, the honest fix is changing the constant, not asking GMs to tune milliseconds. The DI seam means that decision can be revisited without touching call sites.

---

## Behavioural contract

| Condition                                              | Result                                                                                  |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| Both flags false                                       | Resolves immediately with all-null, `aiUsed: false`. No network call.                   |
| Provider unreachable / rate-limited / 5xx              | All-null, `aiUsed: false`. No throw, no user-facing error.                              |
| Timeout (`FACTION_AI_TIMEOUT_MS`, default **8000 ms**) | All-null, `aiUsed: false`. Request aborted via `AbortSignal`.                           |
| Malformed or unparseable JSON                          | All-null, `aiUsed: false`.                                                              |
| `band` outside `permittedBands`                        | `band: null`; narration kept if valid. Range enforcement is the engine's `applyAiBand`. |
| Narration present but band invalid                     | Narration used, band mechanical. The two are independent.                               |
| Success                                                | Populated fields, `aiUsed: true`.                                                       |

**The service never rejects.** Callers do not need a try/catch; a rejected promise would be a contract violation.

---

## Provider schema

Forwarded through `aiClientManager` so the provider returns structured JSON (research R5):

```ts
{
  type: "object",
  properties: {
    band: { type: "string", enum: [/* the five ids */] },
    reason: { type: "string", maxLength: 240 },
    narrative: { type: "string", maxLength: 600 },
  },
  required: ["narrative"],
}
```

`band` is optional in the schema — a model declining to move it is a normal outcome, not an error.

**The schema is not sufficient validation.** It can constrain `band` to the five ids but cannot express "within one band of a value computed this turn". `applyAiBand` remains the enforcement point.

---

## Prompt requirements

- State the mechanical band and that it may be moved **at most one step**, with a reason grounded in the situation rather than the dice.
- Supply the roll and margin so narration reflects a narrow win differently from a rout.
- Forbid inventing entities, dates, or numbers. Narrative is prose about a resolved result, never a source of state.
- Keep narration to two or three sentences (Principle IX: plain, approachable language).

---

## Privacy note

Faction and target titles plus short summaries leave the device when AI is enabled. This is consistent with existing Oracle features, and both switches default-on but are independently disableable (FR-021f). Principle V's local-first preference is honoured by the feature remaining fully functional with both off.
