import {
  createScenarioState,
  parseAdventureSession,
  type AdventureSession,
} from "@codex/adventure-engine";
import type {
  AdventureEvaluationCase,
  AdventureEvaluationStep,
} from "../apps/web/src/lib/services/adventure/adventure-evaluation-runner";
import {
  ADVENTURE_EVALUATION_CORPUS,
  type CorpusFixture,
  type CorpusPath,
  type PreparedCorpusCase,
} from "./adventure-evaluation-corpus-fixtures";

function createFixtureSession(fixture: CorpusFixture): AdventureSession {
  const scenario = {
    ...createScenarioState({
      id: fixture.scenarioId,
      origin: { kind: "manual", manualId: `synthetic-${fixture.id}` },
      playerVisible: {
        rumour: fixture.rumour,
        lead: fixture.lead,
        source: "Synthetic evaluation fixture",
      },
      gmOnly: { truth: fixture.truth },
    }),
    knowledge: "heard" as const,
    anchorRefs: fixture.anchorRefs,
    revealedSecretIds: [],
    secretBindings: { truth: fixture.secretId, eventIds: {} },
  };
  return parseAdventureSession({
    schemaVersion: 3,
    id: `evaluation-${fixture.id}`,
    vaultId: "synthetic-evaluation-vault",
    title: fixture.title,
    status: "active",
    createdAt: "2026-11-24T00:00:00.000Z",
    updatedAt: "2026-11-24T00:00:00.000Z",
    lastPlayedAt: "2026-11-24T00:00:00.000Z",
    revision: 0,
    playerCharacter: {
      kind: "provisional",
      name: fixture.playerCharacterName,
      description: "A curious visitor free to pursue or leave local concerns.",
    },
    premise: fixture.rumour,
    sourceRecords: fixture.sourceRecords,
    places: fixture.places,
    currentPlaceId: fixture.currentPlaceId,
    scenarioCollection: {
      version: 1,
      focusedScenarioId: scenario.id,
      items: [scenario],
    },
    worldTime: { version: 1, elapsedMinutes: 0, events: [] },
    visibleState: {
      objectives: [],
      activeCharacters: [],
      knownFacts: [],
      relationships: [],
    },
    hiddenState: {
      secrets: [
        { id: fixture.secretId, text: fixture.secretText, status: "hidden" },
      ],
      gmThreads: [],
    },
    provisionalFacts: [],
    turns: [],
    pendingRoll: null,
    dicePresets: [],
    resourceCounters: [],
  });
}

export function prepareCorpusCase(
  fixture: CorpusFixture,
  path: CorpusPath,
  sample: number,
): PreparedCorpusCase {
  validateSample(sample);
  const caseId = `${fixture.id}-${path.id}-sample-${sample}`;
  const testCase = buildEvaluationCase(fixture, path, caseId);
  return {
    fixtureId: fixture.id,
    fixtureTitle: fixture.title,
    sceneType: fixture.sceneType,
    hardFailureLabels: [...fixture.hardFailureLabels],
    pathId: path.id,
    pathTitle: path.title,
    sample,
    testCase,
    steps: structuredClone(path.steps),
  };
}

function validateSample(sample: number): void {
  if (Number.isInteger(sample) && sample >= 1) return;
  throw new Error("Corpus sample must be a positive integer.");
}

function buildEvaluationCase(
  fixture: CorpusFixture,
  path: CorpusPath,
  caseId: string,
): AdventureEvaluationCase {
  return {
    id: caseId,
    session: { ...createFixtureSession(fixture), id: caseId },
    playerAction: path.steps[0]?.playerAction ?? "",
    playerCharacterName: fixture.playerCharacterName,
    canaries: [],
    turns: path.steps.map(toEvaluationStep),
  };
}

function toEvaluationStep(
  step: CorpusPath["steps"][number],
): AdventureEvaluationStep {
  const { expectedBeats: _expectedBeats, ...evaluationStep } = step;
  return structuredClone(evaluationStep);
}

export function prepareAdventureEvaluationCorpus(
  sample: number,
): PreparedCorpusCase[] {
  return ADVENTURE_EVALUATION_CORPUS.flatMap((fixture) =>
    fixture.paths.map((path) => prepareCorpusCase(fixture, path, sample)),
  );
}
