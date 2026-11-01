import type { AdventureSession, AdventureTurnProposal } from "./types";

export interface HiddenLeakageFinding {
  field: string;
  secretId: string;
}

function normalize(value: string): string {
  return value.toLocaleLowerCase().replace(/\s+/g, " ").trim();
}

function strings(value: unknown, path = "root"): Array<[string, string]> {
  if (typeof value === "string") return [[path, value]];
  if (Array.isArray(value)) {
    return value.flatMap((entry, index) => strings(entry, `${path}[${index}]`));
  }
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, entry]) =>
      strings(entry, `${path}.${key}`),
    );
  }
  return [];
}

export function detectHiddenLeakage(
  session: AdventureSession,
  proposal: AdventureTurnProposal,
): HiddenLeakageFinding[] {
  const fields = strings(proposal);
  const revealed = new Set(
    proposal.kind === "complete" ? proposal.revealSecretIds : [],
  );
  const hidden = session.hiddenState.secrets.filter(
    (secret) => secret.status === "hidden" && !revealed.has(secret.id),
  );
  // Scenario truth is a separate immutable seed. Enforce its secrecy even if
  // a caller forgot to register it among ordinary hiddenState secrets.
  const scenarioTruth = session.scenarioState?.gmOnly.truth;
  if (scenarioTruth) {
    const matchingSecrets = session.hiddenState.secrets.filter(
      (secret) => normalize(secret.text) === normalize(scenarioTruth),
    );
    const revealedTruth = matchingSecrets.some(
      (secret) => secret.status === "revealed" || revealed.has(secret.id),
    );
    if (
      !revealedTruth &&
      !hidden.some((secret) => normalize(secret.text) === normalize(scenarioTruth))
    ) {
      hidden.push({
        id: "scenario-baseline-truth",
        text: scenarioTruth,
        status: "hidden",
      });
    }
  }
  const findings: HiddenLeakageFinding[] = [];
  for (const secret of hidden) {
    const needle = normalize(secret.text);
    if (needle.length < 4) continue;
    for (const [field, value] of fields) {
      if (normalize(value).includes(needle)) {
        findings.push({ field, secretId: secret.id });
      }
    }
  }
  return findings;
}

export function revealedSecretIds(
  session: AdventureSession,
  ids: string[],
): string[] {
  const known = new Set(session.hiddenState.secrets.map((secret) => secret.id));
  return ids.filter((id) => known.has(id));
}
