import type { AdventureSession } from "./types";

export function createPlayerTranscript(session: AdventureSession) {
  return {
    sessionId: session.id,
    title: session.title,
    turns: session.turns.map((turn) => ({
      sequence: turn.sequence,
      playerAction: turn.playerAction,
      narration: turn.narration,
      committedAt: turn.committedAt,
    })),
  };
}
