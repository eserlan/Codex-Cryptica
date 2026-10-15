# Quickstart & Verification Guide: ToV Generator Mechanics

**Feature**: [spec.md](./spec.md)  
**Date**: 2026-10-15  
**Status**: Completed

This guide provides step-by-step instructions for running and verifying Tales of the Valiant mechanics integration across generators, stat sheets, and vault persistence.

---

## 1. Targeted Unit & Integration Tests

Run the impacted tests using Bun:

```bash
bun run test:changed
```

To run the dedicated generator and stat sheet tests directly:

```bash
# Test generator registry, prompt building, and output mapping
bun test packages/generator-engine/tests/campaign-generator-registry.test.ts
bun test packages/generator-engine/tests/public-npc.test.ts
bun test packages/generator-engine/tests/public-creature.test.ts

# Test stat sheet mapping from ToV mechanics
bun test packages/stat-sheet-engine/tests/tov-generator-mapping.test.ts

# Test web components and form reactivity
bun test apps/web/src/lib/components/generators/GeneratorConfigForm.test.ts
bun test apps/web/src/lib/components/generators/CampaignGeneratorModal.test.ts
```

---

## 2. Manual Verification Scenarios

### Scenario A: In-App Campaign NPC Generator with Vault Profile

1. Open a campaign vault and ensure its System Profile is set to **Tales of the Valiant** in Vault Settings.
2. Open the in-app generator (`CampaignGeneratorModal`) and select the **NPC** generator.
3. Verify that **Game System** is pre-selected as **Tales of the Valiant**.
4. Leave **Stat Detail** on **Quick NPC (CR)** and click **Generate**.
5. Inspect the generated draft:
   - Verify narrative sections (appearance, backstory, motivation) are populated.
   - Verify that the mechanics section displays HP, AC, CR, and an attack action.
6. Click **Save to Vault**:
   - Verify the entity is created in the vault.
   - Open the entity sheet and confirm the `builtin-tov-npc` stat sheet is attached.
   - Click the attack formula (e.g. `1d20+4`) and verify that a roll is dispatched to `diceRollerService`.

### Scenario B: Creature Generator with Bespoke Abilities (Homebrew Notice)

1. Open the **Creature** generator.
2. Select **Tales of the Valiant** and enter instructions: _"A crystalline spider that weaves web traps out of resonance glass."_
3. Click **Generate**.
4. In the review panel, verify that standard stats (AC, HP, CR, PB) are calculated.
5. Verify that any unique or homebrew resonance glass traits are visually badged with a **GM Review / Homebrew** indicator.
6. Save to vault and open the token in VTT mode: verify HP counter, Doom counter, and actions are rendered properly.

### Scenario C: Public SEO Generator Handoff

1. Navigate in a browser to `/generators/npc` while logged out.
2. Change the **Game System** dropdown from **System Neutral** to **Tales of the Valiant**.
3. Click **Generate**.
4. Verify the output card includes both the narrative block and the ToV stat block.
5. Click **Copy**: verify markdown on the clipboard includes the formatted ToV statistics.
6. Click **Save to Campaign**: verify the draft is saved to transient storage (`__codex_pending_import`) and successfully imports with its stat sheet upon entering a vault.

### Scenario D: Graceful Fallback (AI Disabled)

1. In Settings, disable AI (or simulate offline network).
2. Open the Creature generator with Tales of the Valiant selected.
3. Click **Generate**:
   - Verify the generator completes successfully using deterministic random tables.
   - Verify that standard system-neutral lore is generated.
   - Verify an informational notice appears: _"Tales of the Valiant mechanics require AI mode. Generated in System Neutral mode."_
