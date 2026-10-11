import type { StatSheet } from "schema";

/**
 * Sheet data exactly as saved before Entity Sheet capabilities existed
 * (#3960). Compatibility tests parse and project these and assert nothing
 * about them changes.
 */
export const legacyMythrasTemplate = {
  id: "vault-mythras-adventurer",
  name: "Mythras Adventurer",
  description: "Saved from a character sheet.",
  category: "character",
  fields: [
    { id: "str", key: "strength", label: "STR", type: "number" },
    { id: "hp", label: "Hit Points", type: "counter", min: 0, max: 14 },
    {
      id: "weapons",
      label: "Weapons",
      type: "item-table",
      columns: [
        { id: "name", label: "Weapon Type", type: "text" },
        { id: "damage", label: "Damage", type: "dice" },
      ],
    },
  ],
};

export const legacyCharacterStatSheet = {
  templateId: "vault-mythras-adventurer",
  fields: [
    { id: "str", key: "strength", label: "STR", type: "number", value: 13 },
    {
      id: "hp",
      label: "Hit Points",
      type: "counter",
      value: 9,
      min: 0,
      max: 14,
      barField: true,
    },
    {
      id: "weapons",
      label: "Weapons",
      type: "item-table",
      columns: [
        { id: "name", label: "Weapon Type", type: "text" },
        { id: "damage", label: "Damage", type: "dice" },
      ],
      rows: [{ name: "Shortspear", damage: "1d8+1" }],
    },
  ],
  presentationTemplateId: "vault-presentation-adventurer",
};

export const legacyPresentationTemplate = {
  id: "vault-presentation-adventurer",
  vaultId: "vault-1",
  schemaTemplateId: "vault-mythras-adventurer",
  name: "Adventurer Card",
  description: null,
  source:
    ':::card\n{{stat.strength}}\n{{stat.hp display="current-max"}}\n:::\n',
  formatVersion: 1,
  createdAt: "2026-08-02T00:00:00.000Z",
  updatedAt: "2026-08-02T00:00:00.000Z",
};

/** A custom, template-less sheet on a Location entity. */
export const locationShopStatSheet: StatSheet = {
  templateId: null,
  fields: [
    { id: "owner", label: "Owner", type: "text", value: "Mira Vell" },
    {
      id: "reputation",
      label: "Reputation",
      type: "counter",
      value: 3,
      max: 5,
    },
    {
      id: "stock",
      label: "Stock",
      type: "item-table",
      linkVaultItems: true,
      columns: [
        { id: "name", label: "Item", type: "text" },
        { id: "qty", label: "Quantity", type: "number" },
      ],
      rows: [{ name: "Lantern", qty: 4 }],
    },
  ],
};
