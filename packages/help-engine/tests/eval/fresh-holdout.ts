/**
 * Authored and frozen before retrieval changes on 2026-10-02.
 * Run only after tuning/regression work is finished. Never tune against this set.
 * The older holdout has been inspected and is now a regression set.
 */
import type { InScopeQuestion, OutOfScopeQuestion } from "./questions";

const q = (
  question: string,
  screen: InScopeQuestion["screen"],
  expect: string[],
  alsoExpect?: string[],
): InScopeQuestion => ({
  question,
  screen,
  expect,
  alsoExpect,
  topic: "fresh",
  split: "holdout",
});

export const FRESH_IN_SCOPE = [
  q("I misspelled my character's name. Where can I correct it?", "entityEdit", [
    "creating-and-editing-entities",
    "registry:entity-editing",
  ]),
  q(
    "Can the sparkle button rewrite my character's private notes?",
    "connections",
    ["creating-and-editing-entities", "oracle-guide"],
  ),
  q("How do I reject a revised description?", "entityEdit", [
    "creating-and-editing-entities",
    "registry:entity-editing",
  ]),
  q("What happens if I close editing without saving?", "entityEdit", [
    "creating-and-editing-entities",
    "registry:entity-editing",
  ]),
  q("Where can I change my starting character note structure?", "settings", [
    "default-entity-templates",
  ]),
  q("How can I keep an arrangement of graph nodes for next time?", "graph", [
    "saved-views",
  ]),
  q("Why are some graph nodes inside coloured backgrounds?", "graph", [
    "graph-basics",
    "registry:graph-view",
  ]),
  q("How do I stop the graph from shifting my nodes around?", "graph", [
    "graph-basics",
  ]),
  q("Can I put a picture on a canvas without cropping it?", "canvas", [
    "canvas-add-entities",
  ]),
  q("Can I turn the contents of a board into a note?", "canvas", [
    "spatial-canvas",
  ]),
  q("How do I freeze a card so I won't accidentally move it?", "canvas", [
    "spatial-canvas",
  ]),
  q("How do I erase a drawing stroke from my board?", "canvas", [
    "spatial-canvas",
  ]),
  q("How do I put a town from my notes onto its map?", "map", [
    "map-mode",
    "registry:vtt-map",
  ]),
  q("Can players see terrain that I haven't revealed yet?", "map", [
    "map-mode",
    "vtt-session",
  ]),
  q("Where do I switch on tactical tokens?", "map", [
    "vtt-session",
    "map-mode",
    "registry:vtt-map",
  ]),
  q("Can I preserve a backup before merging duplicates?", "settings", [
    "export-and-backup",
  ]),
  q(
    "What do I need to recover a Codex cloud copy on a new computer?",
    "settings",
    ["cloud-backup"],
  ),
  q("Does a Google Drive copy upload each change automatically?", "settings", [
    "gdrive-cloud-sync",
  ]),
  q("How can I bring a Thread Weaver JSON into this world?", "import", [
    "thread-weaver-import",
  ]),
  q("Will dropping Markdown files replace matching notes?", "import", [
    "importing",
  ]),
  q("Where can I draft an encounter puzzle without an AI key?", "generators", [
    "generator:puzzle",
    "in-app-generators",
  ]),
  q("I want gossip with leads the party can follow", "generators", [
    "generator:rumour",
    "in-app-generators",
  ]),
  q(
    "How do I keep the draft after opening the generator editor?",
    "generators",
    ["in-app-generators", "generate-related", "registry:campaign-generator"],
  ),
  q("How can I generate seasonal observances for my world?", "generators", [
    "generator:holiday",
    "in-app-generators",
  ]),
  q(
    "What should I use for geography versus arranging investigation notes?",
    "map",
    ["map-mode", "registry:vtt-map"],
    ["spatial-canvas", "registry:canvas"],
  ),
  q(
    "Does placing an entity on a map also define its relationships?",
    "map",
    ["map-mode"],
    ["connections-tab", "registry:entity-connections"],
  ),
  q(
    "Are secret graph entries controlled by the map's fog brush?",
    "map",
    ["map-mode"],
    ["fog-of-war"],
  ),
  q(
    "Which transfers an existing creature: the Shelf or importing a file?",
    "graph",
    ["entity-shelf"],
    ["importing"],
  ),
  q(
    "Should I publish a world or export a backup for safekeeping?",
    "settings",
    ["publishing"],
    ["export-and-backup", "registry:backup-and-restore"],
  ),
  q("Does switching to a dark interface change my world's genre?", "settings", [
    "themes",
  ]),
];

export const FRESH_OUT_OF_SCOPE: OutOfScopeQuestion[] = [
  "How do I replace a bicycle chain?",
  "Calculate a mortgage repayment schedule",
  "Who won last night's football match?",
  "Can you book a dentist appointment?",
  "Explain quantum entanglement",
  "Find the best price for a washing machine",
  "How do I learn conversational Spanish?",
  "What temperature should I roast potatoes at?",
  "Please debug my Python web scraper",
  "What visa do I need to visit Japan?",
].map((question) => ({
  question,
  screen: "none",
  split: "holdout",
  kind: "unrelated",
}));
