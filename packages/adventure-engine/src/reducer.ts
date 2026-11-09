import { detectHiddenLeakage, ensureScenarioSecrets } from "./hidden-state";
import { applyTimeAdvance } from "./world-time";
import { systemIdGenerator } from "@codex/runtime";
import { validateRevealedScenarioLocation } from "./contextual-rumours";
import {
  MAX_SERIALIZED_STATE_CHARS,
  parseTurnProposal,
  validateStateBudget,
} from "./schemas";
import { scenarioItemIdentityIds } from "./scenario-schemas";
import type {
  AdventureSession,
  AdventureTurnProposal,
  AdventureValidationError,
  CommitMetadata,
  CollectionPatch,
  CommittedAdventureTurn,
  HiddenStatePatch,
  HiddenStateProposalPatch,
  PendingRoll,
  ProvisionalFact,
  Result,
  ScenarioElaborationProposal,
  ScenarioElaborationStage,
  ScenarioItem,
  SuppliedRollOutcome,
  VisibleStatePatch,
  VisibleStateProposalPatch,
} from "./types";

type IdFactory = () => string;

const MAX_ID_ALLOCATION_ATTEMPTS = 10;

function existingIds(session: AdventureSession): Set<string> {
  return new Set([
    session.id,
    ...session.sourceRecords.map((source) => source.recordId),
    ...session.visibleState.objectives.map((fact) => fact.id),
    ...session.visibleState.activeCharacters.map((fact) => fact.id),
    ...session.visibleState.knownFacts.map((fact) => fact.id),
    ...session.visibleState.relationships.map((fact) => fact.id),
    ...(session.visibleState.location
      ? [session.visibleState.location.id]
      : []),
    ...(session.visibleState.situation
      ? [session.visibleState.situation.id]
      : []),
    ...session.hiddenState.secrets.map((secret) => secret.id),
    ...session.hiddenState.gmThreads.map((thread) => thread.id),
    ...session.provisionalFacts.map((fact) => fact.id),
    ...session.turns.map((turn) => turn.id),
    ...(session.scenarioCollection?.items.flatMap(scenarioItemIdentityIds) ??
      []),
  ]);
}

function allocateId(ids: Set<string>, createId: IdFactory): string | null {
  for (let attempt = 0; attempt < MAX_ID_ALLOCATION_ATTEMPTS; attempt += 1) {
    const id = createId();
    if (id.trim().length > 0 && !ids.has(id)) {
      ids.add(id);
      return id;
    }
  }
  return null;
}

function materializeCollectionPatch<T extends { id: string }, TNew>(
  patch: { add: TNew[]; update: T[]; removeIds: string[] },
  ids: Set<string>,
  createId: IdFactory,
): Result<CollectionPatch<T>, string> {
  const add: T[] = [];
  for (const entry of patch.add) {
    const id = allocateId(ids, createId);
    if (!id) return { ok: false, errors: "id-allocation-failed" };
    add.push({ ...entry, id } as unknown as T);
  }
  return {
    ok: true,
    value: { add, update: patch.update, removeIds: patch.removeIds },
  };
}

function materializeVisiblePatch(
  patch: VisibleStateProposalPatch,
  ids: Set<string>,
  createId: IdFactory,
): Result<VisibleStatePatch, string> {
  const location =
    patch.location === undefined || patch.location === null
      ? patch.location
      : (() => {
          const id = allocateId(ids, createId);
          return id ? { ...patch.location, id } : null;
        })();
  const situation =
    patch.situation === undefined || patch.situation === null
      ? patch.situation
      : (() => {
          const id = allocateId(ids, createId);
          return id ? { ...patch.situation, id } : null;
        })();
  if ((patch.location && !location) || (patch.situation && !situation)) {
    return { ok: false, errors: "id-allocation-failed" };
  }
  const objectives = materializeCollectionPatch(
    patch.objectives,
    ids,
    createId,
  );
  const activeCharacters = materializeCollectionPatch(
    patch.activeCharacters,
    ids,
    createId,
  );
  const knownFacts = materializeCollectionPatch(
    patch.knownFacts,
    ids,
    createId,
  );
  const relationships = materializeCollectionPatch(
    patch.relationships,
    ids,
    createId,
  );
  if (!objectives.ok) return objectives;
  if (!activeCharacters.ok) return activeCharacters;
  if (!knownFacts.ok) return knownFacts;
  if (!relationships.ok) return relationships;
  return {
    ok: true,
    value: {
      location,
      situation,
      objectives: objectives.value,
      activeCharacters: activeCharacters.value,
      knownFacts: knownFacts.value,
      relationships: relationships.value,
    },
  };
}

function materializeHiddenPatch(
  patch: HiddenStateProposalPatch,
  ids: Set<string>,
  createId: IdFactory,
): Result<HiddenStatePatch, string> {
  const secrets = materializeCollectionPatch(patch.secrets, ids, createId);
  const gmThreads = materializeCollectionPatch(patch.gmThreads, ids, createId);
  if (!secrets.ok) return secrets;
  if (!gmThreads.ok) return gmThreads;
  return {
    ok: true,
    value: { secrets: secrets.value, gmThreads: gmThreads.value },
  };
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function patchCollection<T extends { id: string }>(
  current: T[],
  patch: CollectionPatch<T>,
): Result<T[], string> {
  const ids = new Set(current.map((entry) => entry.id));
  const addIds = new Set<string>();
  for (const entry of patch.add) {
    if (ids.has(entry.id) || addIds.has(entry.id))
      return { ok: false, errors: `duplicate:${entry.id}` };
    addIds.add(entry.id);
  }
  for (const entry of patch.update) {
    if (!ids.has(entry.id) || patch.removeIds.includes(entry.id)) {
      return { ok: false, errors: `unknown-update:${entry.id}` };
    }
  }
  if (new Set(patch.removeIds).size !== patch.removeIds.length) {
    return { ok: false, errors: "duplicate-removal" };
  }
  const remove = new Set(patch.removeIds);
  return {
    ok: true,
    value: [
      ...current
        .filter((entry) => !remove.has(entry.id))
        .map(
          (entry) =>
            patch.update.find((updated) => updated.id === entry.id) ?? entry,
        ),
      ...patch.add,
    ],
  };
}

export function applyVisiblePatch(
  state: AdventureSession["visibleState"],
  patch: VisibleStatePatch,
): Result<AdventureSession["visibleState"], string> {
  const next = clone(state);
  if (patch.location !== undefined) next.location = patch.location ?? undefined;
  if (patch.situation !== undefined)
    next.situation = patch.situation ?? undefined;
  for (const key of [
    "objectives",
    "activeCharacters",
    "knownFacts",
    "relationships",
  ] as const) {
    const result = patchCollection(next[key], patch[key]);
    if (!result.ok) return result;
    next[key] = result.value as never;
  }
  return { ok: true, value: next };
}

function applyHiddenPatch(
  state: AdventureSession["hiddenState"],
  patch: HiddenStatePatch,
): Result<AdventureSession["hiddenState"], string> {
  const next = clone(state);
  for (const key of ["secrets", "gmThreads"] as const) {
    const result = patchCollection(next[key], patch[key]);
    if (!result.ok) return result;
    next[key] = result.value as never;
  }
  return { ok: true, value: next };
}

function error(code: AdventureValidationError["code"], message: string) {
  return { ok: false as const, errors: [{ code, message }] };
}

function immutableScenarioSecretTexts(
  session: AdventureSession,
): Map<string, string> {
  return new Map(
    (session.scenarioCollection?.items ?? []).flatMap((item) => [
      [item.secretBindings.truth, item.gmOnly.truth] as const,
      ...(item.secretBindings.ifInvestigated && item.gmOnly.ifInvestigated
        ? [
            [
              item.secretBindings.ifInvestigated,
              item.gmOnly.ifInvestigated,
            ] as const,
          ]
        : []),
      ...item.events.flatMap((event) => {
        const secretId = Object.hasOwn(item.secretBindings.eventIds, event.id)
          ? item.secretBindings.eventIds[event.id]
          : undefined;
        return event.visibility === "gm" && secretId
          ? [[secretId, event.text] as const]
          : [];
      }),
    ]),
  );
}

function hasImmutableScenarioRewrite(
  session: AdventureSession,
  proposal: Extract<AdventureTurnProposal, { kind: "complete" }>,
): boolean {
  const immutableTexts = immutableScenarioSecretTexts(session);
  return proposal.hiddenPatch.secrets.update.some(
    (secret) =>
      immutableTexts.has(secret.id) &&
      secret.text !== immutableTexts.get(secret.id),
  );
}

function applySecretReveals(
  candidate: AdventureSession,
  secrets: AdventureSession["hiddenState"]["secrets"],
  revealIds: string[],
  turnId: string,
): string | null {
  for (const secretId of new Set(revealIds)) {
    const secret = secrets.find((entry) => entry.id === secretId);
    if (secret) {
      secret.status = "revealed";
      secret.revealedOnTurnId = turnId;
    }
    const target = candidate.scenarioCollection?.items.find((item) =>
      scenarioSecretBindingIds(item).includes(secretId),
    );
    if (!target) {
      if (secret) continue;
      return `Unknown secret: ${secretId}`;
    }
    target.revealedSecretIds = [
      ...new Set([...target.revealedSecretIds, secretId]),
    ];
  }
  return null;
}

function scenarioSecretBindingIds(
  item: NonNullable<AdventureSession["scenarioCollection"]>["items"][number],
): string[] {
  return [
    item.secretBindings.truth,
    ...(item.secretBindings.ifInvestigated
      ? [item.secretBindings.ifInvestigated]
      : []),
    ...Object.values(item.secretBindings.eventIds),
  ];
}

function revealScenarioIfUnheard(
  candidate: AdventureSession,
  scenarioId: string,
  turn: CommittedAdventureTurn,
  createId: IdFactory,
): string | null {
  const scenario = candidate.scenarioCollection?.items.find(
    (item) => item.id === scenarioId,
  );
  if (!scenario) return `Unknown scenario: ${scenarioId}`;
  if (scenario.knowledge !== "unheard") return null;

  const locationError = validateRevealedScenarioLocation(candidate, scenario);
  if (locationError) return locationError;

  const id = allocateId(existingIds(candidate), createId);
  if (!id || scenario.events.length >= 100) {
    return "Unable to record scenario discovery";
  }
  scenario.events.push({
    id,
    kind: "discovery",
    visibility: "player",
    text: scenario.playerVisible.lead,
    at: turn.committedAt,
    turnId: turn.id,
  });
  scenario.knowledge = "heard";
  return null;
}

function markRevealedScenarios(
  candidate: AdventureSession,
  scenarioIds: string[] | undefined,
  turn: CommittedAdventureTurn,
  createId: IdFactory,
): string | null {
  for (const scenarioId of scenarioIds ?? []) {
    const err = revealScenarioIfUnheard(candidate, scenarioId, turn, createId);
    if (err) return err;
  }
  return null;
}

const ELABORATION_LADDER_ORDER: Record<ScenarioElaborationStage, number> = {
  hearsay: 0,
  "actionable-clue": 1,
  "revelation-crisis": 2,
};

type ScenarioElaborationValidation =
  { scenario: ScenarioItem } | { error: ReturnType<typeof error> };

function validateScenarioAvailability(
  candidate: AdventureSession,
  elaboration: ScenarioElaborationProposal,
  revealedThisTurn: Set<string>,
): ScenarioElaborationValidation {
  const scenario = candidate.scenarioCollection?.items.find(
    (item) => item.id === elaboration.scenarioId,
  );
  if (!scenario) {
    return {
      error: error(
        "unknown-fact",
        `Unknown scenario: ${elaboration.scenarioId}`,
      ),
    };
  }
  if (scenario.status !== "open") {
    return {
      error: error(
        "invalid-transition",
        `Scenario ${elaboration.scenarioId} is not open`,
      ),
    };
  }
  if (revealedThisTurn.has(elaboration.scenarioId)) {
    return {
      error: error(
        "invalid-transition",
        `Cannot elaborate scenario ${elaboration.scenarioId} in the same turn it is discovered`,
      ),
    };
  }
  if (scenario.knowledge !== "heard") {
    return {
      error: error(
        "invalid-transition",
        `Scenario ${elaboration.scenarioId} must be heard before it can be elaborated`,
      ),
    };
  }
  return { scenario };
}

function validateElaborationStage(
  scenario: ScenarioItem,
  elaboration: ScenarioElaborationProposal,
): ReturnType<typeof error> | null {
  const currentStage = scenario.stage ?? "hearsay";
  const currentLevel = ELABORATION_LADDER_ORDER[currentStage] ?? 0;
  const targetLevel = ELABORATION_LADDER_ORDER[elaboration.stage] ?? 0;
  if (targetLevel <= currentLevel) {
    return error(
      "invalid-transition",
      `Cannot transition scenario ${elaboration.scenarioId} from ${currentStage} to ${elaboration.stage}`,
    );
  }
  if (targetLevel - currentLevel > 1) {
    return error(
      "invalid-transition",
      `Cannot skip elaboration stages for scenario ${elaboration.scenarioId} from ${currentStage} to ${elaboration.stage}`,
    );
  }
  return null;
}

function recordScenarioElaborationDiscovery(
  scenario: ScenarioItem,
  elaboration: ScenarioElaborationProposal,
  candidate: AdventureSession,
  turn: CommittedAdventureTurn,
  createId: IdFactory,
): ReturnType<typeof error> | null {
  const text = elaboration.discovery?.trim();
  if (!text) return null;

  const id = allocateId(existingIds(candidate), createId);
  if (!id || scenario.events.length >= 100) {
    return error(
      "id-allocation-failed",
      "Unable to record scenario elaboration discovery",
    );
  }
  scenario.events.push({
    id,
    kind: "discovery",
    visibility: "player",
    text,
    at: turn.committedAt,
    turnId: turn.id,
  });
  return null;
}

function applyScenarioElaborations(
  candidate: AdventureSession,
  elaborations: ScenarioElaborationProposal[] | undefined,
  revealedScenarioIds: string[] | undefined,
  turn: CommittedAdventureTurn,
  createId: IdFactory,
): ReturnType<typeof error> | null {
  if (!elaborations || elaborations.length === 0) return null;

  const revealedThisTurn = new Set(revealedScenarioIds ?? []);

  for (const elaboration of elaborations) {
    const validation = validateScenarioAvailability(
      candidate,
      elaboration,
      revealedThisTurn,
    );
    if ("error" in validation) return validation.error;
    const stageError = validateElaborationStage(
      validation.scenario,
      elaboration,
    );
    if (stageError) return stageError;

    validation.scenario.stage = elaboration.stage;
    const discoveryError = recordScenarioElaborationDiscovery(
      validation.scenario,
      elaboration,
      candidate,
      turn,
      createId,
    );
    if (discoveryError) return discoveryError;
  }

  return null;
}

function completedTurnInputError(
  session: AdventureSession,
  inputId: string,
): ReturnType<typeof error> | null {
  if (session.status !== "active" || session.pendingRoll) {
    return error(
      "invalid-transition",
      "The session is not ready for a completed turn.",
    );
  }
  if (!inputId || session.turns.some((turn) => turn.inputId === inputId)) {
    return error("duplicate-input", "This action was already processed.");
  }
  return null;
}

function completedTurnProposalError(
  session: AdventureSession,
  proposal: Extract<AdventureTurnProposal, { kind: "complete" }>,
): ReturnType<typeof error> | null {
  if (hasImmutableScenarioRewrite(session, proposal)) {
    return error("conflicting-patch", "Scenario baseline truth is immutable.");
  }
  if (detectHiddenLeakage(session, proposal).length > 0) {
    return error(
      "hidden-leakage",
      "The response contains unrevealed GM information.",
    );
  }
  return null;
}

type MaterializedTurnState = {
  visibleState: AdventureSession["visibleState"];
  hiddenState: AdventureSession["hiddenState"];
  provisionalFacts: ProvisionalFact[];
  updatedProvisionalFacts: ProvisionalFact[];
  visiblePatch: VisibleStatePatch;
  hiddenPatch: HiddenStatePatch;
};

type MaterializedProvisionalFacts = Pick<
  MaterializedTurnState,
  "provisionalFacts" | "updatedProvisionalFacts"
>;

function findMatchingProvisionalFact(
  facts: ProvisionalFact[],
  kind: ProvisionalFact["kind"],
  normalizedName: string,
): ProvisionalFact | undefined {
  return facts.find(
    (fact) =>
      fact.kind === kind && fact.name.trim().toLowerCase() === normalizedName,
  );
}

function updateMaterializedProvisionalFact(
  existing: ProvisionalFact,
  proposal:
    typeof existing | Omit<ProvisionalFact, "id" | "introducedOnTurnId">,
  updates: ProvisionalFact[],
): void {
  const updated: ProvisionalFact = {
    ...existing,
    summary: proposal.summary,
    ...(proposal.scenarioId ? { scenarioId: proposal.scenarioId } : {}),
  };
  const index = updates.findIndex((fact) => fact.id === updated.id);
  if (index === -1) {
    updates.push(updated);
  } else {
    updates[index] = updated;
  }
}

function updateDuplicateProposal(
  facts: ProvisionalFact[],
  proposal:
    (typeof facts)[number] | Omit<ProvisionalFact, "id" | "introducedOnTurnId">,
  normalizedName: string,
): boolean {
  const existing = findMatchingProvisionalFact(
    facts,
    proposal.kind,
    normalizedName,
  );
  if (!existing) return false;

  existing.summary = proposal.summary;
  if (proposal.scenarioId) existing.scenarioId = proposal.scenarioId;
  return true;
}

function materializeProvisionalFacts(
  session: AdventureSession,
  proposedFacts: Extract<
    AdventureTurnProposal,
    { kind: "complete" }
  >["provisionalFacts"],
  turnId: string,
  ids: Set<string>,
  createId: IdFactory,
): MaterializedProvisionalFacts | { error: ReturnType<typeof error> } {
  const provisionalFacts: ProvisionalFact[] = [];
  const updatedProvisionalFacts: ProvisionalFact[] = [];
  const canonicalNames = new Set(
    session.sourceRecords.map((record) =>
      record.displayName.trim().toLowerCase(),
    ),
  );

  for (const fact of proposedFacts) {
    const normName = fact.name.trim().toLowerCase();
    if (canonicalNames.has(normName)) continue;

    const existing = findMatchingProvisionalFact(
      session.provisionalFacts,
      fact.kind,
      normName,
    );
    if (existing) {
      updateMaterializedProvisionalFact(
        existing,
        fact,
        updatedProvisionalFacts,
      );
      continue;
    }

    if (updateDuplicateProposal(provisionalFacts, fact, normName)) continue;

    const id = allocateId(ids, createId);
    if (!id) {
      return {
        error: error(
          "id-allocation-failed",
          "Could not allocate unique IDs for the generated state.",
        ),
      };
    }
    provisionalFacts.push({ ...fact, id, introducedOnTurnId: turnId });
  }

  return { provisionalFacts, updatedProvisionalFacts };
}

function materializeTurnState(
  session: AdventureSession,
  proposal: Extract<AdventureTurnProposal, { kind: "complete" }>,
  turnId: string,
  createId: IdFactory,
): MaterializedTurnState | { error: ReturnType<typeof error> } {
  const ids = existingIds(session);
  const visiblePatch = materializeVisiblePatch(
    proposal.visiblePatch,
    ids,
    createId,
  );
  if (!visiblePatch.ok) {
    return {
      error: error(
        "id-allocation-failed",
        "Could not allocate unique IDs for the generated state.",
      ),
    };
  }
  const hiddenPatch = materializeHiddenPatch(
    proposal.hiddenPatch,
    ids,
    createId,
  );
  if (!hiddenPatch.ok) {
    return {
      error: error(
        "id-allocation-failed",
        "Could not allocate unique IDs for the generated state.",
      ),
    };
  }
  const materializedFacts = materializeProvisionalFacts(
    session,
    proposal.provisionalFacts,
    turnId,
    ids,
    createId,
  );
  if ("error" in materializedFacts) return materializedFacts;
  const visibleState = applyVisiblePatch(
    session.visibleState,
    visiblePatch.value,
  );
  if (!visibleState.ok) {
    return { error: error("conflicting-patch", visibleState.errors) };
  }
  const hiddenState = applyHiddenPatch(session.hiddenState, hiddenPatch.value);
  if (!hiddenState.ok) {
    return { error: error("conflicting-patch", hiddenState.errors) };
  }
  return {
    visibleState: visibleState.value,
    hiddenState: hiddenState.value,
    provisionalFacts: materializedFacts.provisionalFacts,
    updatedProvisionalFacts: materializedFacts.updatedProvisionalFacts,
    visiblePatch: visiblePatch.value,
    hiddenPatch: hiddenPatch.value,
  };
}

export function applyCompletedTurn(
  sessionInput: AdventureSession,
  proposalInput: AdventureTurnProposal,
  meta: CommitMetadata,
  now = meta.now,
  createId: IdFactory = () => systemIdGenerator.uuid(),
): Result<AdventureSession, AdventureValidationError[]> {
  // Scenario GM text must be registered so it can be guarded and revealed.
  const session = ensureScenarioSecrets(sessionInput);
  const inputError = completedTurnInputError(session, meta.inputId);
  if (inputError) return inputError;
  const proposal = parseTurnProposal(proposalInput);
  if (proposal.kind !== "complete") {
    return error(
      "invalid-schema",
      "A completed turn requires a complete proposal.",
    );
  }
  const proposalError = completedTurnProposalError(session, proposal);
  if (proposalError) return proposalError;
  const materialized = materializeTurnState(
    session,
    proposal,
    meta.turnId,
    createId,
  );
  if ("error" in materialized) return materialized.error;
  const candidate = clone(session);
  const revealError = applySecretReveals(
    candidate,
    materialized.hiddenState.secrets,
    proposal.revealSecretIds,
    meta.turnId,
  );
  if (revealError) return error("unknown-secret", revealError);
  const time = applyTimeAdvance(session, proposal.timeAdvance, meta.turnId);
  if (!time.ok) return error("invalid-transition", time.reason);
  candidate.visibleState = materialized.visibleState;
  candidate.hiddenState = materialized.hiddenState;
  if (time.value) candidate.worldTime = time.value;
  const updatedIds = new Set(
    materialized.updatedProvisionalFacts.map((fact) => fact.id),
  );
  candidate.provisionalFacts = [
    ...candidate.provisionalFacts.map((fact) =>
      updatedIds.has(fact.id)
        ? materialized.updatedProvisionalFacts.find((u) => u.id === fact.id)!
        : fact,
    ),
    ...materialized.provisionalFacts,
  ];
  const turn: CommittedAdventureTurn = {
    id: meta.turnId,
    sequence: session.turns.length,
    inputId: meta.inputId,
    playerAction: meta.playerAction ?? "",
    narration: proposal.narration,
    visiblePatch: materialized.visiblePatch,
    hiddenPatch: materialized.hiddenPatch,
    revealedSecretIds: proposal.revealSecretIds,
    sourceRecordIds: proposal.sourceRecordIds,
    provisionalFactIds: [
      ...materialized.provisionalFacts.map((fact) => fact.id),
      ...materialized.updatedProvisionalFacts.map((fact) => fact.id),
    ],
    committedAt: now,
    ...(proposal.timeAdvance
      ? {
          timeAdvance: {
            minutes: proposal.timeAdvance.minutes,
            cause: proposal.timeAdvance.cause,
          },
        }
      : {}),
    suggestedActions: proposal.suggestedActions,
  };
  candidate.turns = [...candidate.turns, turn];
  const scenarioError = markRevealedScenarios(
    candidate,
    proposal.revealScenarioIds,
    turn,
    createId,
  );
  if (scenarioError) return error("unknown-fact", scenarioError);
  const elaborationError = applyScenarioElaborations(
    candidate,
    proposal.elaborateScenarios,
    proposal.revealScenarioIds,
    turn,
    createId,
  );
  if (elaborationError) return elaborationError;
  candidate.revision += 1;
  candidate.updatedAt = now;
  candidate.lastPlayedAt = now;
  if (!validateStateBudget(candidate)) {
    return error(
      "state-budget-exceeded",
      `The compact adventure state exceeds ${MAX_SERIALIZED_STATE_CHARS} characters.`,
    );
  }
  return { ok: true, value: candidate };
}

export function applyRollRequest(
  session: AdventureSession,
  proposalInput: AdventureTurnProposal,
  meta: CommitMetadata,
): Result<AdventureSession, AdventureValidationError[]> {
  if (session.status !== "active" || session.pendingRoll) {
    return error(
      "invalid-transition",
      "The session already has a pending change.",
    );
  }
  const proposal = parseTurnProposal(proposalInput);
  if (proposal.kind !== "roll-required")
    return error("invalid-schema", "A roll is required.");
  // Roll copy is shown to the player, so it gets the same secrecy guard.
  if (detectHiddenLeakage(session, proposal).length > 0) {
    return error(
      "hidden-leakage",
      "The response contains unrevealed GM information.",
    );
  }
  const candidate = clone(session);
  const pending: PendingRoll = {
    id: meta.turnId,
    inputId: meta.inputId,
    playerAction: meta.playerAction ?? "",
    setupNarration: proposal.setupNarration,
    uncertainty: proposal.uncertainty,
    stakes: proposal.stakes,
    dice: proposal.dice
      ? {
          expression: proposal.dice.expression,
          bands: proposal.dice.outcomeBands,
        }
      : undefined,
    resolutionStatus: "awaiting-outcome",
    createdAt: meta.now,
    suggestedActions: proposal.suggestedActions,
  };
  candidate.pendingRoll = pending;
  candidate.revision += 1;
  candidate.updatedAt = meta.now;
  return { ok: true, value: candidate };
}

export function recordPendingRollOutcome(
  session: AdventureSession,
  inputId: string,
  outcome: SuppliedRollOutcome,
  meta: CommitMetadata,
): Result<AdventureSession, AdventureValidationError[]> {
  if (!session.pendingRoll || session.pendingRoll.inputId !== inputId) {
    return error("invalid-roll", "No matching pending roll exists.");
  }
  if (session.pendingRoll.suppliedOutcome) {
    return error(
      "invalid-roll",
      "A result has already been recorded for this roll.",
    );
  }
  const candidate = clone(session);
  candidate.pendingRoll = {
    ...candidate.pendingRoll!,
    suppliedOutcome: outcome,
    resolutionStatus: "ready-to-resolve",
    outcomeRecordedAt: meta.now,
  };
  candidate.revision += 1;
  candidate.updatedAt = meta.now;
  return { ok: true, value: candidate };
}

export function dismissPendingRoll(
  session: AdventureSession,
  inputId: string,
  meta: CommitMetadata,
): Result<AdventureSession, AdventureValidationError[]> {
  if (!session.pendingRoll || session.pendingRoll.inputId !== inputId) {
    return error("invalid-roll", "No matching pending roll exists.");
  }
  if (session.pendingRoll.suppliedOutcome) {
    return error("invalid-roll", "A recorded result cannot be dismissed.");
  }
  const candidate = clone(session);
  candidate.pendingRoll = null;
  candidate.revision += 1;
  candidate.updatedAt = meta.now;
  return { ok: true, value: candidate };
}

export function resolveRecordedRoll(
  session: AdventureSession,
  proposalInput: AdventureTurnProposal,
  meta: CommitMetadata,
): Result<AdventureSession, AdventureValidationError[]> {
  if (!session.pendingRoll?.suppliedOutcome) {
    return error("invalid-roll", "No recorded result is ready for resolution.");
  }
  const pendingRoll = session.pendingRoll;
  const result = applyCompletedTurn(
    { ...session, pendingRoll: null },
    proposalInput,
    meta,
  );
  if (!result.ok) return result;
  const candidate = result.value;
  candidate.pendingRoll = null;
  const resolvedTurn = candidate.turns[candidate.turns.length - 1]!;
  resolvedTurn.rollOutcome = pendingRoll.suppliedOutcome;
  resolvedTurn.resolvedRoll = {
    expression: pendingRoll.dice?.expression,
    bands: pendingRoll.dice?.bands,
    outcome: pendingRoll.suppliedOutcome!,
  };
  return { ok: true, value: candidate };
}

export function createPlayerTranscript(session: AdventureSession) {
  return {
    sessionId: session.id,
    title: session.title,
    turns: session.turns.map((turn) => ({
      sequence: turn.sequence,
      playerAction: turn.playerAction,
      narration: turn.narration,
      committedAt: turn.committedAt,
    })),
  };
}
