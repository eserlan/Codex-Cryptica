# Research: Die Rolling Support (066-die-rolling)

## Dice Parsing & Logic

### Decision: Custom Lightweight Parser

**Rationale**: The requirements (AdX, modifiers, kh/kl, exploding) are well-defined and can be handled by a small, dedicated parser without the overhead of a large library. This aligns with the "Simplicity & YAGNI" principle and keeps the `dice-engine` package focused.
**Alternatives Considered**:

- `rpg-dice-roller`: Feature-rich but large (80KB+). Includes many features we don't need (fate dice, complex sorting).
- `dice-roller-parser`: Good middle ground, but still requires a dependency for a relatively simple grammar.

### Decision: Parser Implementation Strategy

- Use a simple Lexer/Parser pattern or a robust Regex for basic formulas.
- Support:
  - `(\d+)?d(\d+)(!)?`: Dice count, sides, exploding.
  - `(kh|kl)(\d+)?`: Keep highest/lowest.
  - `[+-]\s*\d+`: Modifiers.
- **Randomization**: Use `crypto.getRandomValues()` for cryptographic security, ensuring "fairness" as per FR-007.

## Oracle Integration

### Decision: Intercept in `OracleStore.ask`

- Add `/roll` detection in `handleRestrictedCommand` and the main `ask` loop.
- **Outcome**: A roll initiated via `/roll` will append a `ChatMessage` with `role: "system"` or a new `type: "roll"`.
- **Constraint**: Results must show individual dice (FR-008).

## UI/UX: Modal Roller

### Decision: New `DiceModal` Component

- Triggered via a new icon in the sidebar or a command like `/dice`.
- Contains:
  - Quick-roll buttons for d4, d6, d8, d10, d12, d20, d100.
  - Custom formula input.
  - Internal scrollable log for results.
- **Outcome**: Keeps the "Modal vs Chat" context separation requested in User Story 3.

## Data Persistence

### Decision: Session-Only Persistence

- Roll history will be stored in a Svelte store (`dice-history.svelte.ts`).
- For long-term session persistence (refresh safety), it can be mirrored to `sessionStorage` or a temporary IndexedDB table.
- **Note**: The spec says "accessible for the duration of the active session," so no need for permanent vault storage.
