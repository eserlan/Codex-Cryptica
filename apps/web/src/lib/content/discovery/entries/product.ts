import type { DiscoveryEntryInput } from "../schema";

/**
 * Product-side discovery: `/solutions`, `/features` and the standalone landing
 * pages.
 *
 * This is where the registry earns its keep. These three families grew
 * separately and several of them circle the same two subjects — campaign
 * management and worldbuilding — from the same job (`evaluate`). The overlaps
 * below are recorded with reasons rather than quietly tolerated, and the pairs
 * that are genuinely hard to justify are marked so the audit keeps raising them.
 */
export const productEntries: DiscoveryEntryInput[] = [
  // --- /solutions ------------------------------------------------------
  {
    id: "solution-campaign-manager",
    pageKind: "solution",
    canonicalPath: "/solutions/campaign-manager",
    primaryIntent: "rpg campaign manager software",
    intentAliases: ["ttrpg campaign management app", "campaign organiser tool"],
    userJob: "evaluate",
    uniqueValue:
      "Documents the campaign-running feature set — graph navigation, maps, timelines, prep — for someone deciding whether the tool fits.",
    parentCluster: "campaign-management",
    relatedIntents: [
      "landing-free-rpg-campaign-manager",
      "answer-campaign-notes",
    ],
    indexable: true,
    status: "live",
  },
  {
    id: "solution-worldbuilding-tool",
    pageKind: "solution",
    canonicalPath: "/solutions/worldbuilding-tool",
    primaryIntent: "worldbuilding tool for rpg settings",
    intentAliases: ["visual worldbuilding wiki"],
    userJob: "evaluate",
    uniqueValue:
      "Documents the wiki-and-timeline worldbuilding surface, as distinct from running sessions at a table.",
    parentCluster: "worldbuilding",
    relatedIntents: ["landing-worldbuilding-tool"],
    indexable: true,
    status: "live",
    acknowledgedOverlap: [
      {
        with: "landing-worldbuilding-tool",
        reason:
          "Known duplication carried over from before this registry: /solutions/worldbuilding-tool and /worldbuilding-tool target near-identical intents. Recorded here so it is consolidated deliberately rather than rediscovered — see the audit notes in docs/discovery-intent-registry.md.",
      },
    ],
  },
  {
    id: "solution-ai-gm-assistant",
    pageKind: "solution",
    canonicalPath: "/solutions/ai-gm-assistant",
    primaryIntent: "ai game master assistant",
    intentAliases: ["ai gm helper", "ai assistant for running rpgs"],
    userJob: "evaluate",
    uniqueValue:
      "Documents the cooperative lore-drafting workflow and where the author stays in control of what becomes canon.",
    parentCluster: "ai-assistance",
    relatedIntents: ["solution-ai-dm-assistant", "feature-ai-gm-assistant"],
    indexable: true,
    status: "live",
    acknowledgedOverlap: [
      {
        with: "solution-ai-dm-assistant",
        reason:
          "GM and DM are the same role under two vocabularies, split across two URLs before this registry existed. Kept visible as a consolidation candidate rather than silently accepted.",
      },
      {
        with: "feature-ai-gm-assistant",
        reason:
          "Pre-existing split between the solution page and the feature page of the same name. Recorded as a known duplicate pending consolidation.",
      },
    ],
  },
  {
    id: "solution-ai-dm-assistant",
    pageKind: "solution",
    canonicalPath: "/solutions/ai-dm-assistant",
    primaryIntent: "ai dungeon master assistant",
    intentAliases: ["ai dm tool for dnd"],
    audience: "D&D-vocabulary searchers",
    userJob: "evaluate",
    uniqueValue:
      "Serves the D&D-specific 'DM' phrasing of the AI assistant intent, which searchers use in place of 'GM'.",
    parentCluster: "ai-assistance",
    relatedIntents: ["solution-ai-gm-assistant"],
    indexable: true,
    status: "live",
  },
  {
    id: "solution-ai-worldbuilding-tool",
    pageKind: "solution",
    canonicalPath: "/solutions/ai-worldbuilding-tool",
    primaryIntent: "ai worldbuilding tool",
    intentAliases: ["ai setting generator for worldbuilders"],
    userJob: "evaluate",
    uniqueValue:
      "Covers AI-assisted lore expansion for setting work specifically, rather than AI help while running a session.",
    parentCluster: "ai-assistance",
    indexable: true,
    status: "live",
  },
  {
    id: "solution-local-first-rpg",
    pageKind: "solution",
    canonicalPath: "/solutions/local-first-rpg",
    primaryIntent: "local first rpg campaign storage",
    intentAliases: ["private rpg notes no cloud"],
    userJob: "evaluate",
    uniqueValue:
      "Documents how vault data stays on the reader's machine and what that means for ownership and export.",
    parentCluster: "local-first-privacy",
    relatedIntents: [
      "feature-local-first-rpg-campaign-manager",
      "solution-offline-rpg-campaign-manager",
      "solution-local-first-worldbuilding-tool",
    ],
    indexable: true,
    status: "live",
  },
  {
    id: "solution-offline-rpg-campaign-manager",
    pageKind: "solution",
    canonicalPath: "/solutions/offline-rpg-campaign-manager",
    primaryIntent: "offline rpg campaign manager",
    intentAliases: ["rpg notes that work without internet"],
    userJob: "evaluate",
    uniqueValue:
      "Answers the offline-capability question specifically — what still works with no connection — which is a different worry from privacy.",
    parentCluster: "local-first-privacy",
    relatedIntents: ["solution-local-first-rpg"],
    indexable: true,
    status: "live",
    acknowledgedOverlap: [
      {
        with: "solution-local-first-rpg",
        reason:
          "Offline capability and local-first storage are adjacent but genuinely different reader worries: one asks 'does it work on a train', the other 'who holds my data'. Both are recorded so the distinction stays deliberate.",
      },
    ],
  },
  {
    id: "solution-local-first-worldbuilding-tool",
    pageKind: "solution",
    canonicalPath: "/solutions/local-first-worldbuilding-tool",
    primaryIntent: "local first worldbuilding tool",
    userJob: "evaluate",
    uniqueValue:
      "The local-first argument aimed at setting work rather than campaign running — long-lived material the author expects to outlive any app.",
    parentCluster: "local-first-privacy",
    relatedIntents: ["solution-local-first-rpg"],
    indexable: true,
    status: "live",
    acknowledgedOverlap: [
      {
        with: "solution-local-first-rpg",
        reason:
          "Same argument, two audiences (campaign runners and worldbuilders). Thin justification; flagged as a consolidation candidate.",
      },
    ],
  },
  {
    id: "solution-rpg-knowledge-graph",
    pageKind: "solution",
    canonicalPath: "/solutions/rpg-knowledge-graph",
    primaryIntent: "rpg knowledge graph",
    intentAliases: [
      "campaign relationship graph",
      "entity graph for worldbuilding",
    ],
    userJob: "evaluate",
    uniqueValue:
      "Documents the entity-and-relationship model itself — the one feature no comparable tool centres — with an interactive preview.",
    parentCluster: "relationship-modelling",
    relatedIntents: ["answer-npc-relationships"],
    indexable: true,
    status: "live",
  },

  // --- /features -------------------------------------------------------
  {
    id: "feature-local-first-rpg-campaign-manager",
    pageKind: "feature",
    canonicalPath: "/features/local-first-rpg-campaign-manager",
    primaryIntent: "how local first storage works in codex cryptica",
    userJob: "reference",
    uniqueValue:
      "Authoritative technical detail on OPFS storage, Markdown ownership and export, for a reader who has already decided to look closely.",
    parentCluster: "local-first-privacy",
    relatedIntents: ["solution-local-first-rpg"],
    indexable: true,
    status: "live",
  },
  {
    id: "feature-private-offline-worldbuilding-tool",
    pageKind: "feature",
    canonicalPath: "/features/private-offline-worldbuilding-tool",
    primaryIntent: "private offline worldbuilding tool",
    userJob: "reference",
    uniqueValue:
      "Feature-level documentation of what runs with no network and what never leaves the device.",
    parentCluster: "local-first-privacy",
    indexable: true,
    status: "live",
  },
  {
    id: "feature-ai-gm-assistant",
    pageKind: "feature",
    canonicalPath: "/features/ai-gm-assistant",
    primaryIntent: "codex cryptica ai assistant features",
    userJob: "reference",
    uniqueValue:
      "Feature-level detail of the Oracle: what context it sees, what it drafts, and what it never writes without confirmation.",
    parentCluster: "ai-assistance",
    relatedIntents: ["solution-ai-gm-assistant"],
    indexable: true,
    status: "live",
  },

  // --- standalone landing pages ---------------------------------------
  {
    id: "landing-free-rpg-campaign-manager",
    pageKind: "landing",
    canonicalPath: "/free-rpg-campaign-manager",
    primaryIntent: "free rpg campaign manager",
    intentAliases: ["free ttrpg campaign tool", "no cost campaign manager"],
    userJob: "evaluate",
    uniqueValue:
      "Owns the price-qualified intent — what is free, what it costs, and what the catch is not — which the generic solution page does not answer.",
    parentCluster: "campaign-management",
    relatedIntents: ["solution-campaign-manager"],
    indexable: true,
    status: "live",
    acknowledgedOverlap: [
      {
        with: "solution-campaign-manager",
        reason:
          "Price-qualified variant: this owns the 'is it actually free' question, which the solution page does not answer and which is a distinct reason to search.",
      },
    ],
  },
  {
    id: "landing-worldbuilding-tool",
    pageKind: "landing",
    canonicalPath: "/worldbuilding-tool",
    primaryIntent: "worldbuilding tool",
    intentAliases: ["worldbuilding app", "world building software"],
    userJob: "evaluate",
    uniqueValue:
      "Top-of-funnel landing page for the broadest worldbuilding query, ahead of the feature-level detail.",
    parentCluster: "worldbuilding",
    relatedIntents: ["solution-worldbuilding-tool"],
    indexable: true,
    status: "live",
  },
  {
    id: "landing-ai-rpg-campaign-manager",
    pageKind: "landing",
    canonicalPath: "/ai-rpg-campaign-manager",
    primaryIntent: "ai rpg campaign manager",
    intentAliases: ["campaign manager with ai"],
    userJob: "evaluate",
    uniqueValue:
      "The AI-qualified variant of the campaign-manager intent, for readers whose requirement starts with the AI rather than the notes.",
    parentCluster: "campaign-management",
    relatedIntents: ["solution-campaign-manager", "solution-ai-gm-assistant"],
    indexable: true,
    status: "live",
  },
  {
    id: "landing-responsible-ai-worldbuilding",
    pageKind: "landing",
    canonicalPath: "/responsible-ai-worldbuilding",
    primaryIntent: "responsible ai use in worldbuilding",
    intentAliases: ["is ai worldbuilding ethical", "ai and creative ownership"],
    userJob: "understand",
    uniqueValue:
      "States the product's AI principles and argues a position on authorship and consent — useful reading independent of the product.",
    parentCluster: "ai-assistance",
    indexable: true,
    status: "live",
  },
  {
    id: "explore-index",
    pageKind: "index",
    canonicalPath: "/explore",
    primaryIntent: "codex cryptica site directory",
    intentAliases: ["every codex cryptica page", "codex cryptica sitemap"],
    audience:
      "Existing app users navigating from the in-app footer or mobile menu, not organic searchers arriving cold.",
    userJob: "navigate",
    uniqueValue:
      "The in-app navigation index linked from the app footer and mobile drawer — points an existing user at every section (worlds, examples, tools, guides, legal) at once, rather than one family. /tools covers the same ground for an arriving searcher evaluating generators; this page exists so the app chrome has one link to maintain instead of several that drift.",
    relatedIntents: ["tools-index"],
    indexable: true,
    status: "live",
    acknowledgedOverlap: [
      {
        with: "tools-index",
        reason:
          "Both are comprehensive directories, but for different readers: tools-index is the SEO entry point for someone searching for generators, while explore-index is in-app chrome for someone already using the product who wants any section, tools included.",
      },
    ],
  },
];
