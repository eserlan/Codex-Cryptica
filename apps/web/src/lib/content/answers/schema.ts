import { z } from "zod";
import { PublicLabelSchema } from "../labels";

/**
 * Answer pages (`/answers/[slug]`) are reference entries for real
 * RPG/worldbuilding questions people search for — not generator landing pages
 * and not dated blog posts.
 *
 * The rule this schema exists to enforce is structural, not stylistic: one page
 * owns one genuine user intent, and the substantive answer is data, so it lands
 * in crawler-visible HTML without a bespoke page implementation per question.
 *
 * British English throughout the content; see the editorial rules in #2563.
 */

/**
 * What kind of question the page answers. Drives nothing visual on its own —
 * it exists so the index can group answers and so a reviewer can spot two
 * pages competing for one intent.
 */
export const AnswerKindSchema = z.enum([
  "definition",
  "how-to",
  "framework",
  "comparison",
]);
export type AnswerKind = z.infer<typeof AnswerKindSchema>;

/** The four high-level category buckets used for browsing and navigation. */
export const AnswerCategoryIdSchema = z.enum([
  "getting-started",
  "session-prep",
  "worldbuilding",
  "campaign-notes",
]);
export type AnswerCategoryId = z.infer<typeof AnswerCategoryIdSchema>;

/**
 * Optional Discovery Intent Registry metadata (Constitution XIII).
 * Allows single-file answer authoring without editing the discovery registry separately.
 */
export const AnswerDiscoverySchema = z.object({
  id: z.string().optional(),
  parentCluster: z.string().min(1),
  primaryIntent: z.string().optional(),
  intentAliases: z.array(z.string()).default([]),
  uniqueValue: z.string().optional(),
  userJob: z
    .enum([
      "understand",
      "create",
      "see-an-example",
      "adopt-workflow",
      "evaluate",
      "migrate",
      "navigate",
      "reference",
    ])
    .default("understand"),
  relatedIntents: z.array(z.string()).default([]),
  acknowledgedOverlap: z
    .array(
      z.object({
        with: z.string(),
        reason: z.string(),
      }),
    )
    .default([]),
});
export type AnswerDiscovery = z.infer<typeof AnswerDiscoverySchema>;

/** A list item that may lead with a bolded term, e.g. "**Scale** — how far…". */
export const AnswerListItemSchema = z.object({
  /** Optional lead-in term rendered in the body face, before the text. */
  term: z.string().optional(),
  text: z.string(),
});
export type AnswerListItem = z.infer<typeof AnswerListItemSchema>;

const blockHeading = z.string().min(1);

/** An actionable CTA button or link within an answer section. */
export const AnswerCtaSchema = z.object({
  text: z.string().min(1),
  href: z.string().min(1),
  external: z.boolean().optional(),
  disclosure: z.string().optional(),
});
export type AnswerCta = z.infer<typeof AnswerCtaSchema>;

/** Plain explanatory prose. */
export const AnswerProseBlockSchema = z.object({
  kind: z.literal("prose"),
  heading: blockHeading.optional(),
  paragraphs: z.array(z.string().min(1)).min(1),
  cta: AnswerCtaSchema.optional(),
});

/** A framework, a set of criteria, or an ordered procedure. */
export const AnswerListBlockSchema = z.object({
  kind: z.literal("list"),
  heading: blockHeading.optional(),
  intro: z.string().optional(),
  ordered: z.boolean().optional(),
  items: z.array(AnswerListItemSchema).min(1),
  outro: z.string().optional(),
});

/**
 * A concrete tabletop/worldbuilding example. Rendered as a distinct block so a
 * reader skimming for "show me" can find it, and so a page that genuinely does
 * not need one simply omits it rather than padding.
 */
export const AnswerExampleBlockSchema = z.object({
  kind: z.literal("example"),
  heading: blockHeading,
  paragraphs: z.array(z.string().min(1)).min(1),
  items: z.array(AnswerListItemSchema).optional(),
});

/** A short practical takeaway the reader can act on at the table. */
export const AnswerChecklistBlockSchema = z.object({
  kind: z.literal("checklist"),
  heading: blockHeading,
  intro: z.string().optional(),
  items: z.array(z.string().min(1)).min(2),
});

export const AnswerBlockSchema = z.discriminatedUnion("kind", [
  AnswerProseBlockSchema,
  AnswerListBlockSchema,
  AnswerExampleBlockSchema,
  AnswerChecklistBlockSchema,
]);
export type AnswerBlock = z.infer<typeof AnswerBlockSchema>;

/** An internal link out to a live Codex surface or another answer. */
export const AnswerLinkSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  /**
   * Root-relative path to a **live** page. Answers must not link to features
   * that have not shipped — a broken promise reads worse than no link.
   */
  href: z.string().startsWith("/"),
});
export type AnswerLink = z.infer<typeof AnswerLinkSchema>;

export const AnswerConfigSchema = z.object({
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug must be kebab-case"),
  /** The question, verbatim, as the page's H1. */
  question: z.string().min(1),
  kind: AnswerKindSchema,
  /**
   * The direct answer: one self-contained paragraph that is useful on its own,
   * before any explanation or product material. Also the answer text in the
   * page's structured data, so it has to read correctly out of context.
   */
  shortAnswer: z.string().min(1),
  /** Body blocks, in the order the question needs them. */
  sections: z.array(AnswerBlockSchema).min(1),
  /**
   * How Codex Cryptica relates to the workflow — one honest paragraph after
   * the answer is already complete, not a sales interruption mid-article.
   */
  codexConnection: z
    .object({
      heading: z.string().min(1),
      paragraphs: z.array(z.string().min(1)).min(1),
      linkText: z.string().min(1),
      href: z.string().startsWith("/"),
    })
    .optional(),
  /** The category this answer belongs to for browsing and index organisation. */
  category: AnswerCategoryIdSchema,
  /**
   * Publication date (ISO format YYYY-MM-DD).
   * Used for chronological sorting and freshness indicators.
   */
  publishedAt: z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}$/,
      "publishedAt must be an ISO date string (YYYY-MM-DD)",
    ),
  relatedTools: z.array(AnswerLinkSchema).default([]),
  relatedForPages: z.array(AnswerLinkSchema).default([]),
  /** Slugs of other answers. Validated against the registry by its tests. */
  relatedAnswers: z.array(z.string()).default([]),
  /**
   * Public discovery labels (#2762). Chips linking to `/explore?label=X`.
   * From the shared canonical vocabulary — see `lib/content/labels.ts`.
   */
  labels: z.array(PublicLabelSchema).default([]),
  /** Optional discovery intent governance metadata. */
  discovery: AnswerDiscoverySchema.optional(),
  seo: z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    /** Defaults to `/answers/<slug>` when omitted. */
    canonical: z.string().optional(),
    image: z.string().url().optional(),
    imageAlt: z.string().min(10).optional(),
  }),
});
export type AnswerConfig = z.infer<typeof AnswerConfigSchema>;

/**
 * The authoring shape. Identical to `AnswerConfig` except the defaulted link
 * arrays may be omitted; parsing fills them in.
 */
export type AnswerConfigInput = z.input<typeof AnswerConfigSchema>;
