import { z } from "zod";
import { AdventureJsonV1Schema } from "./schema";

export const ADVENTURE_JSON_V1_SCHEMA_ID =
  "https://codexcryptica.com/schemas/adventure-json/v1.json" as const;

export const JSON_SCHEMA_DRAFT_2020_12 =
  "https://json-schema.org/draft/2020-12/schema" as const;

export function getAdventureJsonV1JsonSchema(): Record<string, unknown> {
  const generated = z.toJSONSchema(AdventureJsonV1Schema, {
    target: "draft-2020-12",
  }) as Record<string, unknown>;

  return {
    $schema: JSON_SCHEMA_DRAFT_2020_12,
    $id: ADVENTURE_JSON_V1_SCHEMA_ID,
    title: "Codex Cryptica Adventure JSON v1",
    description:
      "Public versioned interchange contract for source-derived tabletop RPG adventures without playthrough state.",
    ...generated,
  };
}
