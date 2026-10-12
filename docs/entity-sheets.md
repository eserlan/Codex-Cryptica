# Entity Sheets

Entity Sheets are the existing Stat Sheet framework, used on any vault entity rather than only characters. The code still says `StatSheet` everywhere. Nothing was renamed, and nothing needs to be. Issue #3960 adds a small capability layer on top so later work (merchant sheets under #3959) can extend sheets without forking them.

## The three layers

| Layer             | Type                                                      | Stored                                                                                                                       |
| ----------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Schema / template | `StatSheetTemplate` (`packages/schema/src/stat-sheet.ts`) | Built-ins in `apps/web/src/lib/stores/stat-sheet/built-in-templates.ts`; vault templates in IndexedDB `stat_sheet_templates` |
| Per-entity values | `StatSheet` on the entity (`statSheet` frontmatter)       | The entity's Markdown file                                                                                                   |
| Presentation      | `PresentationTemplate` (extended Markdown)                | Built-ins in `presentation/built-ins.ts`; vault layouts in IndexedDB `stat_sheet_presentation_templates`                     |

Any entity category can carry a sheet. The Stats tab is shown for every category, templates save with the entity's category, and per-category defaults (`statSheetTemplates.categoryDefaults`) are keyed by any category id.

## Choosing a template for a category

`partitionTemplatesForCategory(templates, entityCategory)` (`@codex/stat-sheet-engine`) splits templates into **suggested** and **other**. Exact category matches come first, then related categories from `RELATED_SHEET_CATEGORIES` (for example a `faction` entity is offered `organization` templates). Nothing is hidden: every template stays selectable for every category. The template picker uses it to group its list.

## Capabilities

A template opts into extra behaviour by listing capability ids:

```json
{
  "id": "vault-shop",
  "name": "Shop",
  "category": "location",
  "capabilities": ["stock-table"],
  "fields": []
}
```

Rules:

- **Declared by id only.** Ids are lowercase words joined by hyphens or dots (`SheetCapabilityIdSchema`). Template Markdown never contains executable logic.
- **Optional.** Templates without `capabilities` (every template saved before #3960) behave exactly as before.
- **Unknown ids are kept.** A template from a newer version keeps ids this client does not know. `registry.resolve()` reports them as `unknown`, and they add no behaviour.
- **Not in marketplace packages yet.** `projectTemplatePackage` leaves `capabilities` out because the public package schema is strict, and older clients would reject packages carrying it. Adding it needs a package `schemaVersion` bump with a migration.

Behaviour lives in code, registered with a `SheetCapabilityRegistry`:

```ts
import { SheetCapabilityRegistry } from "@codex/stat-sheet-engine";

const registry = new SheetCapabilityRegistry();
registry.register({
  id: "stock-table",
  label: "Stock table",
  categories: ["location", "faction"],
  actions: [{ id: "restock", label: "Restock", mutates: true }],
  project: (fields, { audience }) =>
    audience === "gm" ? fields : fields.filter((f) => f.id !== "gm-notes"),
});
```

The registry is a plain class with no global instance. Create it where it is needed and pass it in (constructor injection), so tests can use their own.

### Registered actions (seam for #3963)

`registry.actionsFor(template)` lists the template's allowlisted actions as `RegisteredSheetAction`s with a qualified id (`stock-table:restock`). A definition only declares the action. The app wires up the handler. Every action with `mutates: true` has `requiresConfirmation: true`, and the caller must get explicit confirmation before running it. Nothing runs an action when a sheet is opened, rendered, or generated.

### Read-only projections (seam for #3964)

`projectEntitySheet(sheet, template, audience, registry)` returns an `EntitySheetProjection`: a detached, deeply frozen copy of the sheet's fields for `"gm"` or `"player"`.

- Each declared capability's `project` function runs in declaration order on a private copy, so it can filter or redact but can never write back to the vault entity.
- With no capability projectors, the projection is an exact copy of the fields.
- It fails closed. If a projector throws or returns anything other than a field list, `SheetProjectionError` is thrown and no partially filtered data is returned.
- Pass reactive data as is: fields are copied with a JSON round trip, which also works on Svelte `$state` proxies.

Player-facing views and sharing must read from a projection at the transport boundary, never hide GM values with CSS.

## Shop / Merchant sheet (#3962)

The first built-in sheet that uses a capability. It lives in `packages/stat-sheet-engine/src/merchant.ts` and is added to the built-in templates in `apps/web/src/lib/stores/stat-sheet/built-in-templates.ts`.

- **Template** `builtin-shop-merchant` ("Shop / Merchant"), category `location`, capability `stock-table`. Fields: owner, speciality, reputation, purchasing power, services, a `stock` item table in stock-ledger mode, public notices and GM notes. It is opt-in: the category only decides where the picker suggests it, and nothing sets it as a default.
- **Presentations** "GM Stock Manager" and "Browse Catalogue". They are the only built-in layouts offered for this schema, because the generic ones reference `hp` and `ac`. Both read the same fields, so switching never copies or changes data.
- **`display="catalogue"`** is a display mode for `item-table` fields. It renders the table read-only and for customers: lines marked Hidden are dropped, GM notes are not shown, and an empty table says nothing is for sale. It never writes.
- **Not access control.** The catalogue is a layout choice on the GM's own screen. Hidden lines and notes are still in the stored sheet. A safe player view must come from `projectEntitySheet` at the transport boundary (#3964).
- **Demo data.** `createDemoMerchantSheet()` returns a fantasy example with a linked item, a sold-out line, a service, a hidden line and a GM note, for tests and docs.

## Merchant trades (#3963)

Explicit buy and sell on a Shop / Merchant sheet. The rules are pure code in `packages/stat-sheet-engine/src/commerce.ts`; applying them is `apps/web/src/lib/services/merchant-trade.ts`; the form is `StockTradePanel.svelte`.

- **Registered actions.** The `stock-table` capability declares `purchase` and `sell`, both `mutates: true`. The service refuses a trade unless the sheet's template declares the capability and `registry.actionsFor(template)` lists the action. Presentation Markdown only shows the control; it carries no logic. `createCommerceRegistry()` builds the registry.
- **Nothing happens without a confirm.** The form previews the result with the same `planTrade` the service runs, and the service runs only from the Confirm button. Cancel and Escape never reach it.
- **Validation** (`planTrade`): whole quantity of 1 or more, enough stock, line available (not sold out, reserved or hidden), a price present, a total that stays a safe integer, items only for the shop to buy. Services trade one at a time. The last unit sold flips a line to sold-out; buying into a sold-out line reopens it.
- **Record-only is the default** and is one write to the shop entity. It moves no funds and no items, and the form, result and journal say so.
- **Wallet mode.** A character with a `number` field keyed `wallet_<unit>` (for example `wallet_gp`) can be charged or paid. The unit must equal the price's unit, there is no exchange rate, and the price must be whole numbers. Items are never moved into an inventory.
- **No all-or-none write across entities.** The vault saves each entity on its own, so a wallet trade uses a recoverable order: (1) shop stock plus the trade logged as `pending`, (2) the wallet balance plus the trade id on the wallet field, (3) the shop record marked `complete`. A failure at step 2 restores step 1. If a restore or step 3 also fails, the `pending` record stays and confirming the same trade again finishes it. The wallet already carries the trade id, so it is never charged twice.
- **Idempotency.** `StatSheetField.tradeLog` (at most 25 records, oldest finished ones dropped first) holds `StockTradeRecord`s. A trade id already logged is not applied again, and reusing an id for a different trade is refused. The form mints one id per opened panel and reuses it on retry.
- **In-flight guard.** The service ignores a second call with a trade id that is still being applied, so a double click runs once.
- **Journal.** One `trade` entry via `JOURNAL:CAPTURE` after success, from `describeTrade`. It is not part of any capture-control kind, so it is always recorded while a journal runs. A rejected, failed or cancelled trade emits nothing, and a duplicate retry of a finished trade emits nothing. A journal failure never fails the trade.

## Compatibility promises

- Old `statSheet` frontmatter, vault templates, presentation templates and marketplace packages load unchanged. `packages/stat-sheet-engine/src/__fixtures__/legacy-sheets.ts` holds pre-#3960 data, and `entity-sheet.test.ts` asserts it parses and projects without being rewritten.
- No schema version changed. If a later change has to alter a stored shape, bump the relevant version and add a migration test next to `migrations.test.ts`.
