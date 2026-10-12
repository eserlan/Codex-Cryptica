import { z } from "zod";

export const SilhouetteGenreSchema = z.enum([
  "fantasy",
  "gothic",
  "scifi",
  "cyberpunk",
  "western",
  "modern",
  "cosmic-horror",
  "steampunk",
]);

export type SilhouetteGenre = z.infer<typeof SilhouetteGenreSchema>;

export const SilhouetteArchetypeSchema = z.enum([
  "warrior",
  "caster",
  "rogue",
  "scientist",
  "noble",
  "inquisitor",
  "outlaw",
  "pilot",
  "hacker",
  "beast",
  "dragon",
  "horror",
  "construct",
  "relic",
  "structure",
  "insignia",
  "generic",
]);

export type SilhouetteArchetype = z.infer<typeof SilhouetteArchetypeSchema>;

export const SilhouetteCategorySchema = z.enum([
  "character",
  "creature",
  "location",
  "item",
  "faction",
  "event",
  "note",
]);

export type SilhouetteCategory = z.infer<typeof SilhouetteCategorySchema>;

export const SilhouetteDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: SilhouetteCategorySchema,
  genres: z.array(SilhouetteGenreSchema).min(1),
  archetype: SilhouetteArchetypeSchema,
  gender: z.enum(["female", "male", "neutral", "androgynous"]).optional(),
  tags: z.array(z.string().min(1)).default([]),
  /**
   * Key of the artwork in the `codex-cryptica-statics` R2 bucket. The SVG
   * itself is never inlined here: the catalogue carries only what the matching
   * heuristic reads, and the artwork is fetched from R2 on demand.
   */
  r2Path: z.string().min(1),
});

export type SilhouetteDefinition = z.infer<typeof SilhouetteDefinitionSchema>;
