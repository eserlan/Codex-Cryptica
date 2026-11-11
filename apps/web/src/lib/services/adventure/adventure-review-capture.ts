import type { AdventureSession } from "@codex/adventure-engine";
import { formatWorldElapsedMinutes } from "@codex/adventure-engine";

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
