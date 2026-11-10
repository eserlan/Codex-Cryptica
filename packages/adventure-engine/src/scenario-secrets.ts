import type { AdventureSession, AdventureTurnProposal } from "./types";

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

export function hasImmutableScenarioRewrite(
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

export function applySecretReveals(
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
