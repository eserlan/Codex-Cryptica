import { z } from "zod";

const text = z.string().min(1);

export const ReferenceOneShotKeySchema = z
  .object({
    adventureFile: z.literal("adventure.md"),
    sections: z
      .array(
        z
          .object({
            sourceId: text,
            title: text,
            container: z.boolean().optional(),
          })
          .strict(),
      )
      .min(1),
    npcs: z.array(
      z.object({ name: text, motivation: text, sourceId: text }).strict(),
    ),
    secrets: z.array(
      z
        .object({ id: text, text, gmOnly: z.boolean(), sourceId: text })
        .strict(),
    ),
    sceneConditions: z.array(
      z.object({ sourceId: text, condition: text }).strict(),
    ),
    branch: z
      .object({ sourceId: text, description: text, optional: z.literal(true) })
      .strict(),
    alternativeSolution: z
      .object({
        obstacleSourceId: text,
        description: text,
        socialBypassOfCombat: z.boolean(),
        sourceId: text,
      })
      .strict(),
    missableClue: z
      .object({ clue: text, primarySourceId: text, alternativeSourceId: text })
      .strict()
      .refine((c) => c.primarySourceId !== c.alternativeSourceId, {
        message: "clue source IDs must differ",
      }),
    endings: z
      .array(z.object({ id: text, description: text, sourceId: text }).strict())
      .min(2),
  })
  .strict()
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
