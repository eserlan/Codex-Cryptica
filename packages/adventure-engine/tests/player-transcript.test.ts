import { describe, expect, it } from "vitest";
import { createPlayerTranscript } from "../src/player-transcript";
import { applyCompletedTurn } from "../src/completed-turn";
import { meta, now, proposal, session } from "./reducer-fixtures";

describe("player transcript projection", () => {
  it("projects only committed player fields and never GM state or pending narration", () => {
    const current = session();
    const next = proposal();
    next.hiddenPatch.secrets.add = [
      { text: "Private canary", status: "hidden" },
    ];
    const result = applyCompletedTurn(current, next, {
      ...meta,
      playerAction: "Walk",
    });
    if (!result.ok) throw new Error("Expected turn");
    result.value.pendingRoll = {
      id: "pending",
      inputId: "pending-input",
      playerAction: "Wait",
      uncertainty: "Risk",
      stakes: "Loss",
      setupNarration: "Pending canary",
      resolutionStatus: "awaiting-outcome",
      createdAt: now,
    };
    const transcript = createPlayerTranscript(result.value);
    expect(transcript).toEqual({
      sessionId: current.id,
      title: current.title,
      turns: [
        {
          sequence: 0,
          playerAction: "Walk",
          narration: next.narration,
          committedAt: now,
        },
      ],
    });
    expect(JSON.stringify(transcript)).not.toContain("canary");
    transcript.turns[0]!.narration = "Edited";
    expect(result.value.turns[0]?.narration).toBe(next.narration);
  });

  it("exports an empty transcript before a turn is committed", () => {
    const current = session();
    expect(createPlayerTranscript(current)).toEqual({
      sessionId: current.id,
      title: current.title,
      turns: [],
    });
  });
});
