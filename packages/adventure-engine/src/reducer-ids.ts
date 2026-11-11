import { scenarioItemIdentityIds } from "./scenario-schemas";
import type { AdventureSession } from "./types";

export type IdFactory = () => string;

const MAX_ID_ALLOCATION_ATTEMPTS = 10;

export function existingIds(session: AdventureSession): Set<string> {
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
    ...(session.places?.map((place) => place.id) ?? []),
    ...(session.scenarioCollection?.items.flatMap(scenarioItemIdentityIds) ??
      []),
  ]);
}

export function allocateId(
  ids: Set<string>,
  createId: IdFactory,
): string | null {
  for (let attempt = 0; attempt < MAX_ID_ALLOCATION_ATTEMPTS; attempt += 1) {
    const id = createId();
    if (id.trim().length > 0 && !ids.has(id)) {
      ids.add(id);
      return id;
    }
  }
  return null;
}
