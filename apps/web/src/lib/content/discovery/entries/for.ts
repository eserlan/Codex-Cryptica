import type { DiscoveryEntryInput } from "../schema";

/**
 * `/for/[slug]` — system and genre guides.
 *
 * Every one of these does the same job (`adopt-workflow`) for a different
 * audience, which is why they can all exist: the differentiator is the campaign
 * style, not the phrasing. They sit in per-subject clusters rather than one
 * "for pages" cluster, so the audit compares each against the answers and
 * generators that share its subject.
 */
export const forEntries: DiscoveryEntryInput[] = [
  {
    id: "for-index",
    pageKind: "index",
    canonicalPath: "/for",
    primaryIntent: "which codex cryptica guide fits my campaign",
    intentAliases: ["codex cryptica for my game system"],
    userJob: "navigate",
    uniqueValue:
      "Directory of the system and genre guides, split by game system and genre so a reader can find the one that matches their table.",
    indexable: true,
    status: "live",
  },
  {
    id: "for-dungeons-and-dragons",
    pageKind: "for",
    canonicalPath: "/for/dungeons-and-dragons",
    primaryIntent: "dnd campaign manager",
    intentAliases: [
      "d&d campaign organiser",
      "dungeons and dragons campaign notes app",
    ],
    audience: "D&D 5e game masters",
    userJob: "adopt-workflow",
    uniqueValue:
      "Shows how a long D&D campaign's NPCs, factions and locations stay connected across an adventure path, with D&D-shaped examples.",
    parentCluster: "system-guides",
    indexable: true,
    status: "live",
  },
  {
    id: "for-pathfinder-2e",
    pageKind: "for",
    canonicalPath: "/for/pathfinder-2e",
    primaryIntent: "pathfinder 2e campaign manager",
    intentAliases: ["pf2e campaign organiser"],
    audience: "Pathfinder 2e game masters",
    userJob: "adopt-workflow",
    uniqueValue:
      "Pathfinder-specific campaign structure — adventure paths, factions and the volume of published lore a PF2e table carries.",
    parentCluster: "system-guides",
    indexable: true,
    status: "live",
  },
  {
    id: "for-call-of-cthulhu",
    pageKind: "for",
    canonicalPath: "/for/call-of-cthulhu",
    primaryIntent: "call of cthulhu campaign manager",
    intentAliases: ["coc keeper notes app"],
    audience: "Call of Cthulhu keepers",
    userJob: "adopt-workflow",
    uniqueValue:
      "Investigation-shaped organisation — clues, handouts and what each investigator has learned — rather than generic campaign notes.",
    parentCluster: "system-guides",
    indexable: true,
    status: "live",
  },
  {
    id: "for-delta-green",
    pageKind: "for",
    canonicalPath: "/for/delta-green",
    primaryIntent: "delta green campaign manager",
    intentAliases: ["delta green handler notes"],
    audience: "Delta Green handlers",
    userJob: "adopt-workflow",
    uniqueValue:
      "Cell structure, need-to-know compartmentalisation and operation records specific to Delta Green's conspiracy frame.",
    parentCluster: "system-guides",
    indexable: true,
    status: "live",
  },
  {
    id: "for-vampire-the-masquerade",
    pageKind: "for",
    canonicalPath: "/for/vampire-the-masquerade",
    primaryIntent: "vampire the masquerade chronicle manager",
    intentAliases: ["v5 chronicle notes", "vtm storyteller tool"],
    audience: "Vampire: The Masquerade storytellers",
    userJob: "adopt-workflow",
    uniqueValue:
      "Kindred politics as a web of boons, domains and Touchstones — the specific relationship shape a Vampire chronicle generates.",
    parentCluster: "system-guides",
    indexable: true,
    status: "live",
  },
  {
    id: "for-cyberpunk-red",
    pageKind: "for",
    canonicalPath: "/for/cyberpunk-red",
    primaryIntent: "cyberpunk red campaign manager",
    intentAliases: ["cyberpunk rpg gm notes"],
    audience: "Cyberpunk RED game masters",
    userJob: "adopt-workflow",
    uniqueValue:
      "Corporations, gangs, fixers and the favour economy between them, organised the way a Night City campaign actually accumulates.",
    parentCluster: "system-guides",
    indexable: true,
    status: "live",
  },
  {
    id: "for-traveller",
    pageKind: "for",
    canonicalPath: "/for/traveller",
    primaryIntent: "traveller rpg campaign manager",
    intentAliases: ["traveller subsector notes"],
    audience: "Traveller referees",
    userJob: "adopt-workflow",
    uniqueValue:
      "Jump-linked subsectors, worlds, patrons and trade tracked as a connected sandbox rather than a stack of world profiles.",
    parentCluster: "system-guides",
    indexable: true,
    status: "live",
  },
  {
    id: "for-fantasy-worldbuilding",
    pageKind: "for",
    canonicalPath: "/for/fantasy-worldbuilding",
    primaryIntent: "fantasy worldbuilding software",
    intentAliases: ["fantasy setting bible tool", "build a fantasy world app"],
    audience: "Fantasy worldbuilders",
    userJob: "adopt-workflow",
    uniqueValue:
      "Setting-scale worldbuilding — realms, dynasties, faiths and centuries of history — rather than session-to-session campaign running.",
    parentCluster: "genre-guides",
    indexable: true,
    status: "live",
  },
  {
    id: "for-gothic-horror",
    pageKind: "for",
    canonicalPath: "/for/gothic-horror",
    primaryIntent: "gothic horror campaign worldbuilding",
    audience: "Gothic horror game masters",
    userJob: "adopt-workflow",
    uniqueValue:
      "Bloodlines, curses and decaying estates — the inheritance-shaped relationships gothic campaigns run on.",
    parentCluster: "genre-guides",
    indexable: true,
    status: "live",
  },
  {
    id: "for-cosmic-horror",
    pageKind: "for",
    canonicalPath: "/for/cosmic-horror",
    primaryIntent: "cosmic horror campaign worldbuilding",
    audience: "Cosmic horror game masters",
    userJob: "adopt-workflow",
    uniqueValue:
      "Escalating revelation tracked against what each investigator knows, for campaigns where the truth is the antagonist.",
    parentCluster: "genre-guides",
    indexable: true,
    status: "live",
  },
  {
    id: "for-conspiracy",
    pageKind: "for",
    canonicalPath: "/for/conspiracy",
    primaryIntent: "conspiracy campaign management tool",
    intentAliases: ["intrigue campaign organiser", "conspiracy board for rpg"],
    audience: "Game masters running conspiracy and intrigue campaigns",
    userJob: "adopt-workflow",
    uniqueValue:
      "Fronts, handlers, compromised assets and dossiers held as a workspace — the tooling side, not the technique.",
    parentCluster: "conspiracy-campaigns",
    indexable: true,
    status: "live",
  },
  {
    id: "for-dystopian-sci-fi",
    pageKind: "for",
    canonicalPath: "/for/dystopian-sci-fi",
    primaryIntent: "dystopian sci fi campaign worldbuilding",
    audience: "Dystopian science-fiction game masters",
    userJob: "adopt-workflow",
    uniqueValue:
      "Regimes, resistance cells and surveillance apparatus, with the asymmetric information a dystopian campaign depends on.",
    parentCluster: "genre-guides",
    indexable: true,
    status: "live",
  },
  {
    id: "for-space-opera",
    pageKind: "for",
    canonicalPath: "/for/space-opera",
    primaryIntent: "space opera campaign worldbuilding",
    audience: "Space opera game masters",
    userJob: "adopt-workflow",
    uniqueValue:
      "Systems, governments, crews and trade routes across a galaxy-scale setting with many simultaneous polities.",
    parentCluster: "genre-guides",
    indexable: true,
    status: "live",
  },
  {
    id: "for-space-western",
    pageKind: "for",
    canonicalPath: "/for/space-western",
    primaryIntent: "space western campaign worldbuilding",
    intentAliases: ["space western campaign manager", "space western gm notes"],
    audience: "Space Western game masters",
    userJob: "adopt-workflow",
    uniqueValue:
      "A frontier-scale campaign workflow for ships, outposts, contested claims and the personal obligations that bind an isolated sector together.",
    parentCluster: "genre-guides",
    relatedIntents: [
      "for-space-opera",
      "for-scum-and-villainy",
      "hub-space-western",
    ],
    indexable: true,
    status: "live",
  },
  {
    id: "for-scum-and-villainy",
    pageKind: "for",
    canonicalPath: "/for/scum-and-villainy",
    primaryIntent: "scum and villainy campaign manager",
    intentAliases: [
      "space scoundrels campaign organiser",
      "scum and villainy gm notes",
    ],
    audience: "Scum and Villainy game masters",
    userJob: "adopt-workflow",
    uniqueValue:
      "Crews, modified starships, criminal syndicates, ship debt, and sector heat tracked as a connected underworld sandbox.",
    parentCluster: "system-guides",
    indexable: true,
    status: "live",
  },
];
