import type { DiscoveryEntryInput } from "../schema";

/**
 * `/tools/*` — the older informational generator landing pages.
 *
 * These predate `/generators/*`, and `llms.txt` already describes them as
 * "informational landing pages" that link into the canonical interactive tools.
 * That makes them the sharpest cannibalisation risk on the site: several target
 * a genre-qualified phrasing of an intent a `/generators` page already owns,
 * with the same `create` job.
 *
 * They are recorded here **without** `acknowledgedOverlap` on purpose. The audit
 * should keep reporting them until someone decides whether to consolidate or to
 * give each a job the generator does not do — see the audit notes in
 * `docs/discovery-intent-registry.md`.
 */
export const toolEntries: DiscoveryEntryInput[] = [
  {
    id: "tools-index",
    pageKind: "index",
    canonicalPath: "/tools",
    primaryIntent: "rpg tools and generators directory",
    intentAliases: ["codex cryptica tools hub"],
    userJob: "navigate",
    uniqueValue:
      "The one directory covering every public surface — generators, answers, solutions, comparisons and importers — rather than a single family.",
    indexable: true,
    status: "live",
  },
  {
    id: "tools-dnd-npc-generator",
    pageKind: "tool",
    canonicalPath: "/tools/dnd-npc-generator",
    primaryIntent: "d&d npc generator landing page",
    intentAliases: ["dnd 5e npc maker"],
    userJob: "create",
    uniqueValue:
      "Long-standing entry point for D&D-qualified NPC queries, with fuller on-page explanation than the generator route carries.",
    parentCluster: "npc-creation",
    relatedIntents: ["generator-dnd-npc"],
    indexable: true,
    status: "live",
  },
  {
    id: "tools-rpg-npc-generator",
    pageKind: "tool",
    canonicalPath: "/tools/rpg-npc-generator",
    primaryIntent: "system agnostic npc generator",
    intentAliases: ["npc generator for any rpg"],
    userJob: "create",
    uniqueValue:
      "Entry point for genre-neutral NPC queries across six themes, with explanatory copy the generator route does not carry.",
    parentCluster: "npc-creation",
    relatedIntents: ["generator-npc"],
    indexable: true,
    status: "live",
  },
  {
    id: "tools-faction-generator",
    pageKind: "tool",
    canonicalPath: "/tools/faction-generator",
    primaryIntent: "fantasy faction generator",
    intentAliases: ["fantasy guild generator"],
    userJob: "create",
    uniqueValue:
      "Fantasy-qualified entry point for faction queries, with worked examples of agendas and rivalries on the page.",
    parentCluster: "faction-creation",
    relatedIntents: ["generator-faction"],
    indexable: true,
    status: "live",
  },
  {
    id: "tools-fantasy-name-generator",
    pageKind: "tool",
    canonicalPath: "/tools/fantasy-name-generator",
    primaryIntent: "fantasy name generator landing page",
    intentAliases: ["fantasy names for characters and places"],
    userJob: "create",
    uniqueValue:
      "Long-standing entry point for fantasy naming queries, covering ten cultural styles on the page itself.",
    parentCluster: "naming",
    relatedIntents: ["generator-fantasy-names"],
    indexable: true,
    status: "live",
  },
  {
    id: "tools-quest-hook-generator",
    pageKind: "tool",
    canonicalPath: "/tools/quest-hook-generator",
    primaryIntent: "quest hook generator",
    intentAliases: ["adventure seed generator"],
    userJob: "create",
    uniqueValue:
      "Entry point for quest-hook and adventure-seed queries specifically, as distinct from full quest structures.",
    parentCluster: "quest-design",
    relatedIntents: ["generator-quest"],
    indexable: true,
    status: "live",
  },
  {
    id: "tools-vampire-clan-generator",
    pageKind: "tool",
    canonicalPath: "/tools/vampire-clan-generator",
    primaryIntent: "gothic vampire clan generator",
    intentAliases: ["world of darkness clan generator"],
    userJob: "create",
    uniqueValue:
      "Entry point for World of Darkness-style clan queries, with gothic framing the generic generator route does not use.",
    parentCluster: "faction-creation",
    relatedIntents: ["generator-vampire-clan"],
    indexable: true,
    status: "live",
  },
  {
    id: "tools-cyberpunk-nomad-clan-generator",
    pageKind: "tool",
    canonicalPath: "/tools/cyberpunk-nomad-clan-generator",
    primaryIntent: "cyberpunk nomad clan landing page",
    intentAliases: ["nomad convoy generator"],
    userJob: "create",
    uniqueValue:
      "Entry point for cyberpunk nomad queries, with convoy-culture framing on the page.",
    parentCluster: "faction-creation",
    relatedIntents: ["generator-nomad-clan"],
    indexable: true,
    status: "live",
  },
  {
    id: "tool-silhouettes",
    pageKind: "tool",
    canonicalPath: "/silhouettes",
    primaryIntent: "vector rpg silhouettes and token art",
    intentAliases: [
      "free rpg vector tokens",
      "ttrpg character silhouettes svg",
      "tabletop rpg silhouette art",
    ],
    userJob: "create",
    uniqueValue:
      "Interactive, theme-customizable gallery of 48+ CC-licensed vector silhouettes for RPG entities with live color palette preview, clipboard SVG copy, and SVG asset downloads.",
    parentCluster: "visual-assets",
    indexable: true,
    status: "live",
  },
];
