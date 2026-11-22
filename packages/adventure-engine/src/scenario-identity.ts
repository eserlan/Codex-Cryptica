import type { AdventureSession } from "./types";
import { scenarioItemIdentityIds } from "./scenario-schemas";

export function validateScenarioIdentitySpace(session: AdventureSession): void {
  const collection = session.scenarioCollection;
  if (!collection) return;
  const occupiedIds = collectOccupiedIds(session);
  const scenarioIds = new Set<string>();
  for (const item of collection.items) {
    assertUniqueScenarioRecordIds(item, occupiedIds, scenarioIds);
    assertUniqueScenarioSecretBindings(item, session, occupiedIds, scenarioIds);
  }
}

function recordIds(
  records: ReadonlyArray<{ id: string } | null | undefined> = [],
): string[] {
  return records.flatMap((entry) => (entry ? [entry.id] : []));
}

function collectOccupiedIds(session: AdventureSession): Set<string> {
  const occupiedIds = new Set([
    session.id,
    session.vaultId,
    ...recordIds(session.visibleState.objectives),
    ...recordIds(session.visibleState.activeCharacters),
    ...recordIds(session.visibleState.knownFacts),
    ...recordIds(session.visibleState.relationships),
    ...recordIds([
      session.visibleState.location,
      session.visibleState.situation,
    ]),
    ...recordIds(session.hiddenState.secrets),
    ...recordIds(session.hiddenState.gmThreads),
    ...recordIds(session.provisionalFacts),
    ...recordIds(session.turns),
    ...recordIds(session.oocExchanges),
    ...recordIds([session.pendingRoll]),
    ...recordIds(session.dicePresets),
    ...recordIds(session.resourceCounters),
    ...recordIds(session.worldTime?.events),
  ]);
  return occupiedIds;
}

type ScenarioCollectionItem = NonNullable<
  AdventureSession["scenarioCollection"]
>["items"][number];

function assertUniqueScenarioRecordIds(
  item: ScenarioCollectionItem,
  occupiedIds: Set<string>,
  scenarioIds: Set<string>,
): void {
  for (const id of [item.id, ...item.events.map((event) => event.id)]) {
    if (occupiedIds.has(id) || scenarioIds.has(id)) {
      throw new Error("scenario-id-collision");
    }
    scenarioIds.add(id);
  }
}

function assertUniqueScenarioSecretBindings(
  item: ScenarioCollectionItem,
  session: AdventureSession,
  occupiedIds: Set<string>,
  scenarioIds: Set<string>,
): void {
  const sourceText = new Map(scenarioSecretSourceText(item));
  const boundIds = scenarioItemIdentityIds(item).filter((id) =>
    sourceText.has(id),
  );
  for (const secretId of boundIds) {
    if (scenarioIds.has(secretId)) {
      throw new Error("scenario-secret-id-collision");
    }
    assertCompatibleSecretBinding(
      secretId,
      sourceText.get(secretId) ?? "",
      session,
      occupiedIds,
    );
    scenarioIds.add(secretId);
  }
}

function assertCompatibleSecretBinding(
  secretId: string,
  sourceText: string,
  session: AdventureSession,
  occupiedIds: Set<string>,
): void {
  const registered = session.hiddenState.secrets.find(
    (entry) => entry.id === secretId,
  );
  if (registered) {
    if (
      normalizeIdentityText(registered.text) !==
      normalizeIdentityText(sourceText)
    ) {
      throw new Error("scenario-secret-id-collision");
    }
  } else if (occupiedIds.has(secretId)) {
    throw new Error("scenario-secret-id-collision");
  }
}

function scenarioSecretSourceText(
  item: ScenarioCollectionItem,
): Array<[string, string]> {
  const entries: Array<[string, string]> = [
    [item.secretBindings.truth, item.gmOnly.truth],
  ];
  if (item.secretBindings.ifInvestigated) {
    entries.push([
      item.secretBindings.ifInvestigated,
      item.gmOnly.ifInvestigated ?? "",
    ]);
  }
  return [...entries, ...scenarioEventSecretSourceText(item)];
}

function scenarioEventSecretSourceText(
  item: ScenarioCollectionItem,
): Array<[string, string]> {
  return item.events.flatMap((event) => {
    const id = Object.hasOwn(item.secretBindings.eventIds, event.id)
      ? item.secretBindings.eventIds[event.id]
      : undefined;
    return event.visibility === "gm" && id
      ? [[id, event.text] as [string, string]]
      : [];
  });
}

function normalizeIdentityText(value: string): string {
  return value.toLocaleLowerCase().replace(/\s+/g, " ").trim();
}
