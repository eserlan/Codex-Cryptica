# Quickstart & Verification Guide: ToV Encounter Guidance & Doom Tracking

## Verification Steps

### 1. Run Unit Tests (Changed Packages)

```bash
bun test packages/generator-engine/tests/public-encounter-tov.test.ts
bun test packages/stat-sheet-engine/tests/tov-doom.test.ts
bun test apps/web/src/lib/components/stats/TovDoomControl.test.ts
bun run test:changed
```

### 2. Run Changed Linting

```bash
bun run lint:changed
```

### 3. Verify Scoped Svelte Types

```bash
bunx svelte-check --tsconfig ./tsconfig.json --threshold error
```

### 4. Manual / Browser Verification

1. **Encounter Generator (In-App)**:
   - Configure campaign vault to Tales of the Valiant (`systemProfileStore`).
   - Open Encounter generator: verify `gameSystem` is "Tales of the Valiant (BFRD)", Party Size = 4, Average Level = 3.
   - Generate encounter: confirm narrative "What the Players See" is intact, and Mechanics preview renders qualitative difficulty, CR range, creature suggestions, and tactical advice.
   - Save to vault: verify the generated Note contains `### Game Mechanics & Challenge Guidance (Tales of the Valiant)`.
2. **Encounter Generator (System Neutral)**:
   - Switch `gameSystem` to "System Neutral": verify party options disappear and generation outputs clean neutral text with zero ToV stats.
3. **Doom Counter (Monster Sheet & VTT Token Allocation Tracking)**:
   - Open a VTT map with a token linked to a `builtin-tov-monster` stat sheet.
   - In `TokenQuickStats` or the monster stat sheet, verify `TovDoomControl` appears with Doom counter buttons (+ / -) and the expandable `How Doom Points work` reference explaining the encounter-level BFRD Doom rule and per-creature allocation tracking.
   - Click Spend / Gain Doom: verify the allocated value increments/decrements cleanly within [0, 10] range.
   - Select a token without the ToV Monster Doom field (e.g. neutral creature or player character): verify no Doom counter is displayed.
