import type { DiscoveryEntryInput } from "../schema";

/**
 * Evergreen blog entries only.
 *
 * The blog is mostly a dated devlog, and dated release notes are not discovery
 * pages — registering all twenty-odd of them would burden ordinary work for no
 * benefit, which the governance rule explicitly warns against. What is
 * registered here is the subset that argues an evergreen position and therefore
 * competes with a `/solutions`, `/vs` or `/answers` page for the same reader.
 *
 * The test for adding one: would this post still be the right result for a
 * search query in two years, and does something else on the site already claim
 * that query?
 */
export const blogEntries: DiscoveryEntryInput[] = [
  {
    id: "blog-index",
    pageKind: "index",
    canonicalPath: "/blog",
    primaryIntent: "codex cryptica devlog",
    intentAliases: ["codex cryptica blog", "development updates"],
    userJob: "navigate",
    uniqueValue:
      "Dated development log and essay archive; the entry point for readers following the project rather than searching for a capability.",
    indexable: true,
    status: "live",
  },
  {
    id: "blog-vs-obsidian",
    pageKind: "blog",
    canonicalPath: "/blog/why-codex-cryptica-over-obsidian",
    primaryIntent: "codex cryptica vs obsidian for worldbuilding",
    intentAliases: ["obsidian alternative for rpg campaigns"],
    userJob: "evaluate",
    uniqueValue:
      "Argues a position on why a purpose-built tool differs from assembling an Obsidian workflow — an opinion piece, where /vs pages are structured comparisons.",
    parentCluster: "migration",
    relatedIntents: ["import-obsidian-vault"],
    indexable: true,
    status: "live",
    acknowledgedOverlap: [
      {
        with: "import-obsidian-vault",
        reason:
          "The post argues why someone might switch; the import page tells someone who already decided how to move their files. Evaluate versus migrate.",
      },
    ],
  },
  {
    id: "blog-data-sovereignty",
    pageKind: "blog",
    canonicalPath: "/blog/gm-guide-data-sovereignty",
    primaryIntent: "why local first matters for rpg campaign data",
    intentAliases: ["own your rpg campaign files", "rpg data portability"],
    userJob: "understand",
    uniqueValue:
      "Makes the case for data ownership as a concept a GM should care about, independent of any product's feature list.",
    parentCluster: "local-first-privacy",
    relatedIntents: ["solution-local-first-rpg"],
    indexable: true,
    status: "live",
    acknowledgedOverlap: [
      {
        with: "solution-local-first-rpg",
        reason:
          "The post explains why the property matters; the solution page documents how Codex provides it. Understand versus evaluate.",
      },
    ],
  },
  {
    id: "blog-worldbuilding-without-ai",
    pageKind: "blog",
    canonicalPath: "/blog/worldbuilding-tool-without-ai",
    primaryIntent: "worldbuilding tool that works without ai",
    intentAliases: ["non ai worldbuilding software"],
    userJob: "evaluate",
    uniqueValue:
      "Owns the AI-sceptical query — readers actively looking for a tool that does not require AI — which no product page addresses head-on.",
    parentCluster: "ai-assistance",
    indexable: true,
    status: "live",
  },
  {
    id: "blog-ai-slop-context",
    pageKind: "blog",
    canonicalPath: "/blog/ai-slop-is-context-failure",
    primaryIntent: "why ai worldbuilding output is generic",
    intentAliases: [
      "ai slop worldbuilding",
      "how to make ai lore less generic",
    ],
    userJob: "understand",
    uniqueValue:
      "Diagnoses generic AI output as a context problem rather than a prose problem, with a structural argument that stands on its own.",
    parentCluster: "ai-assistance",
    relatedIntents: ["landing-responsible-ai-worldbuilding"],
    indexable: true,
    status: "live",
  },
];
