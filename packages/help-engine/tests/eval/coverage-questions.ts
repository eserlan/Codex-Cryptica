/** Written before inspecting retrieval results for the remaining coverage.
 * Tune questions are regression cases; holdout is assessed only after changes. */
export const COVERAGE_QUESTIONS = [
  ["session-journal", "Where do I start a session journal?", "tune"],
  ["session-journal", "Can I turn yesterday's journal into a Note?", "tune"],
  [
    "session-journal",
    "Why did my dice rolls appear in the journal?",
    "holdout",
  ],
  [
    "session-journal",
    "Can I keep only part of my play log as an entity?",
    "holdout",
  ],
  [
    "entity-reports",
    "How do I save a report from selected canvas cards?",
    "tune",
  ],
  ["entity-reports", "Can I cancel a report without saving it?", "tune"],
  [
    "entity-reports",
    "Can I choose what information a report includes?",
    "holdout",
  ],
  [
    "entity-reports",
    "How do I collect graph entities into a report?",
    "holdout",
  ],
  [
    "entity-reports",
    "Can I turn selected table rows into a report?",
    "holdout",
  ],
  ["stat-sheets", "Where are an entity's hit points and dice fields?", "tune"],
  [
    "stat-sheets",
    "How do I reuse a stat layout for another character?",
    "tune",
  ],
  [
    "stat-sheets",
    "Do saved stat sheet templates contain my character's values?",
    "holdout",
  ],
  ["stat-sheets", "Can I change how my stat sheet is presented?", "holdout"],
  [
    "entity-templates",
    "How do I change the default note structure for new characters?",
    "tune",
  ],
  [
    "entity-templates",
    "Can I edit a built-in entity template directly?",
    "tune",
  ],
  [
    "entity-templates",
    "Does choosing a default template rewrite existing notes?",
    "holdout",
  ],
  [
    "entity-templates",
    "Can I preview templates in a read-only vault?",
    "holdout",
  ],
  ["chronology", "Where can I see events in calendar order?", "tune"],
  ["chronology", "How do I find undated events in the agenda?", "tune"],
  [
    "chronology",
    "Can I filter history by labels and related characters?",
    "holdout",
  ],
  [
    "chronology",
    "What happens to approximate dates in the month grid?",
    "holdout",
  ],
  ["family-tree", "Where can I see my character's parents?", "tune"],
  ["family-tree", "Can I add siblings without recording parents?", "tune"],
  [
    "family-tree",
    "Is genealogy stored separately from connections?",
    "holdout",
  ],
  ["family-tree", "Can a character become their own ancestor?", "holdout"],
  ["guided-mode", "How do I show the Full Toolbox?", "tune"],
  ["guided-mode", "Does switching Guided mode delete my entities?", "tune"],
  [
    "guided-mode",
    "Will Guided mode remember my choice between worlds?",
    "holdout",
  ],
  [
    "guided-mode",
    "Does Quick Start create a new world immediately?",
    "holdout",
  ],
  ["session-prep", "Can I build a session run sheet without AI?", "tune"],
  ["session-prep", "How do I undo an AI redraft of my prep?", "tune"],
  [
    "session-prep",
    "Why are my latest prep edits missing from the run sheet?",
    "holdout",
  ],
  [
    "session-prep",
    "Does session preparation force a scene order or ending?",
    "holdout",
  ],
] as const;

export const COVERAGE_HELP: Record<string, string[]> = {
  "session-journal": ["quicknote"],
  "entity-reports": ["entity-reports"],
  "stat-sheets": ["stat-sheets"],
  "entity-templates": ["default-entity-templates"],
  chronology: ["chronology"],
  "family-tree": ["family-tree"],
  "guided-mode": ["guided-mode"],
  "session-prep": ["session-prep"],
};
