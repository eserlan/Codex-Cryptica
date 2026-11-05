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
): Array<{ id: string; text: string; revealed: boolean }> {
  const items = session.scenarioCollection?.items ?? [];
  return items
    .flatMap((scenario) => [
      {
        id: scenario.secretBindings.truth,
        text: scenario.gmOnly.truth,
        revealed: scenario.revealedSecretIds.includes(
          scenario.secretBindings.truth,
        ),
      },
      ...(scenario.gmOnly.ifInvestigated?.trim() &&
      scenario.secretBindings.ifInvestigated
        ? [
            {
              id: scenario.secretBindings.ifInvestigated,
              text: scenario.gmOnly.ifInvestigated,
              revealed: scenario.revealedSecretIds.includes(
                scenario.secretBindings.ifInvestigated,
              ),
            },
          ]
        : []),
      ...scenario.events
        .filter((event) => event.visibility === "gm")
        .flatMap((event) => {
          const id = scenario.secretBindings.eventIds[event.id];
          return id
            ? [
                {
                  id,
                  text: event.text,
                  revealed: scenario.revealedSecretIds.includes(id),
                },
              ]
            : [];
        }),
    ])
    .filter((source) => source.text.trim().length > 0);
}

/**
 * Structured scenario secrets live in the collection and are projected into
 * the guard. They are not duplicated into the capped legacy secret array.
 */
export function ensureScenarioSecrets(
  session: AdventureSession,
): AdventureSession {
  return session;
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
  return detectHiddenTextFields(session, fields, revealed);
}

/** Checks partial player-facing text against the session's unrevealed secrets. */
export function detectHiddenTextLeakage(
  sessionInput: AdventureSession,
  text: string,
): HiddenLeakageFinding[] {
  const session = ensureScenarioSecrets(sessionInput);
  return detectHiddenTextFields(session, [["root", text]], new Set());
}

function detectHiddenTextFields(
  session: AdventureSession,
  fields: Array<[string, string]>,
  revealed: Set<string>,
): HiddenLeakageFinding[] {
  const structuredSecrets = scenarioSecretSources(session).map((secret) => ({
    id: secret.id,
    text: secret.text,
    status: secret.revealed ? ("revealed" as const) : ("hidden" as const),
  }));
  const hiddenById = new Map(
    [...session.hiddenState.secrets, ...structuredSecrets].map((secret) => [
      secret.id,
      secret,
    ]),
  );
  const hidden = [...hiddenById.values()].filter(
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
  const known = new Set([
    ...session.hiddenState.secrets.map((secret) => secret.id),
    ...scenarioSecretSources(session).map((secret) => secret.id),
  ]);
  return ids.filter((id) => known.has(id));
}
