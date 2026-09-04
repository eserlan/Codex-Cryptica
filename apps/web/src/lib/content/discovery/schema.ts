import { z } from "zod";

/**
 * The discovery intent registry (#2566).
 *
 * One question, answered in one place: **what user intent are we serving,
 * which page owns it, and what unique value makes that page deserve to exist?**
 *
 * This is deliberately NOT a keyword-to-page generator. It exists to stop the
 * public surface cannibalising itself as it grows — an entry is written
 * *because a page is being proposed*, and writing one is meant to be the moment
 * someone notices the intent already has an owner.
 *
 * Two pages may serve the same subject as long as they do materially different
 * jobs for the reader (explain a point crawl / generate one / show a finished
 * one). They may not serve the same job under two URLs.
 *
 * The registry stores only what nothing else owns: intent, job and rationale.
 * Titles, descriptions and body copy stay in their existing content modules —
 * see `docs/discovery-intent-registry.md`.
 */

/**
 * Which public family a page belongs to. Drives which route a canonical path is
 * expected to match, and lets the audit reason about clusters family by family.
 */
export const DiscoveryPageKindSchema = z.enum([
  "for",
  "answer",
  "example",
  "generator",
  "tool",
  "hub",
  "solution",
  "comparison",
  "import",
  "feature",
  "landing",
  "index",
  "blog",
  "other",
]);
export type DiscoveryPageKind = z.infer<typeof DiscoveryPageKindSchema>;

/**
 * Lifecycle. `planned` entries are registered before the page is built — that
 * is the point of the workflow — so the audit holds them to a lower bar than a
 * live page while still requiring a job and a rationale.
 */
export const DiscoveryStatusSchema = z.enum(["planned", "live", "retired"]);
export type DiscoveryStatus = z.infer<typeof DiscoveryStatusSchema>;

/**
 * What the reader is trying to *do*, as distinct from what the page is about.
 *
 * This is the field that makes coexistence decidable. `/answers/what-is-a-point-crawl`
 * and a point-crawl generator share a subject and differ here, so both may
 * exist; two pages sharing both a subject and a job may not.
 */
export const DiscoveryUserJobSchema = z.enum([
  "understand", // learn what something is or how it works
  "create", // produce an artefact right now
  "see-an-example", // look at a finished, concrete output
  "adopt-workflow", // learn how Codex supports a way of working
  "evaluate", // compare options before choosing
  "migrate", // move existing material in
  "navigate", // find the right page in a family
  "reference", // look up authoritative product/feature detail
]);
export type DiscoveryUserJob = z.infer<typeof DiscoveryUserJobSchema>;

const rootRelativePath = z
  .string()
  .startsWith("/", "canonicalPath must be root-relative")
  .refine((value) => !value.endsWith("/") || value === "/", {
    message: "canonicalPath must not have a trailing slash",
  });

export const DiscoveryEntrySchema = z.object({
  /** Stable identifier, unique across the registry. Kebab-case. */
  id: z
    .string()
    .min(1)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "id must be kebab-case"),
  pageKind: DiscoveryPageKindSchema,
  /** The one URL that owns this intent. Root-relative, no trailing slash. */
  canonicalPath: rootRelativePath,
  /**
   * The intent in the reader's words, normalised: lower case, no punctuation.
   * Two indexable pages must not claim the same one — that is the check the
   * whole registry exists to make possible.
   */
  primaryIntent: z
    .string()
    .min(3)
    .regex(
      /^[a-z0-9][a-z0-9 '&/+-]*$/,
      "primaryIntent must be lower case, unpunctuated prose",
    ),
  /**
   * Natural phrasings of the *same* intent: word-order changes, plurals,
   * obvious synonyms. These belong here, not at new URLs. The audit rejects an
   * alias that another entry has claimed as its primary intent.
   */
  intentAliases: z.array(z.string().min(3)).default([]),
  /** Who is asking. Free text; omitted when the page is not audience-specific. */
  audience: z.string().min(3).optional(),
  userJob: DiscoveryUserJobSchema,
  /**
   * Why this page deserves to exist beyond containing the keyword. "Targets
   * another phrasing" is not a reason, and the audit will not accept a
   * rationale that merely restates the intent.
   */
  uniqueValue: z.string().min(20),
  /** Ids of entries a reader might reasonably confuse this with. */
  relatedIntents: z.array(z.string()).default([]),
  /**
   * Groups entries that circle one subject from different jobs. Deliberate
   * overlap lives inside a cluster; the audit reports clusters so a human can
   * see the shape of each one.
   */
  parentCluster: z.string().min(2).optional(),
  /** Whether the page is meant to be indexed. Redirect stubs are not. */
  indexable: z.boolean(),
  status: DiscoveryStatusSchema,
  /**
   * Overlap the team has looked at and accepted, with the reason. Recorded so a
   * later reviewer inherits the decision instead of re-litigating it — and so
   * the audit can distinguish "known" from "new".
   */
  acknowledgedOverlap: z
    .array(
      z.object({
        /** Id of the other entry. */
        with: z.string().min(1),
        /** Why both are justified. */
        reason: z.string().min(20),
      }),
    )
    .default([]),
});
export type DiscoveryEntry = z.infer<typeof DiscoveryEntrySchema>;

/** Authoring shape: the defaulted array fields may be omitted. */
export type DiscoveryEntryInput = z.input<typeof DiscoveryEntrySchema>;
