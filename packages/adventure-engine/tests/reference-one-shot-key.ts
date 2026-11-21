import { z } from "zod";
import { ConversionAnswerKeyFieldsSchema } from "../src/adventure-json/conversion-answer-key";

export const ReferenceOneShotKeySchema = ConversionAnswerKeyFieldsSchema.pick({
  adventureFile: true,
  sections: true,
  npcs: true,
  secrets: true,
  sceneConditions: true,
  branch: true,
  alternativeSolution: true,
  missableClue: true,
  endings: true,
  actionableDetails: true,
})
  .extend({ adventureFile: z.literal("adventure.md") })
  .refine(
    (k) => {
      const unique = (ids: string[]) => new Set(ids).size === ids.length;
      return (
        unique(k.sections.map((s) => s.sourceId)) &&
        unique(k.secrets.map((s) => s.id)) &&
        unique(k.endings.map((e) => e.id))
      );
    },
    { message: "section sourceIds, secret ids and ending ids must be unique" },
  );

export type ReferenceOneShotKey = z.infer<typeof ReferenceOneShotKeySchema>;
