import type { CCImportPackage } from "../../../src/cc/package";

export const kankaMinimal: CCImportPackage = {
  version: "1.0",
  sourceSystem: "kanka",
  sourceLabel: "Kanka — Tales of Avaris",
  entityDrafts: [
    {
      sourceId: "12345",
      sourceType: "Character",
      title: "Sara Vane",
      content: "A river smuggler.",
      tags: ["pc"],
    },
    {
      sourceId: "678",
      sourceType: "Location",
      title: "Rivertown",
      content: "A wharf city.",
      tags: [],
    },
  ],
  relationshipDrafts: [{ fromRef: "12345", toRef: "678", type: "located_in" }],
  assetDrafts: [],
  warnings: [],
};
