# Quickstart: Die Rolling Support (066-die-rolling)

## Using the Dice Engine

To perform a roll programmatically:

```typescript
import { diceEngine } from "@codex/dice-engine";

const result = diceEngine.evaluate("2d20kh1 + 5");
console.log(result.total); // Final sum
console.log(result.parts[0].rolls); // Individual dice results
```

## Oracle Command

Type `/roll [formula]` in the Oracle chat:

- `/roll 1d20`
- `/roll 2d6 + 4`
- `/roll 2d20kh1 + 5` (Roll with advantage)
- `/roll 4d6!` (Exploding dice)

## Die Roller Modal

Click the **Dice Icon** in the sidebar (or use a shortcut) to open the interactive die roller.

- **Quick Roll**: Click any die button (d4, d6, etc.) to roll instantly.
- **Accumulator**: Click a button multiple times quickly to roll multiple dice (e.g. 3 clicks on d6 = 3d6).
- **Reroll**: Hover over any result in the history and click the refresh icon to reroll that exact formula.
- **Custom Formula**: Enter a complex formula in the input field.

The Modal contains its own **Roll Log** which is independent of the main Oracle Chat history.
