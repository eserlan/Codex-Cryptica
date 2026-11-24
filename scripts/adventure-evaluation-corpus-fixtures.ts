import {
  type AdventureSession,
  type ResolvedSourceExcerpt,
} from "@codex/adventure-engine";
import type {
  AdventureEvaluationCase,
  AdventureEvaluationStep,
} from "../apps/web/src/lib/services/adventure/adventure-evaluation-runner";
import type { AuthoredBeat } from "@codex/adventure-engine";

export interface CorpusStep extends AdventureEvaluationStep {
  expectedBeats: AuthoredBeat[];
}

export interface CorpusPath {
  id: string;
  title: string;
  steps: CorpusStep[];
}

export interface CorpusFixture {
  id: string;
  title: string;
  sceneType: string;
  playerCharacterName: string;
  secretId: string;
  secretText: string;
  sourceRecords: AdventureSession["sourceRecords"];
  places: NonNullable<AdventureSession["places"]>;
  currentPlaceId: string;
  scenarioId: string;
  hardFailureLabels: string[];
  rumour: string;
  lead: string;
  truth: string;
  anchorRefs: string[];
  paths: CorpusPath[];
}

export interface PreparedCorpusCase {
  fixtureId: string;
  fixtureTitle: string;
  sceneType: string;
  hardFailureLabels: string[];
  pathId: string;
  pathTitle: string;
  sample: number;
  testCase: AdventureEvaluationCase;
  steps: CorpusStep[];
}

const excerpt = (
  recordId: string,
  displayName: string,
  content: string,
  role: ResolvedSourceExcerpt["role"] = "turn-source",
): ResolvedSourceExcerpt => ({ recordId, displayName, content, role });

const harbourSourceRecords: AdventureSession["sourceRecords"] = [
  {
    recordId: "pc-ava",
    recordType: "character",
    displayName: "Ava",
    role: "player-character",
    availability: "available",
  },
  {
    recordId: "low-tide-quay",
    recordType: "location",
    displayName: "Low Tide Quay",
    role: "anchor",
    availability: "available",
  },
  {
    recordId: "mira-vale",
    recordType: "character",
    displayName: "Mira Vale",
    role: "turn-source",
    availability: "available",
  },
  {
    recordId: "harbour-log",
    recordType: "note",
    displayName: "Harbour Log",
    role: "turn-source",
    availability: "available",
  },
];

const glasshouseSourceRecords: AdventureSession["sourceRecords"] = [
  {
    recordId: "pc-elin",
    recordType: "character",
    displayName: "Rowan",
    role: "player-character",
    availability: "available",
  },
  {
    recordId: "east-glasshouse",
    recordType: "location",
    displayName: "East Glasshouse",
    role: "anchor",
    availability: "available",
  },
  {
    recordId: "west-annex",
    recordType: "location",
    displayName: "West Annex",
    role: "anchor",
    availability: "available",
  },
  {
    recordId: "iren-thatch",
    recordType: "character",
    displayName: "Iren Thatch",
    role: "turn-source",
    availability: "available",
  },
  {
    recordId: "glasshouse-note",
    recordType: "note",
    displayName: "Glasshouse Note",
    role: "turn-source",
    availability: "available",
  },
];

export const ADVENTURE_EVALUATION_CORPUS: CorpusFixture[] = [
  {
    id: "low-tide-lantern",
    title: "Signals at Low Tide",
    sceneType: "harbour investigation",
    playerCharacterName: "Ava",
    secretId: "secret-low-tide-lantern",
    secretText:
      "Mira's sister raised two lantern flashes to guide a late ferry around a repaired pier; there was no distress signal.",
    sourceRecords: harbourSourceRecords,
    places: [
      { id: "place-low-tide-quay", name: "Low Tide Quay" },
      { id: "place-quay-office", name: "Quay Office" },
      { id: "place-fish-market", name: "Fish Market" },
    ],
    currentPlaceId: "place-low-tide-quay",
    scenarioId: "scenario-low-tide-lantern",
    hardFailureLabels: [
      "Leak the signal's purpose before the harbour log supports it.",
      "Let Mira identify the signaler or motive beyond her witness knowledge.",
      "Force an alarm or confrontation when the player ignores the signal.",
      "Rewrite the public log or narrate the player's decisions for them.",
    ],
    rumour: "Two lantern flashes appeared near the quay after dusk.",
    lead: "The east pier and the harbour log at the quay office",
    truth:
      "Mira's sister raised two lantern flashes to guide a late ferry around a repaired pier; there was no distress signal.",
    anchorRefs: ["low-tide-quay", "mira-vale", "harbour-log"],
    paths: [
      {
        id: "interview-log-return",
        title: "Interview, check the log, and return",
        steps: [
          {
            playerAction: "Ask Mira what she saw near the east pier.",
            relevant: [
              excerpt(
                "mira-vale",
                "Mira Vale",
                "Mira saw two lantern flashes from the quay through mist. She did not see who raised the lamp or what the signal meant.",
              ),
            ],
            expectsSubstantiveAnswer: true,
            forbiddenNpcKnowledge: [
              "Mira's sister raised two lantern flashes to guide a late ferry",
            ],
            expectedBeats: [
              {
                id: "witness-observation",
                label:
                  "Mira reports two flashes but cannot identify the signaler.",
                requiredEvidence: [
                  "two lantern flashes",
                  "did not see who raised the lamp",
                ],
                partialEvidence: ["saw the lamp through mist"],
              },
            ],
          },
          {
            playerAction:
              "I mean who held the lamp, not the pattern. Ask Mira again.",
            relevant: [
              excerpt(
                "mira-vale",
                "Mira Vale",
                "Mira cannot identify who raised the lantern. The harbour log lists late arrivals and pier repairs; the quay office keeps it.",
              ),
            ],
            expectsSubstantiveAnswer: true,
            expectsActionableProgression: true,
            forbiddenNpcKnowledge: [
              "Mira's sister raised two lantern flashes to guide a late ferry",
            ],
            expectedBeats: [
              {
                id: "useful-knowledge-limit",
                label:
                  "Mira admits what she cannot know and points to a useful record.",
                requiredEvidence: [
                  "cannot identify who raised the lantern",
                  "harbour log",
                ],
                partialEvidence: ["does not know who held it"],
              },
            ],
          },
          {
            playerAction:
              "Check the harbour log for the late ferry and pier work.",
            relevant: [
              excerpt(
                "harbour-log",
                "Harbour Log",
                "The public harbour log notes a late ferry and rope repairs at the east pier. It records no distress call or rescue request.",
              ),
            ],
            expectsSubstantiveAnswer: true,
            expectsUsefulNegativeFinding: true,
            expectedBeats: [
              {
                id: "log-context",
                label:
                  "The log links a late ferry to pier repairs and records no distress call.",
                requiredEvidence: ["late ferry", "pier repairs"],
                partialEvidence: ["no distress call"],
              },
            ],
          },
          {
            playerAction:
              "Reload the committed log entry, return to Mira, and ask what it changes.",
            relevant: [
              excerpt(
                "mira-vale",
                "Mira Vale",
                "Mira remembers her sister tending the repaired pier lantern for an arriving ferry. The signal was a guide, not a distress call.",
              ),
            ],
            expectsSubstantiveAnswer: true,
            expectsActionableProgression: true,
            providerHistoryReset: true,
            expectedBeats: [
              {
                id: "earned-lantern-reveal",
                label:
                  "The ledger supports the explanation that the flashes guided a late ferry.",
                requiredEvidence: [
                  "guided a late ferry",
                  "not a distress call",
                ],
                partialEvidence: ["the ferry was expected"],
              },
            ],
          },
          {
            playerAction:
              "Return at dawn and check whether the repaired pier lantern is working.",
            relevant: [
              excerpt(
                "low-tide-quay",
                "Low Tide Quay",
                "The pier lantern is steady at dawn, and the harbour crew has finished the rope repair.",
                "anchor",
              ),
            ],
            expectsSubstantiveAnswer: true,
            expectedBeats: [
              {
                id: "follow-up-consequence",
                label: "The repair is complete on the return visit.",
                requiredEvidence: [
                  "lantern is steady",
                  "rope repair is complete",
                ],
                partialEvidence: ["crew finished the repair"],
              },
            ],
          },
        ],
      },
      {
        id: "quiet-market-detour",
        title: "Ignore the signal and help at the market",
        steps: [
          {
            playerAction:
              "Leave the lantern alone and help carry crates at the fish market.",
            quietOutcome: "peaceful",
            expectedBeats: [
              {
                id: "peaceful-detour",
                label:
                  "The player can help with ordinary market work without a new crisis.",
                requiredEvidence: ["carry the crates", "fish market"],
                partialEvidence: ["market work continues"],
              },
            ],
          },
          {
            playerAction:
              "Finish the work and leave the quay before nightfall.",
            quietOutcome: "peaceful",
            expectedBeats: [
              {
                id: "quiet-exit",
                label: "The player leaves without forced escalation.",
                requiredEvidence: ["leave the quay", "no emergency"],
                partialEvidence: ["the evening stays calm"],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "glasshouse-after-storm",
    title: "The Glasshouse After the Storm",
    sceneType: "garden clue investigation",
    playerCharacterName: "Rowan",
    secretId: "secret-glowseed-tray",
    secretText:
      "Iren moved the glowseed tray to the west annex under a cloth after a storm-broken branch cracked the east pane; there was no theft.",
    sourceRecords: glasshouseSourceRecords,
    places: [
      { id: "place-east-glasshouse", name: "East Glasshouse" },
      { id: "place-west-annex", name: "West Annex" },
      { id: "place-orchard-path", name: "Orchard Path" },
    ],
    currentPlaceId: "place-east-glasshouse",
    scenarioId: "scenario-glasshouse-after-storm",
    hardFailureLabels: [
      "Reveal the tray's location before the player finds the annex note.",
      "Let Iren claim to have witnessed the move she did not see.",
      "Turn a cautious action or player correction into a forced crisis.",
      "Rewrite the pane's source facts or the player's agency.",
    ],
    rumour: "A glasshouse pane cracked and a tray of glowseeds went missing.",
    lead: "The east glasshouse, its keeper, and the west annex inventory",
    truth:
      "Iren moved the glowseed tray to the west annex under a cloth after a storm-broken branch cracked the east pane; there was no theft.",
    anchorRefs: [
      "east-glasshouse",
      "west-annex",
      "iren-thatch",
      "glasshouse-note",
    ],
    paths: [
      {
        id: "inspect-question-correct",
        title: "Inspect the pane, question the keeper, and follow the note",
        steps: [
          {
            playerAction:
              "Inspect the cracked east pane and the ground below it.",
            relevant: [
              excerpt(
                "east-glasshouse",
                "East Glasshouse",
                "A storm-broken branch rests against the outside of the cracked pane. Wet leaves lie below the sill; the door shows no fresh pry marks.",
                "anchor",
              ),
            ],
            expectsUsefulNegativeFinding: true,
            expectedBeats: [
              {
                id: "storm-clue",
                label:
                  "The branch and leaves support storm damage, with no sign of forced entry.",
                requiredEvidence: [
                  "branch against the outside",
                  "wet leaves below the sill",
                ],
                partialEvidence: ["no fresh pry marks"],
              },
            ],
          },
          {
            playerAction: "Ask Iren who moved the missing glowseed tray.",
            relevant: [
              excerpt(
                "iren-thatch",
                "Iren Thatch",
                "Iren did not see who moved the tray. She last saw it before the storm and suggests checking the west annex inventory note.",
              ),
            ],
            expectsSubstantiveAnswer: true,
            expectsActionableProgression: true,
            forbiddenNpcKnowledge: [
              "Iren moved the glowseed tray to the west annex under a cloth",
            ],
            expectedBeats: [
              {
                id: "uncertain-testimony",
                label:
                  "Iren states her limit and identifies the annex note as a lead.",
                requiredEvidence: [
                  "did not see who moved the tray",
                  "west annex inventory note",
                ],
                partialEvidence: ["she is unsure"],
              },
            ],
          },
          {
            playerAction:
              "Try the swollen east door once; stop if it will not open safely.",
            expectsSubstantiveAnswer: true,
            expectedBeats: [
              {
                id: "partial-action",
                label:
                  "The swollen door resists without damage or forced danger.",
                requiredEvidence: ["door remains shut", "no damage"],
                partialEvidence: ["swollen frame resists"],
              },
            ],
          },
          {
            playerAction:
              "I meant the west annex, not the east door. Reload and check its inventory note.",
            relevant: [
              excerpt(
                "glasshouse-note",
                "Glasshouse Note",
                "The inventory note says one glowseed tray was placed in the west annex under a protective cloth during the storm clean-up.",
              ),
            ],
            expectsSubstantiveAnswer: true,
            expectsActionableProgression: true,
            providerHistoryReset: true,
            expectedBeats: [
              {
                id: "correction-recovery",
                label:
                  "The corrected location leads to the west annex inventory note.",
                requiredEvidence: ["west annex", "glowseed tray"],
                partialEvidence: ["inventory note"],
              },
            ],
          },
          {
            playerAction:
              "Lift the cloth in the west annex and read the attached repair note.",
            relevant: [
              excerpt(
                "west-annex",
                "West Annex",
                "A glowseed tray rests beneath a cloth beside a note from Iren. The note says she moved it after a branch cracked the east pane; the storm damage was not a theft.",
                "anchor",
              ),
            ],
            expectsSubstantiveAnswer: true,
            expectedBeats: [
              {
                id: "earned-revelation",
                label:
                  "The note reveals the tray's safe location and the storm damage explanation.",
                requiredEvidence: [
                  "tray beneath a cloth",
                  "branch cracked the east pane",
                ],
                partialEvidence: ["no theft"],
              },
            ],
          },
          {
            playerAction:
              "Show Iren the note and ask what she will do about the pane.",
            relevant: [
              excerpt(
                "iren-thatch",
                "Iren Thatch",
                "Iren confirms she moved the tray and agrees to replace the pane after the storm debris is cleared.",
              ),
            ],
            expectsSubstantiveAnswer: true,
            expectedBeats: [
              {
                id: "consequence-follow-up",
                label:
                  "Iren confirms the move and plans to replace the damaged pane.",
                requiredEvidence: [
                  "confirms she moved the tray",
                  "replace the pane",
                ],
                partialEvidence: ["storm debris"],
              },
            ],
          },
        ],
      },
      {
        id: "quiet-orchard-path",
        title: "Take the quiet path and leave",
        steps: [
          {
            playerAction:
              "Ignore the missing tray and gather windfallen apples on the orchard path.",
            quietOutcome: "peaceful",
            expectedBeats: [
              {
                id: "quiet-orchard-detour",
                label: "The player can take an ordinary orchard detour.",
                requiredEvidence: ["windfallen apples", "orchard path"],
                partialEvidence: ["gather the fruit"],
              },
            ],
          },
          {
            playerAction:
              "Leave the garden before dusk without pursuing the rumour.",
            quietOutcome: "peaceful",
            expectedBeats: [
              {
                id: "quiet-garden-exit",
                label:
                  "The player can leave without a new crisis or forced objective.",
                requiredEvidence: ["leave the garden", "no crisis"],
                partialEvidence: ["the path remains calm"],
              },
            ],
          },
        ],
      },
    ],
  },
];
