import type { InScopeQuestion, OutOfScopeQuestion } from "./questions";

/**
 * Questions for the screens and topics added in phase A (#3615), written in the
 * words a player or GM would use, before any retrieval score was looked at.
 * `split` was fixed at the same time: `holdout` questions are only ever read to
 * check a result, never to choose a setting or reword an article.
 */
const q = (
  topic: string,
  split: InScopeQuestion["split"],
  screen: InScopeQuestion["screen"],
  question: string,
  expect: string[],
  alsoExpect?: string[],
): InScopeQuestion => ({ topic, split, screen, question, expect, alsoExpect });

export const PHASE_A_IN_SCOPE: InScopeQuestion[] = [
  // Canvas
  q("canvas", "tune", "canvas", "How do I put a character on the canvas?", [
    "canvas-add-entities",
    "registry:canvas",
  ]),
  q("canvas", "tune", "canvas", "Can I draw on the canvas?", [
    "spatial-canvas",
  ]),
  q(
    "canvas",
    "holdout",
    "canvas",
    "How do I name the line between two cards?",
    ["spatial-canvas"],
  ),
  q(
    "canvas",
    "tune",
    "canvas",
    "What happens if I add the same entity to a canvas twice?",
    ["canvas-add-entities"],
  ),
  q("canvas", "tune", "canvas", "Can I make more than one canvas?", [
    "canvas-add-entities",
    "spatial-canvas",
  ]),
  q("canvas", "holdout", "canvas", "How do I rotate a card?", [
    "spatial-canvas",
  ]),
  q(
    "canvas",
    "tune",
    "canvas",
    "How do I put a file from my computer on the board?",
    ["canvas-add-entities"],
  ),
  q("canvas", "holdout", "canvas", "Is my canvas layout saved?", [
    "spatial-canvas",
  ]),
  q("canvas", "holdout", "canvas", "What is the canvas for?", [
    "registry:canvas",
    "spatial-canvas",
  ]),

  // Maps and VTT
  q("map", "tune", "map", "How do I drop a pin on the map?", ["map-mode"]),
  q("map", "tune", "map", "How do I hide parts of the map from my players?", [
    "map-mode",
    "fog-of-war",
    "vtt-fog-player-view",
  ]),
  q("map", "holdout", "map", "Can I start a game session from a map?", [
    "vtt-session",
    "map-mode",
    "vtt-multiplayer",
  ]),
  q("map", "tune", "map", "How do I move a token?", [
    "vtt-session",
    "vtt-tokens",
  ]),
  q("map", "tune", "map", "How do I measure distance on the map?", [
    "vtt-session",
  ]),
  q("map", "holdout", "map", "How do I add a character to initiative?", [
    "vtt-combat-initiative",
  ]),
  q("map", "holdout", "map", "Why can't my player move their token?", [
    "vtt-tokens",
    "vtt-troubleshooting",
  ]),
  q("map", "holdout", "map", "How do I save an encounter to come back to?", [
    "vtt-combat-initiative",
  ]),
  q("map", "holdout", "map", "How do I stock dungeon tiles with encounters?", [
    "vtt-tiles-layers-notes",
  ]),
  q("map", "holdout", "map", "How do I start voice chat with my players?", [
    "vtt-multiplayer",
  ]),
  q("map", "holdout", "map", "How do I change the grid scale to miles?", [
    "vtt-grids-measurement",
  ]),
  q(
    "map",
    "holdout",
    "map",
    "What is the difference between map fog and a hidden entity?",
    ["vtt-fog-player-view", "fog-of-war"],
  ),
  q(
    "map",
    "holdout",
    "map",
    "How do I line the hex grid up with hexes already on my map?",
    ["vtt-grids-measurement", "hexcrawl-maps"],
  ),
  q("map", "holdout", "map", "Where do I open the grid settings?", [
    "vtt-grids-measurement",
    "hexcrawl-maps",
  ]),
  q("map", "holdout", "map", "Where is the button for Explore and Combat?", [
    "vtt-session",
    "vtt-combat-initiative",
  ]),
  q("map", "holdout", "map", "How do I reveal just one hex on a hex map?", [
    "hexcrawl-maps",
  ]),
  q(
    "map",
    "holdout",
    "map",
    "How do I point something out to the players on the map?",
    ["vtt-session"],
  ),
  q("map", "tune", "map", "Can I have a map inside another map?", ["map-mode"]),
  q("map", "holdout", "map", "What is the map page for?", [
    "registry:vtt-map",
    "map-mode",
  ]),
  q(
    "map",
    "tune",
    "map",
    "How do I track hit points for a monster in a fight?",
    ["vtt-session", "stat-sheets"],
  ),

  // Import
  q("import", "tune", "import", "How do I bring in my old notes?", [
    "importing",
    "registry:archive-import",
  ]),
  q("import", "tune", "import", "What kinds of files can I import?", [
    "importing",
  ]),
  q(
    "import",
    "holdout",
    "import",
    "Will importing overwrite entries I already have?",
    ["importing"],
  ),
  q("import", "tune", "import", "Can I import a Kanka campaign?", [
    "importing",
  ]),
  q("import", "tune", "import", "What happens if my import gets interrupted?", [
    "importing",
  ]),
  q(
    "import",
    "holdout",
    "import",
    "How do I import a Thread Weaver campaign?",
    ["thread-weaver-import"],
  ),
  q("import", "tune", "import", "Do images come along when I import files?", [
    "importing",
  ]),
  q("import", "holdout", "import", "What is the import page for?", [
    "registry:archive-import",
    "importing",
  ]),
  q("import", "tune", "import", "Can I drag in a whole folder?", ["importing"]),

  // Settings, backup and export
  q("settings", "tune", "graph", "How do I download a backup of my vault?", [
    "export-and-backup",
    "registry:backup-and-restore",
  ]),
  q("settings", "tune", "settings", "How do I restore a backup?", [
    "export-and-backup",
    "registry:backup-and-restore",
  ]),
  q(
    "settings",
    "holdout",
    "settings",
    "Will restoring a backup overwrite my current vault?",
    ["export-and-backup"],
  ),
  q("settings", "tune", "settings", "Where is the Export Backup button?", [
    "registry:backup-and-restore",
    "export-and-backup",
  ]),
  q("settings", "tune", "settings", "Does the backup work in Firefox?", [
    "export-and-backup",
  ]),
  q(
    "settings",
    "holdout",
    "graph",
    "How do I keep a copy of my world outside this browser?",
    ["export-and-backup", "offline-sync", "cloud-backup"],
  ),
  q(
    "settings",
    "tune",
    "settings",
    "Can I save my vault to a folder on my computer?",
    ["offline-sync"],
  ),
  q("settings", "holdout", "settings", "Which Settings tab has the backup?", [
    "registry:backup-and-restore",
    "export-and-backup",
  ]),
  q("settings", "tune", "settings", "How do I change the theme?", ["themes"]),
  q(
    "settings",
    "holdout",
    "settings",
    "How do I set the default template for a new character?",
    ["default-entity-templates"],
  ),

  // Creating and editing entities
  q("entity-editing", "tune", "graph", "How do I make a new character?", [
    "creating-and-editing-entities",
    "registry:entity-editing",
    "intro",
  ]),
  q("entity-editing", "tune", "entityEdit", "How do I save my changes?", [
    "creating-and-editing-entities",
    "registry:entity-editing",
  ]),
  q(
    "entity-editing",
    "holdout",
    "entityEdit",
    "How do I cancel what I just typed?",
    ["creating-and-editing-entities"],
  ),
  q("entity-editing", "tune", "connections", "How do I delete an entity?", [
    "creating-and-editing-entities",
  ]),
  q("entity-editing", "tune", "connections", "Can I undo deleting an entry?", [
    "creating-and-editing-entities",
  ]),
  q("entity-editing", "holdout", "connections", "Where is the Edit button?", [
    "creating-and-editing-entities",
    "registry:entity-editing",
  ]),
  q("entity-editing", "tune", "graph", "Does a new entity start blank?", [
    "default-entity-templates",
    "creating-and-editing-entities",
  ]),
  q("entity-editing", "holdout", "connections", "How do I rename an entry?", [
    "creating-and-editing-entities",
    "registry:entity-editing",
  ]),
  q("entity-editing", "tune", "entityEdit", "What does Unsaved changes mean?", [
    "creating-and-editing-entities",
  ]),

  // Generators, one per kind of thing
  q("generators", "tune", "generators", "How do I make a quest?", [
    "generator:quest",
  ]),
  q("generators", "tune", "none", "Is there a generator for dungeons?", [
    "generator:dungeon",
  ]),
  q("generators", "holdout", "generators", "I need a heist for my players", [
    "generator:heist",
  ]),
  q("generators", "tune", "none", "Can I generate a ship?", ["generator:ship"]),
  q("generators", "tune", "none", "Can I make up a new language?", [
    "generator:language",
  ]),
  q(
    "generators",
    "holdout",
    "none",
    "Is there something that makes rumours for a tavern?",
    ["generator:rumour"],
  ),
  q("generators", "holdout", "generators", "I want a villain for my campaign", [
    "generator:villain",
  ]),
  q("generators", "tune", "none", "How do I roll up a random magic item?", [
    "generator:magic-item",
    "generator:minor-magic-item",
  ]),
  q("generators", "holdout", "none", "Is there a generator for puzzles?", [
    "generator:puzzle",
  ]),
  q("generators", "holdout", "none", "Can I generate a festival?", [
    "generator:holiday",
  ]),
];

/** Questions that are easy to answer from the wrong neighbouring feature. */
export const PHASE_A_CONFUSION: InScopeQuestion[] = [
  q(
    "confusion",
    "tune",
    "settings",
    "Is exporting a backup the same as publishing my world?",
    ["export-and-backup"],
    ["publishing", "registry:publishing"],
  ),
  q(
    "confusion",
    "holdout",
    "import",
    "Should I import my backup file on the Import page?",
    ["export-and-backup", "registry:backup-and-restore"],
    ["importing", "registry:archive-import"],
  ),
  q(
    "confusion",
    "tune",
    "graph",
    "What is the difference between the graph and the canvas?",
    ["spatial-canvas", "registry:canvas"],
    ["graph-basics", "registry:graph-view"],
  ),
  q(
    "confusion",
    "holdout",
    "map",
    "Is the map the same thing as the canvas?",
    ["map-mode", "registry:vtt-map"],
    ["spatial-canvas", "registry:canvas"],
  ),
  q(
    "confusion",
    "tune",
    "generators",
    "Should I use a generator or the Oracle to make a new NPC?",
    ["in-app-generators", "registry:campaign-generator", "generator:npc"],
    ["oracle-guide"],
  ),
  q(
    "confusion",
    "holdout",
    "import",
    "Is importing notes the same as generating entries?",
    ["importing", "registry:archive-import"],
    ["in-app-generators", "generate-related", "registry:campaign-generator"],
  ),
  q(
    "confusion",
    "tune",
    "settings",
    "Is Cloud Backup the same as the backup file?",
    ["cloud-backup"],
    ["export-and-backup"],
  ),
  q(
    "confusion",
    "holdout",
    "graph",
    "Do I use Import or the Shelf to move a monster to another vault?",
    ["entity-shelf"],
    ["importing"],
  ),
  q(
    "confusion",
    "tune",
    "settings",
    "Does Google Drive sync replace a portable backup?",
    ["gdrive-cloud-sync"],
    ["export-and-backup"],
  ),
  q(
    "confusion",
    "holdout",
    "map",
    "Is a map pin the same as a connection?",
    ["map-mode"],
    ["connections-tab", "registry:entity-connections"],
  ),
  q(
    "confusion",
    "tune",
    "canvas",
    "Do I create an entity on the canvas or in the explorer?",
    ["canvas-add-entities"],
    ["creating-and-editing-entities", "registry:entity-editing"],
  ),
  q(
    "confusion",
    "holdout",
    "map",
    "Is the fog of war on the map the same as hiding an entry?",
    ["map-mode"],
    ["fog-of-war"],
  ),
  q(
    "confusion",
    "tune",
    "settings",
    "Should I export to share my world with players?",
    ["publishing"],
    ["export-and-backup"],
  ),
];

const out = (
  kind: OutOfScopeQuestion["kind"],
  split: OutOfScopeQuestion["split"],
  screen: OutOfScopeQuestion["screen"],
  question: string,
): OutOfScopeQuestion => ({ kind, split, screen, question });

/** Not about Codex Cryptica, or about something it does not do. */
export const PHASE_A_OUT_OF_SCOPE: OutOfScopeQuestion[] = [
  out("unrelated", "tune", "none", "What is a good name for my cat?"),
  out("unrelated", "tune", "none", "How do I cook pasta?"),
  out("near-miss", "tune", "import", "Can I import from Foundry VTT?"),
  out("near-miss", "holdout", "map", "Does the map support 3D terrain?"),
  out("near-miss", "tune", "settings", "Can I back up my vault to Dropbox?"),
  out("near-miss", "holdout", "canvas", "Can I export my canvas as a PDF?"),
  out("unrelated", "tune", "none", "Who is the best fantasy author?"),
  out("unrelated", "holdout", "none", "What is the capital of Norway?"),
  out("unrelated", "tune", "none", "How do I fix my printer?"),
  out("unrelated", "holdout", "none", "Can you recommend a board game?"),
  out("unrelated", "tune", "none", "What is the best way to lose weight?"),
  out("unrelated", "holdout", "none", "How do I make a pivot table in Excel?"),
  out(
    "unrelated",
    "tune",
    "graph",
    "Is Codex Cryptica better than World Anvil?",
  ),
  out(
    "unrelated",
    "holdout",
    "none",
    "Can I play Codex Cryptica on a PlayStation?",
  ),
  out("unrelated", "tune", "none", "How do I change my password on Google?"),
  out("near-miss", "holdout", "settings", "Can I pay for more storage?"),
  out("near-miss", "holdout", "import", "Can I import from Roll20?"),
  out("unrelated", "holdout", "none", "How tall is Mount Everest?"),
  out(
    "near-miss",
    "tune",
    "generators",
    "Can the generator write my whole campaign for me?",
  ),
];
