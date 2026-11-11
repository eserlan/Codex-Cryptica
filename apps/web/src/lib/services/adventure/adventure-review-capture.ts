import type { AdventureSession } from "@codex/adventure-engine";
import {
  formatWorldElapsedMinutes,
  sceneStallPacing,
} from "@codex/adventure-engine";

/**
 * On-demand, local-only GM review snapshot. Both formats include hidden state
 * deliberately; neither format is suitable for player-facing sharing.
 */
export function adventureReviewJson(session: AdventureSession): string {
  return JSON.stringify(session, null, 2);
}

function quote(text: string): string {
  return text
    .split(/\r?\n/)
    .map((line) => "> " + line)
    .join("\n");
}

function addJsonSection(lines: string[], heading: string, data: unknown): void {
  lines.push(
    "## " + heading,
    "",
    "\x60\x60\x60json",
    JSON.stringify(data, null, 2),
    "\x60\x60\x60",
    "",
  );
}

/**
 * Readable counterpart to the full JSON. Includes every committed player turn
 * and the private scenario/clock/patch ledger needed to diagnose slow starts,
 * missing revelations, continuity and hidden-world progression.
 */
export function adventureReviewMarkdown(session: AdventureSession): string {
  const scenarios = session.scenarioCollection?.items ?? [];
  const lines = [
    "# Adventure play review: " + session.title,
    "",
    "> GM-only review copy. Contains hidden truths, unheard rumours and private",
    "> world state. Do not share with players.",
    "",
    "## Session",
    "",
    "- Session ID: " + session.id,
    "- Status: " + session.status,
    "- Revision: " + session.revision,
    "- Turns committed: " + session.turns.length,
    "- Scenarios: " + scenarios.length,
    "- Unheard scenarios: " +
      scenarios.filter((item) => item.knowledge === "unheard").length,
    "- Heard scenarios: " +
      scenarios.filter((item) => item.knowledge === "heard").length,
    "- Dismissed discoveries: " +
      (session.dismissedProvisionalFactIds?.length ?? 0),
    "- Elapsed fictional time: " +
      formatWorldElapsedMinutes(session.worldTime?.elapsedMinutes ?? 0),
    "- Last played: " + session.lastPlayedAt,
    "",
    "### Premise",
    "",
    quote(session.premise),
    "",
    "## Player transcript",
    "",
  ];

  if (session.turns.length === 0) {
    lines.push("No committed turns yet.", "");
  }
  for (const turn of session.turns) {
    lines.push(
      "### Turn " + (turn.sequence + 1) + " (" + turn.id + ")",
      "",
      "**Player action**",
      "",
      quote(turn.playerAction),
      "",
      "**Oracle narration**",
      "",
      quote(turn.narration),
      "",
    );
    if (turn.timeAdvance) {
      lines.push(
        "- Fictional time advanced: " +
          formatWorldElapsedMinutes(turn.timeAdvance.minutes) +
          " (" +
          turn.timeAdvance.cause +
          ")",
      );
    }
    if (turn.suggestedActions?.length) {
      lines.push("- Suggested actions: " + turn.suggestedActions.join(" | "));
    }
    lines.push("- Committed at: " + turn.committedAt, "");
  }

  addJsonSection(lines, "World entry and player character", {
    worldEntry: session.worldEntry,
    playerCharacter: session.playerCharacter,
  });
  addJsonSection(lines, "Current player-visible state", session.visibleState);
  addJsonSection(
    lines,
    "Scenario state (GM-only, including unheard seeds and truths)",
    session.scenarioCollection ?? null,
  );
  addJsonSection(lines, "Hidden state (GM-only)", session.hiddenState);
  addJsonSection(
    lines,
    "World time and private event ledger (GM-only)",
    session.worldTime ?? null,
  );
  addJsonSection(
    lines,
    "Provisional entities and facts",
    session.provisionalFacts,
  );
  addJsonSection(
    lines,
    "Dismissed discovery IDs",
    session.dismissedProvisionalFactIds ?? [],
  );
  addJsonSection(lines, "Source record references", session.sourceRecords);
  addJsonSection(
    lines,
    "Committed state-change ledger (GM-only)",
    session.turns.map((turn) => ({
      turnId: turn.id,
      sequence: turn.sequence,
      visiblePatch: turn.visiblePatch,
      hiddenPatch: turn.hiddenPatch,
      revealedSecretIds: turn.revealedSecretIds,
      sourceRecordIds: turn.sourceRecordIds,
      provisionalFactIds: turn.provisionalFactIds,
      rollOutcome: turn.rollOutcome,
      resolvedRoll: turn.resolvedRoll,
      timeAdvance: turn.timeAdvance,
    })),
  );
  addJsonSection(lines, "Pending roll", session.pendingRoll);
  return lines.join("\n").trimEnd() + "\n";
}

export const DEFAULT_DIAGNOSTIC_RECENT_TURNS = 20;

const DIAGNOSTIC_README = [
  "GM-only diagnostic snapshot of one solo adventure, written for an LLM to read.",
  "It contains hidden secrets and GM threads. Do not share with players.",
  "summary: quick orientation. quietTurns: trailing turns that changed nothing in the world (0 when under 4 turns or a roll is pending). integrityChecks: precomputed consistency findings (empty arrays mean clean).",
  "state: the current truth. places lists where the player has been; facts and characters carry a placeId, and ones with none apply everywhere. visibleState is what the player knows; hiddenState and scenarioCollection are GM-only.",
  "source 'provisional' means the Oracle invented it in play; it is not backed by a Vault record.",
  "turns: oldest first. Turns marked detail 'condensed' keep only action, narration and time; detail 'full' also keeps every state patch.",
  "timeAdvance is null when a turn did not move the fictional clock. Time is in minutes.",
].join(" ");

export interface AdventureDiagnosticOptions {
  /** Turns that keep their full patches. Older turns are condensed. */
  recentTurns?: number;
}

function integrityChecks(session: AdventureSession) {
  const turnIds = new Set(session.turns.map((turn) => turn.id));
  const factIds = new Set(session.provisionalFacts.map((fact) => fact.id));
  const secretIds = new Set(session.hiddenState.secrets.map((s) => s.id));
  return {
    nonContiguousTurnSequences: session.turns
      .filter((turn, index) => turn.sequence !== index)
      .map((turn) => turn.id),
    factsIntroducedOnMissingTurn: session.provisionalFacts
      .filter((fact) => !turnIds.has(fact.introducedOnTurnId))
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
  };
}

function diagnosticTurns(session: AdventureSession, cutoff: number) {
  return session.turns.map((turn, index) => {
    if (index >= cutoff) {
      return { detail: "full", ...turn, timeAdvance: turn.timeAdvance ?? null };
    }
    return {
      detail: "condensed",
      id: turn.id,
      sequence: turn.sequence,
      playerAction: turn.playerAction,
      narration: turn.narration,
      timeAdvance: turn.timeAdvance ?? null,
      committedAt: turn.committedAt,
    };
  });
}

function diagnosticSummary(
  session: AdventureSession,
  cutoff: number,
  scenarios: NonNullable<AdventureSession["scenarioCollection"]>["items"],
  lastTurn: AdventureSession["turns"][number] | undefined,
) {
  return {
    sessionId: session.id,
    title: session.title,
    schemaVersion: session.schemaVersion,
    revision: session.revision,
    status: session.status,
    turnsTotal: session.turns.length,
    turnsFull: session.turns.length - cutoff,
    turnsCondensed: cutoff,
    elapsedMinutes: session.worldTime?.elapsedMinutes ?? 0,
    currentLocation: session.visibleState.location?.text ?? null,
    currentPlace:
      session.places?.find((place) => place.id === session.currentPlaceId)?.name ??
      null,
    currentSituation: session.visibleState.situation?.text ?? null,
    hiddenSecrets: session.hiddenState.secrets.filter(
      (secret) => secret.status === "hidden",
    ).length,
    revealedSecrets: session.hiddenState.secrets.filter(
      (secret) => secret.status === "revealed",
    ).length,
    openScenarios: scenarios.filter((item) => item.status === "open").length,
    unheardScenarios: scenarios.filter((item) => item.knowledge === "unheard")
      .length,
    pendingRoll: session.pendingRoll != null,
    quietTurns: sceneStallPacing(session)?.quietTurns ?? 0,
    lastPlayerAction: lastTurn?.playerAction ?? null,
    lastPlayedAt: session.lastPlayedAt,
  };
}

function diagnosticState(session: AdventureSession) {
  return {
    premise: session.premise,
    worldEntry: session.worldEntry,
    playerCharacter: session.playerCharacter,
    visibleState: session.visibleState,
    hiddenState: session.hiddenState,
    scenarioCollection: session.scenarioCollection ?? null,
    worldTime: session.worldTime ?? null,
    places: session.places ?? [],
    currentPlaceId: session.currentPlaceId ?? null,
    provisionalFacts: session.provisionalFacts,
    sourceRecords: session.sourceRecords,
    pendingRoll: session.pendingRoll ?? null,
  };
}

/**
 * Compact, LLM-oriented JSON snapshot. Keeps the current state in full, the
 * latest turns in full and older turns as action, narration and time only, so
 * long sessions stay within a model's context. The full-fidelity copy remains
 * `adventureReviewJson`.
 */
export function adventureDiagnosticJson(
  session: AdventureSession,
  options: AdventureDiagnosticOptions = {},
): string {
  const recent = Math.max(
    0,
    options.recentTurns ?? DEFAULT_DIAGNOSTIC_RECENT_TURNS,
  );
  const cutoff = Math.max(0, session.turns.length - recent);
  const scenarios = session.scenarioCollection?.items ?? [];
  const lastTurn = session.turns.at(-1);

  return JSON.stringify(
    {
      _readme: DIAGNOSTIC_README,
      summary: diagnosticSummary(session, cutoff, scenarios, lastTurn),
      integrityChecks: integrityChecks(session),
      state: diagnosticState(session),
      turns: diagnosticTurns(session, cutoff),
    },
    null,
    1,
  );
}
