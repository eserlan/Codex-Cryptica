import type { DiscoveryEntryInput } from "../schema";

/**
 * Switching intents: `/vs`, `/import` and `/migrations`.
 *
 * Comparison and import pages target the same competitors, which is the obvious
 * cannibalisation risk in this group. They are separated by job — `evaluate`
 * versus `migrate` — and that separation is load-bearing: a comparison page
 * that starts explaining how to run the import has taken over the import page's
 * intent, and vice versa.
 */
export const migrationEntries: DiscoveryEntryInput[] = [
  {
    id: "migrations-index",
    pageKind: "index",
    canonicalPath: "/migrations",
    primaryIntent: "which tools can i import a campaign from",
    intentAliases: ["migration hub"],
    userJob: "navigate",
    uniqueValue:
      "Directory of every supported import source, so a reader can find their own tool without guessing at URLs.",
    parentCluster: "migration",
    indexable: true,
    status: "live",
  },

  // --- comparisons ------------------------------------------------------
  {
    id: "comparison-world-anvil",
    pageKind: "comparison",
    canonicalPath: "/vs/world-anvil",
    primaryIntent: "codex cryptica vs world anvil",
    intentAliases: ["world anvil alternative", "world anvil comparison"],
    userJob: "evaluate",
    uniqueValue:
      "Side-by-side comparison for someone choosing between the two, including where World Anvil is the better fit.",
    parentCluster: "migration",
    relatedIntents: ["import-world-anvil-export"],
    indexable: true,
    status: "live",
    acknowledgedOverlap: [
      {
        with: "import-world-anvil-export",
        reason:
          "Same competitor, different job: the comparison serves a reader still deciding, the import page serves one who has already decided and needs instructions.",
      },
    ],
  },
  {
    id: "comparison-kanka",
    pageKind: "comparison",
    canonicalPath: "/vs/kanka-alternative",
    primaryIntent: "codex cryptica vs kanka",
    intentAliases: ["kanka alternative", "kanka comparison"],
    userJob: "evaluate",
    uniqueValue:
      "Side-by-side comparison against Kanka for a reader choosing between them.",
    parentCluster: "migration",
    relatedIntents: ["import-kanka-json"],
    indexable: true,
    status: "live",
    acknowledgedOverlap: [
      {
        with: "import-kanka-json",
        reason:
          "Same competitor, different job — evaluate before switching versus migrate after deciding.",
      },
    ],
  },
  {
    id: "comparison-obsidian",
    pageKind: "comparison",
    canonicalPath: "/vs/obsidian",
    primaryIntent: "codex cryptica vs obsidian",
    intentAliases: ["obsidian for rpg campaigns comparison"],
    userJob: "evaluate",
    uniqueValue:
      "Structured comparison against Obsidian for a reader choosing between a general note tool and a purpose-built one.",
    parentCluster: "migration",
    relatedIntents: ["import-obsidian-vault", "blog-vs-obsidian"],
    indexable: true,
    status: "live",
    acknowledgedOverlap: [
      {
        with: "blog-vs-obsidian",
        reason:
          "The /vs page is a structured feature comparison; the blog post argues a position on why the tools differ in shape. Kept separate deliberately, but the pair is the closest on the site and worth revisiting if either drifts.",
      },
    ],
  },
  {
    id: "comparison-legendkeeper",
    pageKind: "comparison",
    canonicalPath: "/vs/legendkeeper",
    primaryIntent: "codex cryptica vs legendkeeper",
    intentAliases: ["legendkeeper alternative"],
    userJob: "evaluate",
    uniqueValue:
      "Structured comparison against LegendKeeper, including where its visual map-first approach is the better fit.",
    parentCluster: "migration",
    relatedIntents: ["import-legendkeeper-json"],
    indexable: true,
    status: "live",
    acknowledgedOverlap: [
      {
        with: "import-legendkeeper-json",
        reason:
          "Same competitor, different job — evaluate before switching versus migrate after deciding.",
      },
    ],
  },
  {
    id: "alternatives-redirect",
    pageKind: "other",
    canonicalPath: "/alternatives",
    primaryIntent: "alternatives redirect surface",
    userJob: "navigate",
    uniqueValue:
      "Redirect-only family: /alternatives/[slug] 301s to the canonical /vs page, so alternative phrasings do not become indexable duplicates. Registered precisely so nobody later mistakes it for a page family worth filling in.",
    parentCluster: "migration",
    indexable: false,
    status: "live",
  },

  // --- imports ----------------------------------------------------------
  {
    id: "import-obsidian-vault",
    pageKind: "import",
    canonicalPath: "/import/obsidian-vault",
    primaryIntent: "import an obsidian vault into codex cryptica",
    intentAliases: ["obsidian to codex cryptica", "migrate obsidian rpg notes"],
    userJob: "migrate",
    uniqueValue:
      "Step-by-step instructions for converting Obsidian Markdown and wikilinks, including what does and does not survive.",
    parentCluster: "migration",
    indexable: true,
    status: "live",
  },
  {
    id: "import-world-anvil-export",
    pageKind: "import",
    canonicalPath: "/import/world-anvil-export",
    primaryIntent: "import a world anvil export",
    intentAliases: ["world anvil json import", "move world anvil articles"],
    userJob: "migrate",
    uniqueValue:
      "Instructions for World Anvil JSON backups, including the HTML cleanup the export needs.",
    parentCluster: "migration",
    relatedIntents: ["comparison-world-anvil"],
    indexable: true,
    status: "live",
  },
  {
    id: "import-kanka-json",
    pageKind: "import",
    canonicalPath: "/import/kanka-json",
    primaryIntent: "import a kanka campaign export",
    intentAliases: ["kanka json import"],
    userJob: "migrate",
    uniqueValue:
      "Instructions for Kanka campaign JSON, including how entity types map across.",
    parentCluster: "migration",
    relatedIntents: ["comparison-kanka"],
    indexable: true,
    status: "live",
  },
  {
    id: "import-legendkeeper-json",
    pageKind: "import",
    canonicalPath: "/import/legendkeeper-json",
    primaryIntent: "import a legendkeeper export",
    intentAliases: ["legendkeeper json import"],
    userJob: "migrate",
    uniqueValue:
      "Instructions for LegendKeeper exports, including how slate blocks and maps are converted into folders.",
    parentCluster: "migration",
    indexable: true,
    status: "live",
  },
  {
    id: "import-scabard",
    pageKind: "import",
    canonicalPath: "/import/scabard",
    primaryIntent: "import a scabard campaign",
    intentAliases: ["scabard json import"],
    userJob: "migrate",
    uniqueValue:
      "Instructions for Scabard exports, including how its pages, categories and connections map onto entities and links.",
    parentCluster: "migration",
    indexable: true,
    status: "live",
  },
  {
    id: "import-thread-weaver",
    pageKind: "import",
    canonicalPath: "/import/thread-weaver",
    primaryIntent: "import a thread weaver campaign",
    userJob: "migrate",
    uniqueValue:
      "Instructions for Thread Weaver Engine exports and which of its record types come across.",
    parentCluster: "migration",
    indexable: true,
    status: "live",
  },
];
