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

## Sharing a shop with players (#3964)

A merchant sheet reaches players only through one projection. Choosing the Browse Catalogue layout is not a permission: it is a presentation of data the viewer already has.

- **Allowlist, not a filter.** `projectCatalogueFields` (`packages/stat-sheet-engine/src/catalogue.ts`) builds a new object from named pieces. A stock line contributes its name, kind, quantity, condition, availability and a validated price. Nothing else is copied, so a field added to the sheet later stays private until it is added here deliberately. Never shared: `entityId` links, row ids, line notes, extra columns, Hidden lines, trade history, purchasing power and GM notes.
- **Private by default.** `StatSheetField.playerCatalogue` (`{ published, fields }`) is absent on every existing sheet. Until a GM sets `published`, nothing about the shop is sent. `fields` is an opt-in list of business details by id, limited to `SHAREABLE_SHEET_FIELD_IDS` (`owner`, `speciality`, `reputation`, `services`, `public_notices`); an id outside the list is ignored even if the stored settings contain it.
- **Where it is applied.** `sanitizeSheetForGuests` is the only way a stat sheet goes to guests, and it is called from the two places guests are fed: `sanitizeEntityForGuestTransport` (the initial shared graph, live updates and batch updates) and `GuestExporter` (published worlds). Before #3964 both copied `statSheet` whole, so a shop's hidden stock and GM notes reached guests.
- **Fails closed.** A sheet is recognised as a merchant sheet by its stock ledger, not by its template, so a deleted template cannot expose it. `GuestExporter` withholds any ledger sheet when it is given no sanitiser. Every other sheet is passed on without its `tradeLog`.
- **Revoking a share.** Guests merge each update over the entity they hold, so an unpublished shop sends an explicit empty sheet (`{ templateId: null, fields: [] }`). Omitting the sheet would leave the old catalogue on screen. A published world is a snapshot and changes only when it is published again.
- **Linked Item titles.** A stock line with no name of its own shows the linked Item's title, supplied by the caller. In a published world the title is looked up only among entities that are in the export, so an Item hidden by fog of war is never named. In a live session it follows what that session already shares.
- **Preview as player** renders `projectCatalogueFields` with the same title lookup, so it cannot drift from what is sent. Players get a read-only table with no Trade or sharing controls, and the host has no message that lets a guest change an entity.
- **Capability seam.** The `stock-table` capability's `project` returns the sheet unchanged for `"gm"` and the player catalogue for any other audience.

## Suggested stock (#3965)

`packages/stat-sheet-engine/src/stock-suggestions.ts` proposes opening stock for a shop. It is pure, offline and deterministic (a seed re-rolls it), so manual shops and generators stay independent.

- `deriveShopContext` reads the shop's text and its connected places' text into a genre, wealth and focus/plentiful/scarce themes. `proposeStock` turns that into candidate lines with quantity, price, availability and a plain reason; scarce goods are few and dear, plentiful goods cheaper.
- `reviewProposal` marks lines the shop already stocks (by name or linked Item title) and offers an Item link only when an Item with that exact title exists. `applyAcceptedLines` appends accepted lines after the existing rows, which are returned untouched, and skips any already present.
- Nothing is saved or linked without the GM's choice. Suggested prices are labelled as suggestions in the private line note and are never presented as official.
- It reads text, not the Business (#3627) or Settlement Economy (#3559) generators, which are not built yet. When they exist they should feed `ShopContextInput` (or the same themes) rather than define another stock model. See also #3509.
- Not done here: rules-profile reference catalogues (for example ToV) and AI-written stock.

## Market pressure (#3966)

`packages/stat-sheet-engine/src/market-pressure.ts` is an opt-in layer over the stock rows. A shop that never uses it has no `marketHistory` and no extra data.

- A `PressureEffect` (price percent, quantity by percent or add, availability) is planned against chosen rows with `planPressure`, which only returns a diff. `applyPlan` changes just the planned rows and returns a `MarketChange`; other rows are the same objects.
- A `MarketChange` stores, per row, each value before and after. `revertChange` restores a value only if it is still exactly what the change left, so a price the GM set (or a quantity a trade changed) since is kept and reported. `replayChanges` rebuilds a shop from a baseline and a change list; the same inputs give the same rows.
- `standingPressure` gives each affected row's baseline price, asking price and reasons, derived from the history, so there is no second copy of the price to drift.
- Prices use the shop's own currency and precision with whole-unit rounding, a floor of one unit and an exact-integer check. No currency conversion. Per-line GM overrides are protected by choosing lines in the diff and by the exact-value check on undo.
- `marketHistory` is bounded (20 changes), is stripped when a field is saved into a template or sent to guests, and the player catalogue allowlist never carries it.
- Signals from the Settlement Economy (#3559) and Business (#3627) generators plug in through `MarketSignal` and `draftFromSignal`, which only draft a preset and a line filter for the GM to review. Not built here: automatic restocking, NPC buying, and genre or rules adapters (these would be separate adapters over `PressureEffect`).

## Compatibility promises

- Old `statSheet` frontmatter, vault templates, presentation templates and marketplace packages load unchanged. `packages/stat-sheet-engine/src/__fixtures__/legacy-sheets.ts` holds pre-#3960 data, and `entity-sheet.test.ts` asserts it parses and projects without being rewritten.
- No schema version changed. If a later change has to alter a stored shape, bump the relevant version and add a migration test next to `migrations.test.ts`.
