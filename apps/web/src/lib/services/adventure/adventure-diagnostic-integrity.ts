import type { AdventureSession } from "@codex/adventure-engine";
import {
  findDuplicateActiveCharacterPresence,
  revealedSecretIds as knownRevealedSecretIds,
} from "@codex/adventure-engine";

export function integrityChecks(session: AdventureSession) {
  const turnIds = new Set(session.turns.map((turn) => turn.id));
  const factIds = new Set(session.provisionalFacts.map((fact) => fact.id));
  const turnRevealIds = session.turns.flatMap(
    (turn) => turn.revealedSecretIds ?? [],
  );
  const secretIds = new Set(knownRevealedSecretIds(session, turnRevealIds));
  return {
    nonContiguousTurnSequences: session.turns
      .filter((turn, index) => turn.sequence !== index)
      .map((turn) => turn.id),
    factsIntroducedOnMissingTurn: session.provisionalFacts
      .filter(
        (fact) =>
          Boolean(fact.introducedOnTurnId) &&
          !turnIds.has(fact.introducedOnTurnId!),
      )
      .map((fact) => fact.id),
    turnsReferencingMissingFacts: session.turns
      .filter((turn) =>
        (turn.provisionalFactIds ?? []).some((id) => !factIds.has(id)),
      )
      .map((turn) => turn.id),
    turnsRevealingUnknownSecrets: session.turns
      .filter((turn) =>
        (turn.revealedSecretIds ?? []).some((id) => !secretIds.has(id)),
      )
      .map((turn) => turn.id),
    secretsMarkedRevealedWithoutTurn: session.hiddenState.secrets
      .filter(
        (secret) =>
          secret.status === "revealed" &&
          (!secret.revealedOnTurnId || !turnIds.has(secret.revealedOnTurnId)),
      )
      .map((secret) => secret.id),
    orphanedPersonFactLinks: (session.people ?? []).flatMap((person) =>
      person.linkedFactIds
        .filter((factId) => !factIds.has(factId))
        .map((factId) => ({ personId: person.id, factId })),
    ),
    duplicateActiveCharacterPresence:
      findDuplicateActiveCharacterPresence(session),
  };
}
