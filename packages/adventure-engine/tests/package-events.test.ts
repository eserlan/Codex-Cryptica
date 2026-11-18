import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  AdventureJsonV1Schema,
  applyCompletedTurn,
  buildAdventurePrompt,
  createPlayerTranscript,
  MAX_PACKAGE_PROGRESS_PROMPT_CHARS,
  packageProgressIndex,
  packageProgressPromptSummary,
  parseAdventureSession,
  projectVisibleState,
  type AdventureSession,
  type PackageEventProposal,
  type PackageProgress,
} from "../src";
import { meta, proposal, session } from "./reducer-fixtures";

const pkg = AdventureJsonV1Schema.parse(
  JSON.parse(
    readFileSync(
      resolve(
        import.meta.dir,
        "../../../fixtures/adventures/reference-one-shot/adventure.v1.json",
      ),
      "utf8",
    ),
  ),
);
const index = packageProgressIndex(pkg);
const WHEEL = "ros-scene-3-wheel-room";
const WICK = "enc-wheel-room-wick";
const MOTIVE = "secret-tobiah-motive";
const MARKER = "LEDGER-MARKER-7f3a";
const pin = {
  packageId: "reference-one-shot",
  version: "1.0.0",
  formatVersion: "adventure-json/v1",
  hash: "a".repeat(64),
};

function packageSession(
  overrides: Record<string, unknown> = {},
): AdventureSession {
  return parseAdventureSession({
    ...session(),
    sourcePackage: pin,
    packageProgress: { sceneId: WHEEL },
    ...overrides,
  });
}

function event(
  recordId: string,
  to: PackageEventProposal["to"],
  extra: Partial<PackageEventProposal> = {},
): PackageEventProposal {
  return {
    recordId,
    kind: index.packageRecordKinds[recordId] ?? "encounter",
    to,
    certainty: "confirmed",
    note: "Note.",
    ...extra,
  };
}

function commit(
  s: AdventureSession,
  packageEvents?: PackageEventProposal[],
  options: { turnId?: string; inputId?: string; withIndex?: boolean } = {},
) {
  const p = proposal();
  if (packageEvents) p.packageEvents = packageEvents;
  return applyCompletedTurn(s, p, {
    ...meta,
    turnId: options.turnId ?? "turn-1",
    inputId: options.inputId ?? "input-1",
    ...(options.withIndex === false ? {} : index),
  });
}

function ok(result: ReturnType<typeof commit>): AdventureSession {
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.value;
}

const statusOf = (progress: PackageProgress | undefined, id: string) =>
  progress?.records?.find((record) => record.id === id)?.status ?? "unvisited";

function promptState(s: AdventureSession) {
  const prompt = buildAdventurePrompt({
    session: s,
    phase: "action",
    playerAction: "Look",
    anchors: [],
    relevant: [],
  });
  return { prompt, state: JSON.parse(prompt.state) };
}

const lastDropped = (s: AdventureSession) => s.turns.at(-1)?.dropped ?? [];

describe("proposed package events", () => {
  it("commits a confirmed event after the automatic ones and shows it next turn", () => {
    const next = ok(
      commit(packageSession(), [
        event(WICK, "resolved", { note: "Wick yielded." }),
      ]),
    );
    expect(statusOf(next.packageProgress, WICK)).toBe("resolved");
    const events = next.packageProgress!.events!;
    const wick = events.findIndex((e) => e.recordId === WICK);
    expect(events[wick]!.id).toMatch(/^turn-1:pkg:\d+$/);
    expect(wick).toBe(events.length - 1);
    expect(new Set(events.map((e) => e.id)).size).toBe(events.length);
    const { state } = promptState(next);
    expect(state["GM-ONLY package progress"].records).toContainEqual({
      id: WICK,
      kind: "encounter",
      status: "resolved",
    });
    const away = ok(
      commit(next, undefined, { turnId: "turn-2", inputId: "input-2" }),
    );
    expect(statusOf(away.packageProgress, WICK)).toBe("resolved");
  });

  it("records a claim without changing the status", () => {
    const next = ok(
      commit(packageSession(), [
        event(MOTIVE, "resolved", {
          certainty: "claimed",
          note: "Miller says Tobiah did it.",
        }),
      ]),
    );
    const claim = next.packageProgress!.events!.find(
      (e) => e.recordId === MOTIVE,
    )!;
    expect(claim.from).toBe("unvisited");
    expect(claim.to).toBe("resolved");
    expect(statusOf(next.packageProgress, MOTIVE)).toBe("unvisited");
    const { state } = promptState(next);
    const shown = state["GM-ONLY package progress"].recentEvents.find(
      (e: { id: string }) => e.id === claim.id,
    );
    expect(shown.certainty).toBe("claimed");
    expect(shown.to).toBe("resolved");
  });

  it("corrects an earlier event by superseding it", () => {
    const first = ok(
      commit(packageSession(), [
        event(WICK, "active"),
        event(WICK, "resolved"),
      ]),
    );
    const wrong = first.packageProgress!.events!.at(-1)!;
    expect(statusOf(first.packageProgress, WICK)).toBe("resolved");
    const before = structuredClone(first.packageProgress!.events!);
    const next = ok(
      commit(first, [event(WICK, "active", { supersedes: wrong.id })], {
        turnId: "turn-2",
        inputId: "input-2",
      }),
    );
    expect(statusOf(next.packageProgress, WICK)).toBe("active");
    expect(next.packageProgress!.events!.slice(0, before.length)).toEqual(
      before,
    );
    const { state } = promptState(next);
    const shown = state["GM-ONLY package progress"].recentEvents.find(
      (e: { id: string }) => e.id === wrong.id,
    );
    expect(shown.superseded).toBe(true);
  });

  it("lets claimed corrections supersede claims, but not confirmed events", () => {
    const first = ok(
      commit(packageSession(), [
        event(MOTIVE, "resolved", {
          certainty: "claimed",
          note: "The first witness blames Tobiah.",
        }),
      ]),
    );
    const claim = first.packageProgress!.events!.at(-1)!;
    const corrected = ok(
      commit(
        first,
        [
          event(MOTIVE, "active", {
            certainty: "claimed",
            note: "The witness retracts the rumour.",
            supersedes: claim.id,
          }),
        ],
        { turnId: "turn-2", inputId: "input-2" },
      ),
    );
    expect(statusOf(corrected.packageProgress, MOTIVE)).toBe("unvisited");
    const { state } = promptState(corrected);
    expect(
      state["GM-ONLY package progress"].recentEvents.find(
        (entry: { id: string }) => entry.id === claim.id,
      ).superseded,
    ).toBe(true);

    const confirmed = ok(
      commit(corrected, [event(WICK, "active")], {
        turnId: "turn-3",
        inputId: "input-3",
      }),
    );
    const confirmedEvent = confirmed.packageProgress!.events!.at(-1)!;
    const rejected = ok(
      commit(
        confirmed,
        [
          event(WICK, "resolved", {
            certainty: "claimed",
            supersedes: confirmedEvent.id,
          }),
        ],
        { turnId: "turn-4", inputId: "input-4" },
      ),
    );
    expect(lastDropped(rejected)).toContain(
      `packageEvents: invalid supersede ${WICK}`,
    );
    expect(statusOf(rejected.packageProgress, WICK)).toBe("active");
  });

  it("drops rejected proposals with their reasons and still commits", () => {
    const resolved = ok(commit(packageSession(), [event(WICK, "resolved")]));
    const cases: [PackageEventProposal, string][] = [
      [
        event("no-such-record", "resolved", { kind: "encounter" }),
        "packageEvents: unknown record no-such-record",
      ],
      [
        event("clue-sluice-sabotage", "resolved", { kind: "encounter" }),
        "packageEvents: wrong kind clue-sluice-sabotage",
      ],
      [event(WICK, "active"), "packageEvents: transition not allowed " + WICK],
      [
        event("__proto__", "resolved", { kind: "encounter" }),
        "packageEvents: unknown record __proto__",
      ],
      [
        event("constructor", "resolved", { kind: "encounter" }),
        "packageEvents: unknown record constructor",
      ],
      [
        event("toString", "resolved", { kind: "encounter" }),
        "packageEvents: unknown record toString",
      ],
    ];
    for (const [proposed, note] of cases) {
      const next = ok(
        commit(resolved, [proposed], { turnId: "turn-2", inputId: "input-2" }),
      );
      expect(next.turns).toHaveLength(resolved.turns.length + 1);
      expect(lastDropped(next)).toContain(note);
    }
  });

  it("reports a duplicate when a turn id is committed again", () => {
    const first = ok(commit(packageSession(), [event(WICK, "resolved")]));
    const again = ok(
      commit(first, [event(WICK, "resolved", { certainty: "claimed" })], {
        inputId: "input-2",
      }),
    );
    expect(
      lastDropped(again).some((n) =>
        n.startsWith("packageEvents: duplicate event"),
      ),
    ).toBe(true);
    const ids = again.packageProgress!.events!.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("drops proposed events when there is no package", () => {
    const emergent = ok(commit(session(), [event(WICK, "resolved")]));
    expect(lastDropped(emergent)).toContain(
      `packageEvents: no package ${WICK}`,
    );
    expect(emergent.packageProgress).toBeUndefined();
    const withoutMeta = ok(
      commit(packageSession(), [event(WICK, "resolved")], { withIndex: false }),
    );
    const plain = ok(commit(packageSession(), undefined, { withIndex: false }));
    expect(withoutMeta.packageProgress).toEqual(plain.packageProgress);
  });

  it("keeps a legacy session legacy and out of the prompt", () => {
    const next = ok(commit(packageSession(), undefined, { withIndex: false }));
    expect(next.packageProgress!.version).toBeUndefined();
    expect(promptState(next).state).not.toHaveProperty(
      "GM-ONLY package progress",
    );
  });
});

describe("package progress prompt summary", () => {
  it("stays inside the bound and does not mutate its input", () => {
    const records = Object.keys(index.packageRecordKinds).map((id, i) => ({
      id,
      kind: index.packageRecordKinds[id]!,
      status: i % 2 ? ("available" as const) : ("resolved" as const),
    }));
    const events = Array.from({ length: 400 }, (_, i) => ({
      id: `t:pkg:${i}`,
      turnId: `t${i}`,
      recordId: WICK,
      kind: "encounter" as const,
      from: "unvisited" as const,
      to: "unvisited" as const,
      certainty: "claimed" as const,
      note: "x".repeat(240),
    }));
    const progress: PackageProgress = {
      sceneId: WHEEL,
      version: 1,
      records,
      events,
    };
    const copy = structuredClone(progress);
    const summary = packageProgressPromptSummary(progress)!;
    expect(JSON.stringify(summary).length).toBeLessThanOrEqual(
      MAX_PACKAGE_PROGRESS_PROMPT_CHARS,
    );
    expect(summary.recentEvents.length).toBeLessThanOrEqual(12);
    expect(progress).toEqual(copy);
    expect(packageProgressPromptSummary({ sceneId: WHEEL })).toBeUndefined();
  });
});

describe("package ledger secrecy", () => {
  it("keeps notes out of player-visible output but in the GM block", () => {
    const first = ok(
      commit(packageSession(), [
        event(WICK, "resolved", { note: `${MARKER} wick` }),
      ]),
    );
    const next = ok(
      commit(
        first,
        [
          event(MOTIVE, "resolved", {
            certainty: "claimed",
            note: `${MARKER} motive`,
          }),
        ],
        { turnId: "turn-2", inputId: "input-2" },
      ),
    );
    const { prompt, state } = promptState(next);
    for (const visible of [
      projectVisibleState(next),
      createPlayerTranscript(next),
      prompt.transcript,
      state.playerVisibleState,
      state.playerScenarios,
      next.turns.map((t) => [t.narration, t.visiblePatch, t.suggestedActions]),
    ]) {
      expect(JSON.stringify(visible)).not.toContain(MARKER);
    }
    expect(JSON.stringify(state["GM-ONLY package progress"])).toContain(MARKER);
  });

  it("does not reject a GM note that quotes an unrevealed secret", () => {
    const secretText = "The ferryman secretly serves the drowned moon";
    const s = packageSession({
      hiddenState: {
        secrets: [{ id: "hs-1", text: secretText, status: "hidden" }],
        gmThreads: [],
      },
    });
    const result = commit(s, [event(WICK, "resolved", { note: secretText })]);
    expect(result.ok).toBe(true);
  });

  it("rejects a later player-facing echo of a stored GM-only ledger note", () => {
    const first = ok(
      commit(packageSession(), [
        event(WICK, "resolved", { note: `${MARKER} private correction` }),
      ]),
    );
    const echo = proposal();
    echo.narration = `The record says ${MARKER} private correction.`;
    const result = applyCompletedTurn(first, echo, {
      ...meta,
      turnId: "turn-2",
      inputId: "input-2",
      ...index,
    });
    expect(result).toMatchObject({
      ok: false,
      errors: [{ code: "hidden-leakage" }],
    });
  });
});
