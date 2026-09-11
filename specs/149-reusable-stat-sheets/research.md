# Research: Lightweight Reusable Stat Sheets (149-reusable-stat-sheets)

## Research Topic 1: YAML Frontmatter Data Schema & Serialization

### Decision

Store `statSheet` directly inside the entity YAML frontmatter header as a structured object:

```yaml
statSheet:
  templateId: "dnd-5e-npc"
  fields:
    - id: "hp"
      label: "Hit Points"
      type: "counter"
      value: 24
      min: 0
      max: 50
    - id: "ac"
      label: "Armor Class"
      type: "number"
      value: 15
    - id: "atk"
      label: "Longsword Attack"
      type: "dice"
      formula: "1d20+5"
    - id: "sec_combat"
      label: "Combat Stats"
      type: "heading"
      value: true
```

### Rationale

- Integrates seamlessly with existing `@codex/vault-engine` YAML frontmatter parsing and single-file Markdown architecture.
- Keeps entity notes fully portable as standalone Markdown files containing both lore text and tabular game state.

---

## Research Topic 2: Template Storage & Vault Registry

### Decision

Implement a `StatSheetTemplateStore` (`apps/web/src/lib/stores/stat-sheet-templates.svelte.ts`) using IndexedDB (`idb`) with fallback to local vault config directory (`.codex/templates/statsheets/`).

### Rationale

- Vault-scoped templates ensure custom stat sheet layouts travel with campaign vaults when syncing or switching campaigns.
- Built-in default templates (e.g. "Generic RPG Character", "NPC Quick Stats", "Ship Systems", "Settlement Overview") will be bundled out-of-the-box in `@codex/schema` / generator engine defaults.

---

## Research Topic 3: Dice Expression Execution & VTT Broadcast

### Decision

Wire the 1-tap roll button on `Dice` stat fields directly to `diceRollerService.roll(formula)` in `apps/web/src/lib/services/dice-roller.svelte.ts`. If an active P2P VTT session is open (`vttSessionService.isConnected`), forward the roll result payload to the session log.

### Rationale

- Reuses existing dice rolling infrastructure and VTT P2P messaging bus without duplicating dice evaluation logic (Principle III: Simplicity & YAGNI).
- Provides instant tabletop feedback in < 50ms without modal popups.
