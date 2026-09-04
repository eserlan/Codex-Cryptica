import { z } from "zod";
import { THEMES } from "schema";
import type { WorldThemeId } from "schema";

/**
 * Curated generator examples (`/examples/[slug]`), per #2565.
 *
 * These pages exist to show what Codex actually produces for a concrete prompt,
 * and to be useful to someone who never opens the app. They are **curated, not
 * an index of every generation** — publishing is a deliberate editorial act, and
 * the schema is written to make that hard to forget:
 *
 * - `provenance` must state whether the text was edited, so a polished example
 *   can never be quietly presented as raw output;
 * - `annotation` is required, because an example with no editorial reading of it
 *   is a dump rather than a page;
 * - `sourceUrl` records where the example was first published, so its history
 *   stays traceable.
 *
 * The generated artefact is the substance of the page. Everything else is
 * framing, and the guardrails in #2565 are explicit that the framing must not
 * grow to dwarf it.
 */

/** What kind of artefact the generator produced. Drives grouping on the index. */
export const ExampleKindSchema = z.enum([
  "settlement",
  "faction",
  "encounter",
  "character",
  "creature",
  "location",
  "item",
  "ship",
  "adventure",
]);
export type ExampleKind = z.infer<typeof ExampleKindSchema>;

/**
 * The world theme the page renders in, so a cyberpunk example is read in the
 * cyberpunk skin rather than in whatever theme the visitor last happened to
 * pick up elsewhere on the site.
 *
 * Deliberately a separate field rather than something inferred from `genre`:
 * `genre` is free prose written for the reader ("Classic Fantasy", "Space
 * opera"), and several genres have no single obvious skin. Choosing the theme
 * is an editorial act, so it is stated rather than guessed. Use `workspace`
 * for an example that should stay neutral.
 */
export const ExampleThemeSchema = z.enum(
  Object.keys(THEMES) as [WorldThemeId, ...WorldThemeId[]],
);
export type ExampleTheme = z.infer<typeof ExampleThemeSchema>;

/**
 * Honesty about how much the text was touched.
 *
 * `raw` means exactly what the generator emitted. Anything else must say so —
 * #2565 forbids presenting edited output as untouched generation.
 */
export const ExampleProvenanceSchema = z.enum(["raw", "lightly-edited"]);
export type ExampleProvenance = z.infer<typeof ExampleProvenanceSchema>;

/** A list item that may lead with a bolded term. */
export const ExampleListItemSchema = z.object({
  term: z.string().optional(),
  text: z.string().min(1),
});
export type ExampleListItem = z.infer<typeof ExampleListItemSchema>;

/** Plain narrative sections of the output. */
const ExampleProseBlockSchema = z.object({
  kind: z.literal("prose"),
  heading: z.string().min(1).optional(),
  paragraphs: z.array(z.string().min(1)).min(1),
});

/** Bulleted output — points of interest, inhabitants, hooks. */
const ExampleListBlockSchema = z.object({
  kind: z.literal("list"),
  heading: z.string().min(1).optional(),
  intro: z.string().optional(),
  items: z.array(ExampleListItemSchema).min(1),
});

/** The generator's own structured reference footer (scale, genre, tone…). */
const ExampleFactsBlockSchema = z.object({
  kind: z.literal("facts"),
  heading: z.string().min(1),
  facts: z
    .array(z.object({ label: z.string().min(1), value: z.string().min(1) }))
    .min(1),
});

export const ExampleBlockSchema = z.discriminatedUnion("kind", [
  ExampleProseBlockSchema,
  ExampleListBlockSchema,
  ExampleFactsBlockSchema,
]);
export type ExampleBlock = z.infer<typeof ExampleBlockSchema>;

/** An internal link out to a live Codex surface. */
export const ExampleLinkSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  href: z.string().startsWith("/"),
});
export type ExampleLink = z.infer<typeof ExampleLinkSchema>;

export const ExampleConfigSchema = z
  .object({
    slug: z
      .string()
      .min(1)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug must be kebab-case"),
    /** The artefact's own name, e.g. "Gull's Roost". */
    name: z.string().min(1),
    /** Page H1, e.g. "Fantasy settlement example: Gull's Roost". */
    title: z.string().min(1),
    kind: ExampleKindSchema,
    genre: z.string().min(1),
    /** World theme this example is skinned in. See ExampleThemeSchema. */
    theme: ExampleThemeSchema,
    /** One sentence describing the artefact, reusable as a card subtitle. */
    summary: z.string().min(20),
    provenance: ExampleProvenanceSchema,
    /** Note explaining any editing, required when provenance is not `raw`. */
    provenanceNote: z.string().min(10).optional(),
    /** The generator that produced it. Must be a live route. */
    generator: z.object({
      name: z.string().min(1),
      href: z.string().startsWith("/generators/"),
    }),
    /** The meaningful settings behind the roll — never internal prompts. */
    context: z
      .array(z.object({ label: z.string().min(1), value: z.string().min(1) }))
      .min(1),
    image: z
      .object({ src: z.string().url(), alt: z.string().min(10) })
      .optional(),
    /** The generated artefact itself — the substance of the page. */
    output: z.array(ExampleBlockSchema).min(1),
    /**
     * Human editorial reading: what makes this useful at the table. #2565 is
     * explicit that this must add value rather than praise the generator.
     */
    annotation: z.object({
      heading: z.string().min(1),
      paragraphs: z.array(z.string().min(1)).min(1),
    }),
    /** Another example this one shares context with, for the continuity demo. */
    connectedTo: z
      .object({ slug: z.string().min(1), note: z.string().min(20) })
      .optional(),
    relatedGenerators: z.array(ExampleLinkSchema).default([]),
    relatedAnswers: z.array(ExampleLinkSchema).default([]),
    relatedForPages: z.array(ExampleLinkSchema).default([]),
    relatedExamples: z.array(z.string()).default([]),
    /** Where this example was first published. */
    sourceUrl: z.string().url().optional(),
    seo: z.object({
      title: z.string().min(1),
      description: z.string().min(1),
      canonical: z.string().optional(),
    }),
  })
  .refine(
    (example) =>
      example.provenance === "raw" || Boolean(example.provenanceNote),
    {
      message:
        "provenanceNote is required when the output is not raw, so edited text is never presented as untouched generation",
      path: ["provenanceNote"],
    },
  );

export type ExampleConfig = z.infer<typeof ExampleConfigSchema>;
export type ExampleConfigInput = z.input<typeof ExampleConfigSchema>;
