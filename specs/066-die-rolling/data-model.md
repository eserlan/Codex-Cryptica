# Data Model: Die Rolling Support (066-die-rolling)

## Entities

### `RollCommand`

Represents the request to roll dice.

- `id`: `string` (UUID)
- `formula`: `string` (e.g., "2d20kh1 + 5")
- `parts`: `RollPart[]` (Parsed structure)
- `timestamp`: `number` (Epoch ms)

### `RollPart`

Individual components of a roll formula.

- `type`: `"dice" | "modifier"`
- `count`: `number` (for `dice`)
- `sides`: `number` (for `dice`)
- `value`: `number` (for `modifier`)
- `options`: `RollOptions` (for `dice`)

### `RollOptions`

Advanced logic flags.

- `exploding`: `boolean`
- `keepHighest`: `number | null` (count of dice to keep)
- `keepLowest`: `number | null` (count of dice to keep)

### `RollResult`

The outcome of a roll command.

- `id`: `string` (UUID)
- `commandId`: `string`
- `total`: `number`
- `details`: `RollDetail[]` (Individual results for each `RollPart`)
- `context`: `"chat" | "modal"`
- `timestamp`: `number`

### `RollDetail`

- `partIndex`: `number`
- `rolls`: `number[]` (Individual die results)
- `dropped`: `number[]` (Results dropped by kh/kl)
- `modifier`: `number` (If part is a modifier)

## State Transitions

1. **INPUT**: User enters formula or clicks button.
2. **PARSE**: Formula string converted to `RollCommand`.
3. **EXECUTE**: `dice-engine` processes command, generates `RollResult` using `crypto.getRandomValues`.
4. **STORE**: `RollResult` added to `dice-history` store.
5. **DISPLAY**: Result rendered in Oracle chat or Modal log based on context.
