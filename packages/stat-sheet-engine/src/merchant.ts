import type {
  PresentationTemplate,
  StatSheet,
  StatSheetField,
  StatSheetTemplate,
} from "schema";

/**
 * Built-in Shop / Merchant Entity Sheet (#3962). Pure data: a stat sheet
 * template, two presentations of the same fields, and a fantasy demo
 * merchant. It is opt-in and system-neutral: nothing here assigns it to a
 * category, and prices carry their own free-form unit.
 */

export const SHOP_MERCHANT_TEMPLATE_ID = "builtin-shop-merchant";
export const SHOP_STOCK_FIELD_ID = "stock";
export const SHOP_GM_PRESENTATION_NAME = "GM Stock Manager";
export const SHOP_CATALOGUE_PRESENTATION_NAME = "Browse Catalogue";

const CREATED_AT = "2026-10-12T00:00:00.000Z";

export const SHOP_MERCHANT_TEMPLATE: StatSheetTemplate = {
  id: SHOP_MERCHANT_TEMPLATE_ID,
  name: "Shop / Merchant",
  description:
    "A shop or merchant with an owner, reputation, services and a stock table with shop-local prices and quantities. Works on any Location or Organisation.",
  category: "location",
  isBuiltIn: true,
  capabilities: ["stock-table"],
  fields: [
    { id: "owner", label: "Owner / manager", type: "text" },
    { id: "speciality", label: "Speciality", type: "text" },
    { id: "reputation", label: "Reputation", type: "text" },
    { id: "funds", label: "Purchasing power", type: "text" },
    { id: "services", label: "Services", type: "longtext" },
    {
      id: SHOP_STOCK_FIELD_ID,
      label: "Stock",
      type: "item-table",
      columns: [{ id: "name", label: "Item", type: "text" }],
      linkVaultItems: true,
      stockLedger: true,
    },
    { id: "public_notices", label: "Public notices", type: "longtext" },
    { id: "gm_notes", label: "GM notes", type: "longtext" },
  ],
};

const GM_STOCK_MANAGER_SOURCE = `## Shop at a glance

:::stat-group columns=2
{{stat.owner}}
{{stat.speciality}}
{{stat.reputation}}
{{stat.funds}}
:::

### Stock

{{stat.stock display="table"}}

:::card
### Services
{{stat.services display="notes"}}
:::

:::card
### Public notices
{{stat.public_notices display="notes"}}
:::

:::card
### GM notes
{{stat.gm_notes display="notes"}}
:::
`;

const CATALOGUE_SOURCE = `## Welcome

:::stat-group columns=1
{{stat.speciality}}
{{stat.reputation}}
:::

### For sale

{{stat.stock display="catalogue"}}

### Services
{{stat.services display="notes"}}

### Notices
{{stat.public_notices display="notes"}}
`;

function presentation(
  suffix: string,
  name: string,
  description: string,
  source: string,
): PresentationTemplate {
  return {
    id: `builtin-presentation-${suffix}-${SHOP_MERCHANT_TEMPLATE_ID}`,
    vaultId: null,
    schemaTemplateId: SHOP_MERCHANT_TEMPLATE_ID,
    name,
    description,
    source,
    formatVersion: 1,
    isBuiltIn: true,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
  };
}

/**
 * The two layouts for the one merchant sheet. Both read the same fields, so
 * switching between them never copies or changes stored data.
 */
export function getShopPresentationTemplates(): PresentationTemplate[] {
  return [
    presentation(
      "shop-gm-stock-manager",
      SHOP_GM_PRESENTATION_NAME,
      "Editable stock with prices, quantities, availability, GM notes and shortcuts to linked items.",
      GM_STOCK_MANAGER_SOURCE,
    ),
    presentation(
      "shop-catalogue",
      SHOP_CATALOGUE_PRESENTATION_NAME,
      "A compact read-only catalogue of prices, availability and services. A preview for the GM, not a way to share the shop.",
      CATALOGUE_SOURCE,
    ),
  ];
}

const gp = (units: number) => ({ units, currency: "gp", precision: 0 });

/**
 * A fantasy example merchant for docs, tests and demos. One line is linked
 * to a vault item, one is hidden from customers, one is sold out, one is a
 * service, and one has a GM-only note.
 */
export function createDemoMerchantSheet(): StatSheet {
  const fields: StatSheetField[] = SHOP_MERCHANT_TEMPLATE.fields.map(
    (field) => ({ ...field }) as StatSheetField,
  );
  const set = (id: string, patch: Partial<StatSheetField>) => {
    const index = fields.findIndex((field) => field.id === id);
    fields[index] = { ...fields[index], ...patch } as StatSheetField;
  };
  set("owner", { value: "Brannoch Tallow" });
  set("speciality", { value: "Travellers' gear and lamp oil" });
  set("reputation", { value: "Fair prices, no questions asked" });
  set("funds", { value: "About 200 gp" });
  set("services", {
    value: "Repairs to packs and boots. Maps of the Lantern Road.",
  });
  set("public_notices", {
    value: "No credit. Closed on festival days.",
  });
  set("gm_notes", {
    value: "Brannoch fences stolen goods from the back room.",
  });
  set(SHOP_STOCK_FIELD_ID, {
    rows: [
      {
        rowId: "demo-row-rope",
        name: "Hempen rope (50 ft)",
        stock: { kind: "item", quantity: 12, price: gp(1) },
      },
      {
        rowId: "demo-row-lamp",
        name: "Hooded lantern",
        entityId: "demo-item-hooded-lantern",
        stock: { kind: "item", quantity: 3, price: gp(5) },
      },
      {
        rowId: "demo-row-rations",
        name: "Trail rations (1 day)",
        stock: {
          kind: "item",
          quantity: 0,
          price: gp(1),
          availability: "sold-out",
        },
      },
      {
        rowId: "demo-row-boots",
        name: "Boot resoling",
        stock: { kind: "service", price: gp(2) },
      },
      {
        rowId: "demo-row-ring",
        name: "Signet ring (engraved)",
        stock: {
          kind: "item",
          quantity: 1,
          price: gp(40),
          availability: "hidden",
          note: "Taken from a dead courier. Do not mention.",
        },
      },
    ],
  });
  return {
    templateId: SHOP_MERCHANT_TEMPLATE_ID,
    fields,
    presentationTemplateId: null,
  };
}
