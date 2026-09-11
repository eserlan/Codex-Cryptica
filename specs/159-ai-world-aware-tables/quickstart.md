# Quickstart Guide: AI-Generated World-Aware Random Tables

**Feature**: `159-ai-world-aware-tables`  
**Date**: 2026-08-15  
**Spec**: [spec.md](./spec.md)

---

## 1. Generating a Table from Scratch

1. Navigate to **Random Sources** (`/random` or sidebar tool).
2. Click **Create Table** or **Generate Table**.
3. In the generation dialog:
   - Enter a **Topic / Theme** (e.g. `Smuggler's Cove Encounters`).
   - Select a **Dice Preset** (e.g. `d6`, `d10`, `d20`) or type a custom count.
   - (Optional) Provide **Campaign Context** in your own words (e.g. `Focus on Captain Vane's crew and the drowned ruins`).
4. Click **Generate Entries**.
5. Inspect the generated rows in the interactive preview table:
   - Check/uncheck rows to include or exclude.
   - Click any row text to make quick edits.
6. Click **Create Table**. The new table is saved to your vault with all selected entries.

---

## 2. Appending Generated Rows to an Existing Table

1. Open an existing table in the **Table Editor**.
2. Click the **Generate entries** button in the editor toolbar.
3. Enter your prompt (e.g. `Nighttime events`) and desired count.
4. Review the candidate rows in the staging preview.
5. Click **Add to Table**. The accepted rows are appended directly to the table, preserving all previous rows and automatically adjusting ranges/weights.

---

## 3. Nested References & Live Lore Inspection

- If your vault already contains a table named `docklands_weather`, the generator automatically emits `{docklands_weather}` references inside appropriate encounter rows.
- When rolling the table in the **Table Roller**, rolling an entry with `{docklands_weather}` resolves the sub-table roll inline.
- When rolled entries mention vault NPCs or factions (e.g. `Sera Voight`), click the highlighted entity name in the roll result to open their entity sheet.
