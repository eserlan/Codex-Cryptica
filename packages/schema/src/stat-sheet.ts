import { z } from "zod";

export const StatSheetFieldTypeSchema = z.enum([
  "counter",
  "number",
  "text",
  "longtext",
  "heading",
  "dice",
  "item-table",
]);

export type StatSheetFieldType = z.infer<typeof StatSheetFieldTypeSchema>;

/**
 * User-friendly field key (#3180): an optional human-readable alias for the
 * immutable internal `id` (e.g. key `strength` for a `field-<uuid>` id).
 * Authoring surfaces accept either and resolve to the id, so renaming a key
 * can never corrupt stored references. Keys are unique within their template
 * scope.
 */
export const StatSheetFieldKeySchema = z
  .string()
  .min(1)
  .max(64)
  .regex(
    /^[A-Za-z_][A-Za-z0-9_]*$/,
    "Key must start with a letter or underscore and contain only letters, numbers, and underscores",
  );

/**
 * Money value contract (#3961): an integer count of the smallest unit plus
 * explicit denomination metadata, so totals never pass through floating
 * point and no exchange rate is implied. `precision` is the number of decimal
 * places the displayed amount uses (units / 10^precision); `currency` is a
 * free-form code or denomination ("gp", "cr", "Imperial Credits").
 */
export const MoneyAmountSchema = z.object({
  units: z.number().int().safe(),
  currency: z.string().trim().min(1).max(40),
  precision: z.number().int().min(0).max(6).default(0),
});

export type MoneyAmount = z.infer<typeof MoneyAmountSchema>;

export const StockAvailabilitySchema = z.enum([
  "available",
  "reserved",
  "hidden",
  "sold-out",
]);

export type StockAvailability = z.infer<typeof StockAvailabilitySchema>;

export const StockLineKindSchema = z.enum(["item", "service", "commission"]);

export type StockLineKind = z.infer<typeof StockLineKindSchema>;

/**
 * Shop-local stock metadata for one `item-table` row. It lives on the row,
 * never on the linked Item entity, so price and quantity are independent
 * per shop and per lot.
 */
export const StockMetaSchema = z.object({
  kind: StockLineKindSchema.optional(),
  quantity: z.number().int().min(0).safe().optional(),
  price: MoneyAmountSchema.optional(),
  condition: z.string().max(120).optional(),
  availability: StockAvailabilitySchema.optional(),
  note: z.string().max(500).optional(),
});

export type StockMeta = z.infer<typeof StockMetaSchema>;

/**
 * One trade recorded on the stock field it changed (#3963). The log is what
 * makes a retry safe: a trade id already in the log is never applied twice.
 * `pending` means the stock changed but a linked wallet update is not yet
 * confirmed; `complete` means every part of the trade is done.
 */
export const StockTradeRecordSchema = z.object({
  tradeId: z.string().min(1).max(80),
  kind: z.enum(["purchase", "sell"]),
  rowId: z.string().min(1).max(120),
  itemName: z.string().max(200),
  quantity: z.number().int().min(1).safe(),
  total: MoneyAmountSchema,
  accounting: z.enum(["record-only", "wallet"]),
  counterpartyId: z.string().max(120).optional(),
  status: z.enum(["pending", "complete"]),
  at: z.string().max(40),
});

export type StockTradeRecord = z.infer<typeof StockTradeRecordSchema>;

/**
 * Opt-in sharing of a merchant's stock with players (#3964). Absent or
 * `published: false` means nothing about the shop leaves the GM's device.
 * `fields` lists which optional business details (by field id) players may
 * also see; anything not listed stays private.
 */
export const PlayerCatalogueSettingsSchema = z.object({
  published: z.boolean(),
  fields: z.array(z.string().min(1).max(64)).max(20).default([]),
});

export type PlayerCatalogueSettings = z.infer<
  typeof PlayerCatalogueSettingsSchema
>;

/**
 * One bulk market change applied to a shop's stock (#3966). It records, per
 * row, what each changed value was before and after, which is what makes the
 * change reversible without touching values the GM edited since. Absent on a
 * shop that has never used market pressure.
 */
const PriceShiftSchema = z.object({
  before: MoneyAmountSchema,
  after: MoneyAmountSchema,
});
const QuantityShiftSchema = z.object({
  // Absent when the line had no counted quantity before the change.
  before: z.number().int().min(0).safe().optional(),
  after: z.number().int().min(0).safe(),
});
const AvailabilityShiftSchema = z.object({
  before: StockAvailabilitySchema.optional(),
  after: StockAvailabilitySchema,
});

export const MarketRowChangeSchema = z.object({
  rowId: z.string().min(1).max(120),
  name: z.string().max(200),
  price: PriceShiftSchema.optional(),
  quantity: QuantityShiftSchema.optional(),
  availability: AvailabilityShiftSchema.optional(),
});

export type MarketRowChange = z.infer<typeof MarketRowChangeSchema>;

export const MarketChangeSchema = z.object({
  id: z.string().min(1).max(80),
  label: z.string().min(1).max(120),
  /** What caused it: the GM directly, or an approved outside signal. */
  cause: z.object({
    kind: z.enum(["gm", "signal"]),
    source: z.string().max(120).optional(),
  }),
  /** Plain-language reason shown beside the changed price. */
  reason: z.string().max(300),
  at: z.string().max(40),
  status: z.enum(["applied", "reverted"]),
  rows: z.array(MarketRowChangeSchema).max(200),
});

export type MarketChange = z.infer<typeof MarketChangeSchema>;

export const StatSheetFieldSchema = z.object({
  id: z.string().min(1),
  key: StatSheetFieldKeySchema.optional(),
  label: z.string().min(1),
  type: StatSheetFieldTypeSchema,
  value: z.union([z.number(), z.string(), z.boolean()]).optional(),
  formula: z.string().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().optional(),
  collapsed: z.boolean().optional(),
  favorite: z.boolean().optional(),
  barField: z.boolean().optional(),
  // For "item-table" type fields: column definitions and row items array.
  columns: z
    .array(
      z.object({
        id: z.string().min(1),
        label: z.string().min(1),
        type: z.enum([
          "text",
          "number",
          "dice",
          "counter",
          "checkbox",
          "money",
        ]),
        // "dice" columns: the roll formula applied to every row (e.g.
        // "1d6+2"). Rows may still override it per-row (see `rows` below).
        formula: z.string().optional(),
        // "counter" columns: bounds/step shared by every row's counter.
        // `max` also seeds new rows' starting value/max (see
        // ItemTableNode.svelte's handleAddRow).
        min: z.number().optional(),
        max: z.number().optional(),
        step: z.number().optional(),
      }),
    )
    .optional(),
  rows: z
    .array(
      z.record(
        z.string(),
        z.union([
          z.string(),
          z.number(),
          z.boolean(),
          z.object({ value: z.number(), max: z.number().optional() }),
          MoneyAmountSchema,
          StockMetaSchema,
        ]),
      ),
    )
    .optional(),
  // For "item-table" type fields: whether rows can be populated by linking
  // to an existing vault item/weapon entity, in addition to typed manually.
  // Undefined defaults to enabled (back-compat with existing weapon/item
  // tables, which never set this); template authors can opt custom
  // non-item tables (e.g. a Mythras skills table) out explicitly.
  linkVaultItems: z.boolean().optional(),
  // For "item-table" type fields: merchant stock ledger mode (#3961). Rows
  // get a stable `rowId` and shop-local `stock` metadata (quantity, price,
  // condition, availability, note). Undefined/false keeps legacy semantics.
  stockLedger: z.boolean().optional(),
  // Whether and how this stock ledger is shared with players (#3964).
  playerCatalogue: PlayerCatalogueSettingsSchema.optional(),
  // Bounded record of recent trades on a stock ledger, or of the trades that
  // changed a wallet number field (#3963). Absent on every older sheet.
  tradeLog: z.array(StockTradeRecordSchema).max(25).optional(),
  // Recent bulk market changes (shortage, glut, restock) on a stock ledger
  // (#3966). Opt-in: absent until the GM applies one.
  marketHistory: z.array(MarketChangeSchema).max(20).optional(),
  // Id of another field on the same sheet (typically a "number" ability
  // score) whose value drives this field's dice modifier — e.g. a "STR
  // Check" dice field derives its flat bonus from a "STR" score field via
  // the standard ability-modifier formula. Recomputed by
  // applyDerivedModifiers (apps/web/.../stat-sheet-field-actions.ts)
  // whenever the sheet's fields are persisted.
  modifierSource: z.string().optional(),
});

export type StatSheetField = z.infer<typeof StatSheetFieldSchema>;

/**
 * Fallback columns for "item-table" fields that predate the configurable
 * column editor, and the seed used when a template author switches a field
 * to "item-table" for the first time. Single source of truth — the
 * built-in Mythras template, the template editor's seeding logic, and the
 * renderer's legacy fallback all import this instead of redeclaring the
 * weapon column list.
 */
export const DEFAULT_ITEM_TABLE_COLUMNS: NonNullable<
  StatSheetField["columns"]
> = [
  { id: "name", label: "Weapon Type", type: "text" },
  { id: "size", label: "Size", type: "text" },
  { id: "reach", label: "Reach (Force)", type: "text" },
  { id: "damage", label: "Damage", type: "dice" },
  { id: "ap_hp", label: "AP/HP", type: "text" },
  { id: "effects", label: "Special Effects", type: "text" },
  { id: "range_load", label: "Range & Load", type: "text" },
];

export const StatSheetSchema = z.object({
  templateId: z.string().nullable().optional(),
  fields: z.array(StatSheetFieldSchema).default([]),
  // Per-entity override of the schema's default presentation template
  // (152-stat-sheet-templates). `null`/absent means "inherit the schema's
  // default", read via `StatSheetTemplateStore.getDefaultPresentationTemplateId()`
  // (apps/web/src/lib/stores/stat-sheet-templates.svelte.ts) — a vault-scoped
  // settings map, not a field on StatSheetTemplateSchema (built-in schema
  // templates are hardcoded objects with no persisted record to attach one to).
  presentationTemplateId: z.string().nullable().optional(),
});

export type StatSheet = z.infer<typeof StatSheetSchema>;

export const StatSheetTemplateFieldSchema = StatSheetFieldSchema.omit({
  value: true,
  collapsed: true,
  favorite: true,
  barField: true,
});

export type StatSheetTemplateField = z.infer<
  typeof StatSheetTemplateFieldSchema
>;

/**
 * Opt-in Entity Sheet capability id (#3960), e.g. `stock-table` or
 * `commerce.trade`. A capability is declared by id only — its behaviour
 * (registered actions, read-only projections) lives in code registered with
 * `SheetCapabilityRegistry` (`@codex/stat-sheet-engine`), never in template
 * Markdown. See docs/entity-sheets.md.
 */
export const SheetCapabilityIdSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(
    /^[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)*$/,
    "Capability ids are lowercase words joined by hyphens or dots",
  );

export type SheetCapabilityId = z.infer<typeof SheetCapabilityIdSchema>;

export const StatSheetTemplateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.string().optional(),
  isBuiltIn: z.boolean().optional(),
  fields: z.array(StatSheetTemplateFieldSchema).default([]),
  // Optional and absent on every pre-#3960 template, so legacy templates
  // load unchanged. Ids this client has no registered capability for are
  // kept, not dropped, so a newer template survives a round trip.
  capabilities: z.array(SheetCapabilityIdSchema).optional(),
});

export type StatSheetTemplate = z.infer<typeof StatSheetTemplateSchema>;

/** Categories offered by the public template directory. */
export const StatSheetEntityCategorySchema = z.enum([
  "character",
  "npc",
  "location",
  "settlement",
  "faction",
  "item",
  "event",
  "note",
  "ship",
  "threat",
  "organization",
  "other",
]);

export type StatSheetEntityCategory = z.infer<
  typeof StatSheetEntityCategorySchema
>;

export const PUBLIC_STAT_SHEET_PACKAGE_VERSION = 1 as const;

/**
 * 152-stat-sheet-templates: Markdown-based presentation templates.
 *
 * `formatVersion` is the extended-Markdown directive syntax version
 * (contracts/directive-syntax.md), independent of
 * PUBLIC_STAT_SHEET_PACKAGE_VERSION above (which versions the *schema*
 * template package format, not the presentation directive grammar).
 */
export const PRESENTATION_TEMPLATE_FORMAT_VERSION = 1 as const;

export const PresentationTemplateSchema = z.object({
  id: z.string().min(1),
  // `null` for built-ins; owning vault id for vault-owned templates.
  vaultId: z.string().nullable(),
  // The StatSheetTemplate.id this presentation targets (V1: exactly one).
  schemaTemplateId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  // Raw extended-Markdown source — the authoritative, durable representation.
  source: z.string(),
  formatVersion: z.number().int().positive(),
  isBuiltIn: z.boolean().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type PresentationTemplate = z.infer<typeof PresentationTemplateSchema>;

/** Value-free export/import envelope (FR-015/FR-016). */
export const PresentationTemplatePackageSchema = z.object({
  formatVersion: z.number().int().positive(),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  schemaTemplateId: z.string().min(1),
  source: z.string(),
});

export type PresentationTemplatePackage = z.infer<
  typeof PresentationTemplatePackageSchema
>;
