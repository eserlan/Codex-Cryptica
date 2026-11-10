import { describe, expect, it } from "vitest";
import { materializeTurnState } from "../src/turn-state";
import { proposal, session } from "./reducer-fixtures";

describe("turn state materialisation", () => {
  it("shares ID reservations across visible, hidden and provisional additions", () => {
    const current = session();
    const next = proposal();
    next.visiblePatch.knownFacts.add = [
      { text: "Footprints", source: "provisional" },
    ];
    next.hiddenPatch.secrets.add = [
      { text: "A private plan", status: "hidden" },
    ];
    next.provisionalFacts = [
      {
        kind: "clue",
        name: "Footprints",
        summary: "Fresh",
        visibility: "player-visible",
      },
    ];
    const ids = ["new-1", "new-1", "new-2", "new-2", "new-3"];
    const result = materializeTurnState(current, next, "turn-1", () =>
      ids.shift()!,
    );
    expect("error" in result).toBe(false);
    if ("error" in result) throw new Error("Expected materialised state");
    expect(result.visibleState.knownFacts[0]?.id).toBe("new-1");
    expect(result.hiddenState.secrets[0]?.id).toBe("new-2");
    expect(result.provisionalFacts[0]?.id).toBe("new-3");
    expect(current.visibleState.knownFacts).toEqual([]);
    expect(current.hiddenState.secrets).toEqual([]);
  });

  it.each(["visible", "hidden", "provisional"])(
    "propagates %s ID allocation failure",
    (kind) => {
      const next = proposal();
      const additions = {
        visible: () => {
          next.visiblePatch.knownFacts.add = [
            { text: "Fact", source: "provisional" },
          ];
        },
        hidden: () => {
          next.hiddenPatch.secrets.add = [{ text: "Secret", status: "hidden" }];
        },
        provisional: () => {
          next.provisionalFacts = [
            {
              kind: "person",
              name: "Mara",
              summary: "Guide",
              visibility: "player-visible",
            },
          ];
        },
      };
      additions[kind as keyof typeof additions]();
      expect(materializeTurnState(session(), next, "turn-1", () => "")).toEqual(
        {
          error: {
            ok: false,
            errors: [
              {
                code: "id-allocation-failed",
                message:
                  "Could not allocate unique IDs for the generated state.",
              },
            ],
          },
        },
      );
    },
  );

  it.each(["visible", "hidden"])("rejects conflicting %s updates", (kind) => {
    const current = session();
    const next = proposal();
    if (kind === "visible")
      next.visiblePatch.knownFacts.update = [
        { id: "missing", text: "Fact", source: "provisional" },
      ];
    else
      next.hiddenPatch.secrets.update = [
        { id: "missing", text: "Secret", status: "hidden" },
      ];
    expect(
      materializeTurnState(current, next, "turn-1", () => "unused"),
    ).toEqual({
      error: {
        ok: false,
        errors: [
          { code: "conflicting-patch", message: "unknown-update:missing" },
        ],
      },
    });
    expect(current).toEqual(session());
  });
});
