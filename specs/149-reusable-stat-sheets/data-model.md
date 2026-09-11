# Data Model: Lightweight Reusable Stat Sheets (149-reusable-stat-sheets)

## Data Entities

### 1. `StatSheetFieldType`

Union string literal representing supported field controls:

```ts
export type StatSheetFieldType =
  | "counter" // Integer with - / + buttons
  | "number" // Plain numeric input
  | "text" // Short single-line text (skills, conditions, movement)
  | "longtext" // Multiline notes / descriptions
  | "heading" // Section divider (collapsible)
  | "dice"; // Rollable dice expression (e.g. 1d20+5)
```

---

### 2. `StatSheetField`

Interface representing an individual stat entry on an entity's stat sheet:

```ts
export interface StatSheetField {
  id: string; // Unique ID within sheet
  label: string; // Display title (e.g. "Hit Points")
  type: StatSheetFieldType; // Control type
  value?: number | string | boolean; // Current value
  formula?: string; // Dice expression for 'dice' fields (e.g. "1d20+5")
  min?: number; // Minimum bound for counter
  max?: number; // Maximum bound for counter
  step?: number; // Step multiplier for counter (default 1)
  collapsed?: boolean; // Collapse state for 'heading' fields
}
```

---

### 3. `StatSheet`

Interface representing the full stat sheet attached to an entity:

```ts
export interface StatSheet {
  templateId?: string | null; // ID of template applied (if any)
  fields: StatSheetField[]; // Ordered list of fields
}
```

---

### 4. `StatSheetTemplate`

Interface for reusable layout definitions:

```ts
export interface StatSheetTemplate {
  id: string; // Template unique ID (e.g. "dnd-5e-npc")
  name: string; // Human-readable template name
  description?: string; // Summary description
  category?: string; // Target entity category recommendation
  isBuiltIn?: boolean; // True for system defaults
  fields: Omit<StatSheetField, "value" | "collapsed">[]; // Structural blueprint without instance values
}
```

---

## State Transitions

### Counter Adjustment

- `StatSheetField` (`type: 'counter'`)
- `increment(fieldId, step)`: `value = Math.min(max ?? Infinity, (value ?? 0) + step)`
- `decrement(fieldId, step)`: `value = Math.max(min ?? -Infinity, (value ?? 0) - step)`
- Saves updated frontmatter to entity vault state.

### Template Application

- `applyTemplate(entityId, templateId, mode: 'overwrite' | 'append')`
- If `overwrite`: `entity.statSheet.fields = cloneTemplateFields(template)`
- If `append`: `entity.statSheet.fields = [...entity.statSheet.fields, ...cloneTemplateFields(template)]`
- Sets `entity.statSheet.templateId = templateId`.
