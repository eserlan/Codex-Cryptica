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

/** Stable secret IDs for GM-only scenario text, so the reveal lifecycle can use them. */
export const SCENARIO_TRUTH_SECRET_ID = "scenario-baseline-truth";
export const SCENARIO_IF_INVESTIGATED_SECRET_ID = "scenario-if-investigated";
export function scenarioEventSecretId(eventId: string): string {
  return `scenario-event-${eventId.trim()}`;
}

function scenarioSecretSources(
  session: AdventureSession,
): Array<{ id: string; text: string }> {
  const scenario = session.scenarioState;
  if (!scenario) return [];
  return [
    { id: SCENARIO_TRUTH_SECRET_ID, text: scenario.gmOnly.truth },
    ...(scenario.gmOnly.ifInvestigated?.trim()
      ? [
          {
            id: SCENARIO_IF_INVESTIGATED_SECRET_ID,
            text: scenario.gmOnly.ifInvestigated,
          },
        ]
      : []),
    ...scenario.events
      .filter((event) => event.visibility === "gm")
      .map((event) => ({
        id: scenarioEventSecretId(event.id),
        text: event.text,
      })),
  ].filter((source) => source.text.trim().length > 0);
}

/**
 * Register every GM-only scenario text (truth, "if investigated" notes and
 * GM-visible events) as an ordinary hidden secret. A source already covered by
 * a secret with the same text keeps that secret and its reveal status, so
 * sessions created before this registration existed stay compatible. Returns
 * the same object when nothing needs registering.
 */
export function ensureScenarioSecrets(
  session: AdventureSession,
): AdventureSession {
  const secrets = session.hiddenState.secrets;
  const missing = scenarioSecretSources(session).filter(
    (source) =>
      !secrets.some(
        (secret) =>
          secret.id === source.id ||
          normalize(secret.text) === normalize(source.text),
      ),
  );
  if (missing.length === 0) return session;
  return {
    ...session,
    hiddenState: {
      ...session.hiddenState,
      secrets: [
        ...secrets,
        ...missing.map((source) => ({
          id: source.id,
          text: source.text,
          status: "hidden" as const,
          revealCondition: "Reveal after in-world discovery.",
        })),
      ],
    },
  };
}

/**
 * Fields the player can see. The GM-only `hiddenPatch` is excluded: copying a
 * secret into hidden state is not a leak.
 */
function playerFacingStrings(
  proposal: AdventureTurnProposal,
): Array<[string, string]> {
  if (proposal.kind === "complete") {
    const { hiddenPatch: _hidden, ...visible } = proposal;
    return strings(visible);
  }
  return strings(proposal);
}

export function detectHiddenLeakage(
  sessionInput: AdventureSession,
  proposal: AdventureTurnProposal,
): HiddenLeakageFinding[] {
  const session = ensureScenarioSecrets(sessionInput);
  const fields = playerFacingStrings(proposal);
  const revealed = new Set(
    proposal.kind === "complete" ? proposal.revealSecretIds : [],
  );
  const hidden = session.hiddenState.secrets.filter(
    (secret) => secret.status === "hidden" && !revealed.has(secret.id),
  );
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
