import type { AdventureSession, AdventureTurnProposal } from "./types";
import { historicalAnchorSecretIds } from "./hidden-state";
import { MAX_PACKAGE_PROGRESS_ENTRIES } from "./schemas";

type SecretRevealError = {
  code: "unknown-secret" | "state-budget-exceeded";
  message: string;
};

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

function recordPackageSecretReveal(
  candidate: AdventureSession,
  secretId: string,
  packageSecretTexts?: Readonly<Record<string, string>>,
): "unknown" | "recorded" | "limit-exceeded" {
  if (!packageSecretTexts || !Object.hasOwn(packageSecretTexts, secretId)) {
    return "unknown";
  }
  if (candidate.packageProgress) {
    const revealed = new Set(candidate.packageProgress.revealedSecretIds ?? []);
    if (!revealed.has(secretId) && revealed.size >= MAX_PACKAGE_PROGRESS_ENTRIES) {
      // Never persist a package reveal list that the session reader rejects.
      return "limit-exceeded";
    }
    revealed.add(secretId);
    candidate.packageProgress.revealedSecretIds = [...revealed];
  }
  return "recorded";
}

export function applySecretReveals(
  candidate: AdventureSession,
  secrets: AdventureSession["hiddenState"]["secrets"],
  revealIds: string[],
  turnId: string,
  packageSecretTexts?: Readonly<Record<string, string>>,
): SecretRevealError | null {
  for (const secretId of new Set(revealIds)) {
    const secret = secrets.find((entry) => entry.id === secretId);
    if (secret) {
      secret.status = "revealed";
      secret.revealedOnTurnId = turnId;
    }
    const target = candidate.scenarioCollection?.items.find((item) =>
      scenarioSecretBindingIds(item).includes(secretId),
    );
    if (target) {
      target.revealedSecretIds = [
        ...new Set([...target.revealedSecretIds, secretId]),
      ];
      continue;
    }
    if (isHistoricalAnchorSecretId(candidate, secretId)) {
      candidate.historicalAnchor!.revealedFactIds = [
        ...new Set([...candidate.historicalAnchor!.revealedFactIds, secretId]),
      ];
      continue;
    }
    const packageReveal = recordPackageSecretReveal(
      candidate,
      secretId,
      packageSecretTexts,
    );
    if (packageReveal === "recorded") continue;
    if (packageReveal === "limit-exceeded") {
      return {
        code: "state-budget-exceeded",
        message: `The adventure has reached its limit of ${MAX_PACKAGE_PROGRESS_ENTRIES} revealed package secrets. This turn was not saved.`,
      };
    }
    if (!secret) {
      return { code: "unknown-secret", message: `Unknown secret: ${secretId}` };
    }
  }
  return null;
}

function isHistoricalAnchorSecretId(
  session: AdventureSession,
  secretId: string,
): boolean {
  const anchor = session.historicalAnchor;
  if (!anchor) return false;
  return historicalAnchorSecretIds(session).includes(secretId);
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
