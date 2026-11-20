import type {
  AdventureSession,
  AdventureTurnProposal,
  CommitMetadata,
  HiddenLeakageDiagnostic,
} from "./types";
import {
  HISTORICAL_ANCHOR_TITLE_SECRET_ID,
  historicalAnchorDateSecretId,
  historicalAnchorEntitySecretId,
} from "./historical-anchor-types";
import {
  createBoundaryMatcher,
  isFreeTextMatchableId,
} from "./adventure-json/term-matcher";

export interface HiddenLeakageFinding {
  field: string;
  secretId: string;
}

/** Converts an internal leakage finding into an opaque, leak-safe diagnostic. */
export function classifyHiddenLeakageFinding(
  finding: HiddenLeakageFinding,
): HiddenLeakageDiagnostic {
  if (finding.secretId === "pinned-package-text") {
    return {
      guard: "package-text",
      field: finding.field,
      sourceRef: "pinned-package-text",
    };
  }
  if (finding.secretId === "pinned-package-id") {
    return {
      guard: "package-id",
      field: finding.field,
      sourceRef: "pinned-package-id",
    };
  }
  const sourceRef = finding.secretId.startsWith("historical-anchor-")
    ? "historical-anchor-secret"
    : finding.secretId.startsWith("scenario-")
      ? "scenario-secret"
      : "session-secret";
  return {
    guard: "scenario-secret",
    field: finding.field,
    sourceRef,
  };
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
      ...(scenario.pressure?.expectedConsequence?.trim() &&
      scenario.pressure.triggeredAtMinute === undefined
        ? [
            {
              id: `scenario-pressure-${scenario.id}`,
              text: scenario.pressure.expectedConsequence,
              revealed: false,
            },
          ]
        : []),
      ...scenario.events
        .filter((event) => event.visibility === "gm")
        .flatMap((event) => {
          const id = Object.hasOwn(scenario.secretBindings.eventIds, event.id)
            ? scenario.secretBindings.eventIds[event.id]
            : undefined;
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
 * Fields the player can see. The GM-only `hiddenPatch` and `packageEvents` are excluded: copying a
 * secret into hidden state is not a leak.
 */
function playerFacingStrings(
  proposal: AdventureTurnProposal,
): Array<[string, string]> {
  if (proposal.kind === "complete") {
    const {
      hiddenPatch: _hidden,
      revealSecretIds: _reveals,
      packageEvents: _packageEvents,
      actorEvents: _actorEvents,
      timeAdvance,
      ...visible
    } = proposal;
    const playerTimeAdvance = timeAdvance
      ? { minutes: timeAdvance.minutes, cause: timeAdvance.cause }
      : undefined;
    return strings({
      ...visible,
      ...(playerTimeAdvance ? { timeAdvance: playerTimeAdvance } : {}),
    });
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
  // GM threads have no revealSecretIds lifecycle: an explicit transition to
  // "revealed" in this proposal is their same-turn disclosure.
  if (proposal.kind === "complete") {
    for (const thread of proposal.hiddenPatch.gmThreads.update) {
      if (thread.status === "revealed") revealed.add(thread.id);
    }
  }
  return detectHiddenTextFields(
    session,
    fields,
    revealed,
    proposal.kind === "complete" ? proposedHiddenSources(proposal) : [],
  );
}

/** Checks player-facing proposal text against the current pinned package. */
export function detectPackageLeakage(
  proposal: AdventureTurnProposal,
  meta: CommitMetadata,
  session?: AdventureSession,
): HiddenLeakageFinding[] {
  const fields = playerFacingStrings(proposal).filter(
    ([field]) =>
      !field.endsWith(".packageSceneId") && !field.includes(".sourceRecordIds"),
  );
  return detectPackageFieldsLeakage(fields, meta, session, proposal);
}

/** Checks partial player-facing text (such as a streamed preview) against pinned package guards. */
export function detectPackageTextLeakage(
  text: string,
  meta: Pick<CommitMetadata, "packageGmOnlyText" | "packageRecordIds">,
  session?: AdventureSession,
): HiddenLeakageFinding[] {
  return detectPackageFieldsLeakage([["root", text]], meta, session);
}

function actorEventSecretTexts(
  events: readonly { note: string; fact?: string }[] | undefined,
): string[] {
  if (!events) return [];
  return events.flatMap((event) =>
    event.fact ? [event.note, event.fact] : [event.note],
  );
}

function proposedPackageSecretTexts(
  proposal?: AdventureTurnProposal,
): string[] {
  if (proposal?.kind !== "complete") return [];
  return [
    ...(proposal.packageEvents ?? []).map((event) => event.note),
    ...actorEventSecretTexts(proposal.actorEvents),
  ];
}

function storedPackageSecretTexts(
  progress?: AdventureSession["packageProgress"],
): string[] {
  if (!progress) return [];
  return [
    ...(progress.events ?? []).map((event) => event.note),
    ...actorEventSecretTexts(progress.actorEvents),
    ...(progress.actors ?? []).flatMap((actor) => actor.facts),
  ];
}

function collectPackageSecretTexts(
  meta: Pick<CommitMetadata, "packageGmOnlyText">,
  session?: AdventureSession,
  proposal?: AdventureTurnProposal,
): string[] {
  return [
    ...(meta.packageGmOnlyText ?? []),
    ...proposedPackageSecretTexts(proposal),
    ...storedPackageSecretTexts(session?.packageProgress),
  ];
}

function collectPackageSecretIds(
  meta: Pick<CommitMetadata, "packageRecordIds">,
  session?: AdventureSession,
): string[] {
  const stored = session?.packageProgress;
  return [
    ...(meta.packageRecordIds ?? []),
    ...(stored?.events ?? []).map((event) => event.id),
    ...(stored?.actorEvents ?? []).map((event) => event.id),
  ];
}

function detectPackageFieldsLeakage(
  fields: Array<[string, string]>,
  meta: Pick<CommitMetadata, "packageGmOnlyText" | "packageRecordIds">,
  session?: AdventureSession,
  proposal?: AdventureTurnProposal,
): HiddenLeakageFinding[] {
  return [
    ...packageTextLeakage(
      fields,
      collectPackageSecretTexts(meta, session, proposal),
    ),
    ...packageIdLeakage(fields, collectPackageSecretIds(meta, session)),
  ];
}

function packageTextLeakage(
  fields: Array<[string, string]>,
  secrets: readonly string[],
): HiddenLeakageFinding[] {
  const longSecrets: string[] = [];
  const shortSecrets = new Set<string>();
  const shortNumericSecrets: string[] = [];
  for (const secret of secrets) {
    const needle = normalize(secret);
    if (!needle) continue;
    if (needle.length < 3) {
      shortSecrets.add(needle);
      if (needle.length >= 2 && /^\d+$/.test(needle))
        shortNumericSecrets.push(needle);
    } else longSecrets.push(needle);
  }
  const longMatcher = createBoundaryMatcher(longSecrets);
  const shortNumericMatcher = createBoundaryMatcher(shortNumericSecrets);
  return fields.flatMap(([field, value]) => {
    const text = normalize(value);
    const exactShortNote = shortSecrets.has(text);
    return exactShortNote || shortNumericMatcher(text) || longMatcher(text)
      ? [{ field, secretId: "pinned-package-text" }]
      : [];
  });
}

function packageIdLeakage(
  fields: Array<[string, string]>,
  ids: readonly string[],
): HiddenLeakageFinding[] {
  const normalizedPlainWordIds = new Set(
    ids.filter((id) => !isFreeTextMatchableId(id)).map(normalize),
  );
  const matcher = createBoundaryMatcher(ids.filter(isFreeTextMatchableId));
  return fields.flatMap(([field, value]) =>
    normalizedPlainWordIds.has(normalize(value)) || matcher(value)
      ? [{ field, secretId: "pinned-package-id" }]
      : [],
  );
}

/** Checks partial player-facing text against the session's unrevealed secrets. */
export function detectHiddenTextLeakage(
  sessionInput: AdventureSession,
  text: string,
): HiddenLeakageFinding[] {
  const session = ensureScenarioSecrets(sessionInput);
  return detectHiddenTextFields(session, [["root", text]], new Set());
}

export function historicalAnchorSecretSources(
  session: AdventureSession,
): Array<{ id: string; text: string; revealed: boolean }> {
  const anchor = session.historicalAnchor;
  if (!anchor) return [];
  const revealed = new Set(anchor.revealedFactIds);
  const sources: Array<{ id: string; text: string; revealed: boolean }> = [
    ...anchor.baseline.relevantEntityRefs.flatMap((ref) =>
      [
        { field: "id", text: ref.recordId },
        { field: "name", text: ref.displayName },
        ...(ref.recordType
          ? [{ field: "type", text: `Type ${ref.recordType}` }]
          : []),
        ...(ref.role ? [{ field: "role", text: `Role ${ref.role}` }] : []),
      ].map(({ field, text }) => ({
        id: historicalAnchorEntitySecretId(ref.recordId, field),
        text,
        revealed: revealed.has(
          historicalAnchorEntitySecretId(ref.recordId, field),
        ),
      })),
    ),
    ...(["start", "end"] as const).flatMap((edge) => {
      const date =
        edge === "start"
          ? anchor.eventInterval.start
          : anchor.eventInterval.end;
      if (!date) return [];
      const fields = [
        { field: "year", text: `Year ${date.year}` },
        ...(date.month !== undefined
          ? [{ field: "month", text: `Month ${date.month}` }]
          : []),
        ...(date.day !== undefined
          ? [{ field: "day", text: `Day ${date.day}` }]
          : []),
        ...(date.unitId
          ? [{ field: "unit", text: `Unit ${date.unitId}` }]
          : []),
        ...(date.anchorId
          ? [{ field: "anchor", text: `Anchor ${date.anchorId}` }]
          : []),
        ...(date.label ? [{ field: "label", text: date.label }] : []),
      ];
      return fields.map(({ field, text }) => {
        const id = historicalAnchorDateSecretId(edge, field);
        return { id, text, revealed: revealed.has(id) };
      });
    }),
    ...(anchor.eventInterval.label
      ? [
          {
            id: historicalAnchorDateSecretId("interval", "label"),
            text: anchor.eventInterval.label,
            revealed: revealed.has(
              historicalAnchorDateSecretId("interval", "label"),
            ),
          },
        ]
      : []),
    ...anchor.baseline.documentedFacts.map((fact) => ({
      id: fact.id,
      text: fact.text,
      revealed: revealed.has(fact.id),
    })),
    {
      id: HISTORICAL_ANCHOR_TITLE_SECRET_ID,
      text: anchor.baseline.title,
      revealed: revealed.has(HISTORICAL_ANCHOR_TITLE_SECRET_ID),
    },
  ];
  return sources.filter((source) => source.text.trim().length > 0);
}

export function historicalAnchorSecretIds(session: AdventureSession): string[] {
  return historicalAnchorSecretSources(session).map((secret) => secret.id);
}

/**
 * Materialization assigns new IDs after the leakage gate. Give proposed
 * hidden additions and updates opaque diagnostic IDs so the same-turn
 * narration cannot copy a newly improvised GM-only identity.
 */
function proposedHiddenSources(
  proposal: Extract<AdventureTurnProposal, { kind: "complete" }>,
): Array<{ id: string; text: string; status: "hidden" | "revealed" }> {
  return [
    ...proposal.hiddenPatch.secrets.add.map((secret, index) => ({
      id: `proposed-secret-${index}`,
      text: secret.text,
      status: secret.status,
    })),
    ...proposal.hiddenPatch.secrets.update.map((secret) => ({
      id: secret.id,
      text: secret.text,
      status: secret.status,
    })),
    ...proposal.hiddenPatch.gmThreads.add.map((thread, index) => ({
      id: `proposed-thread-${index}`,
      text: thread.text,
      status: thread.status,
    })),
    ...proposal.hiddenPatch.gmThreads.update.map((thread) => ({
      id: thread.id,
      text: thread.text,
      status: thread.status,
    })),
  ];
}

function detectHiddenTextFields(
  session: AdventureSession,
  fields: Array<[string, string]>,
  revealed: Set<string>,
  proposed: Array<{
    id: string;
    text: string;
    status: "hidden" | "revealed";
  }> = [],
): HiddenLeakageFinding[] {
  const structuredSecrets = [
    ...scenarioSecretSources(session),
    ...historicalAnchorSecretSources(session),
  ].map((secret) => ({
    id: secret.id,
    text: secret.text,
    status: secret.revealed ? ("revealed" as const) : ("hidden" as const),
  }));
  const hiddenById = new Map(
    [
      ...session.hiddenState.secrets,
      ...session.hiddenState.gmThreads,
      ...structuredSecrets,
    ].map((secret) => [secret.id, secret]),
  );
  const hidden = [...hiddenById.values(), ...proposed].filter(
    (secret) =>
      secret.status === "hidden" &&
      (secret.id.startsWith("proposed-") || !revealed.has(secret.id)),
  );
  const findings: HiddenLeakageFinding[] = [];
  for (const secret of hidden) {
    const needle = normalize(secret.text);
    if (needle.length < 3) continue;
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
    ...historicalAnchorSecretSources(session).map((secret) => secret.id),
  ]);
  return ids.filter((id) => known.has(id));
}
