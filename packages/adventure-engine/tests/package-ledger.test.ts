import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  AdventureJsonV1Schema,
  applyCompletedTurn,
  applyPackageProgressEvents,
  packageProgressIndex,
  parseAdventureSession,
  type AdventureSession,
  type PackageProgress,
  type PackageProgressInput,
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
const LANDING = "ros-scene-1-landing";
const YARD = "ros-scene-2-yard";
const SHRINE = "ros-branch-shrine";
const WHEEL = "ros-scene-3-wheel-room";
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
    packageProgress: { sceneId: LANDING },
    ...overrides,
  });
}

function commit(
  s: AdventureSession,
  options: {
    to?: string;
    turnId?: string;
    inputId?: string;
    withIndex?: boolean;
  } = {},
) {
  const p = proposal();
  if (options.to)
    p.visiblePatch = { ...p.visiblePatch, packageSceneId: options.to };
  const result = applyCompletedTurn(s, p, {
    ...meta,
    turnId: options.turnId ?? "turn-1",
    inputId: options.inputId ?? "input-1",
    ...(options.withIndex === false
      ? { packageSceneIds: index.packageSceneIds }
      : index),
  });
  return result;
}

function ok(result: ReturnType<typeof commit>): AdventureSession {
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.value;
}

const statusOf = (progress: PackageProgress | undefined, id: string) =>
  progress?.records?.find((record) => record.id === id)?.status ?? "unvisited";

function input(
  recordId: string,
  to: PackageProgressInput["to"],
  extra: Partial<PackageProgressInput> = {},
): PackageProgressInput {
  const kind = index.packageRecordKinds[recordId] ?? "scene";
  return {
    recordId,
    kind,
    to,
    certainty: "confirmed",
    note: "Note.",
    ...extra,
  };
}

function apply(
  progress: PackageProgress,
  inputs: PackageProgressInput[],
  turnId = "turn-x",
) {
  return applyPackageProgressEvents(progress, inputs, { turnId, index });
}

const legacy: PackageProgress = { sceneId: LANDING };

describe("package progress index", () => {
  it("covers every record kind and the scene branches", () => {
    expect(index.packageRecordKinds[WHEEL]).toBe("scene");
    expect(index.packageRecordKinds["enc-wheel-room-wick"]).toBe("encounter");
    expect(index.packageRecordKinds["clue-sluice-sabotage"]).toBe("clue");
    expect(index.packageRecordKinds["secret-filed-pin"]).toBe("secret");
    expect(index.packageSceneBranches[LANDING]).toEqual(
      expect.arrayContaining([YARD, SHRINE]),
    );
  });
});

describe("1 legacy sessions", () => {
  it("round-trips legacy and absent progress without new fields", () => {
    const legacySession = packageSession();
    expect(
      parseAdventureSession(JSON.parse(JSON.stringify(legacySession))),
    ).toEqual(legacySession);
    expect(legacySession.packageProgress).toEqual({ sceneId: LANDING });
    expect(session().packageProgress).toBeUndefined();
  });

  it("rejects a partial ledger and a bad certainty", () => {
    expect(() =>
      packageSession({ packageProgress: { sceneId: LANDING, version: 1 } }),
    ).toThrow();
    const event = {
      id: "t:pkg:1",
      turnId: "t",
      recordId: YARD,
      kind: "scene",
      from: "unvisited",
      to: "active",
      certainty: "maybe",
      note: "x",
    };
    expect(() =>
      packageSession({
        packageProgress: {
          sceneId: LANDING,
          version: 1,
          records: [],
          events: [event],
        },
      }),
    ).toThrow();
  });
});

describe("2 opening turn", () => {
  it("activates the entry scene and opens its branches", () => {
    const next = ok(commit(packageSession()));
    const progress = next.packageProgress!;
    expect(progress.version).toBe(1);
    expect(statusOf(progress, LANDING)).toBe("active");
    expect(statusOf(progress, YARD)).toBe("available");
    expect(statusOf(progress, SHRINE)).toBe("available");
    expect(progress.events!.map((e) => e.id)).toEqual(
      progress.events!.map((_, i) => `turn-1:pkg:${i + 1}`),
    );
    expect(progress.events!.every((e) => e.certainty === "confirmed")).toBe(
      true,
    );
    expect(next.turns[0].dropped).toBeUndefined();
  });
});

describe("3 alternate path", () => {
  it("moves to the optional shrine and keeps the yard available", () => {
    const first = ok(commit(packageSession()));
    const next = ok(
      commit(first, { to: SHRINE, turnId: "turn-2", inputId: "input-2" }),
    );
    const progress = next.packageProgress!;
    expect(progress.sceneId).toBe(SHRINE);
    expect(statusOf(progress, LANDING)).toBe("available");
    expect(statusOf(progress, SHRINE)).toBe("active");
    expect(statusOf(progress, YARD)).toBe("available");
    expect(next.turns[1].dropped).toBeUndefined();
  });
});

describe("4 skip and revisit", () => {
  it("lets a skipped scene become active when entered", () => {
    const first = ok(commit(packageSession()));
    const skipped = apply(
      first.packageProgress!,
      [input(YARD, "skipped")],
      "turn-s",
    );
    expect(skipped.dropped).toEqual([]);
    expect(statusOf(skipped.progress, YARD)).toBe("skipped");
    const next = ok(
      commit(
        { ...first, packageProgress: skipped.progress },
        { to: YARD, turnId: "turn-2", inputId: "input-2" },
      ),
    );
    expect(statusOf(next.packageProgress, YARD)).toBe("active");
  });
});

describe("5 rejected inputs", () => {
  const base = apply(legacy, [
    input(YARD, "active"),
    input(YARD, "resolved"),
  ]).progress;

  function rejected(inputs: PackageProgressInput[], progress = base) {
    const before = structuredClone(progress);
    const result = apply(progress, inputs);
    expect(progress).toEqual(before);
    expect(result.progress.records).toEqual(before.records);
    expect(result.progress.events).toEqual(before.events);
    expect(result.dropped).toHaveLength(inputs.length);
    expect(result.dropped[0]).toMatch(/^packageEvents: /);
  }

  it("rejects resolved to active", () => rejected([input(YARD, "active")]));
  it("rejects a move to unvisited", () => rejected([input(YARD, "unvisited")]));
  it("rejects an unknown record", () =>
    rejected([{ ...input(YARD, "active"), recordId: "nope" }]));
  it("rejects a wrong kind", () =>
    rejected([
      { ...input("clue-sluice-sabotage", "resolved"), kind: "encounter" },
    ]));
  it("rejects an input once the ledger is full", () => {
    const events = Array.from({ length: 400 }, (_, i) => ({
      id: `old:pkg:${i}`,
      turnId: "old",
      recordId: SHRINE,
      kind: "scene" as const,
      from: "unvisited" as const,
      to: "unvisited" as const,
      certainty: "claimed" as const,
      note: "x",
    }));
    rejected([input(WHEEL, "active")], {
      sceneId: LANDING,
      version: 1,
      records: [],
      events,
    });
  });
});

describe("6 resolved on a revisit", () => {
  it("keeps a resolved encounter and a resolved scene resolved", () => {
    const at = packageSession({ packageProgress: { sceneId: WHEEL } });
    const first = ok(commit(at));
    const resolved = apply(
      first.packageProgress!,
      [input("enc-wheel-room-wick", "resolved"), input(WHEEL, "resolved")],
      "turn-r",
    );
    let s: AdventureSession = { ...first, packageProgress: resolved.progress };
    s = ok(
      commit(s, { to: "ros-scene-4-cellar", turnId: "t2", inputId: "i2" }),
    );
    const forWheel = () =>
      s.packageProgress!.events!.filter((e) => e.recordId === WHEEL).length;
    const before = forWheel();
    s = ok(commit(s, { to: WHEEL, turnId: "t3", inputId: "i3" }));
    expect(s.packageProgress!.sceneId).toBe(WHEEL);
    expect(statusOf(s.packageProgress, "enc-wheel-room-wick")).toBe("resolved");
    expect(statusOf(s.packageProgress, WHEEL)).toBe("resolved");
    expect(forWheel()).toBe(before);
  });
});

describe("7 claims", () => {
  it("records a claim without changing the status", () => {
    const result = apply(legacy, [
      input("secret-tobiah-motive", "resolved", { certainty: "claimed" }),
    ]);
    const event = result.progress.events![0];
    expect(event.from).toBe("unvisited");
    expect(event.to).toBe("unvisited");
    expect(result.progress.records).toEqual([]);
  });
});

describe("8 corrections", () => {
  const start = apply(legacy, [input(YARD, "active")], "a").progress;
  const wrong = apply(start, [input(YARD, "resolved")], "b").progress;
  const wrongId = wrong.events![1].id;

  it("supersedes a wrong event and restores the baseline", () => {
    const fixed = apply(
      wrong,
      [input(YARD, "active", { supersedes: wrongId })],
      "c",
    );
    expect(fixed.dropped).toEqual([]);
    expect(statusOf(fixed.progress, YARD)).toBe("active");
    expect(fixed.progress.events!.slice(0, 2)).toEqual(wrong.events);
    expect(fixed.progress.events).toHaveLength(3);
  });

  it("drops unknown, foreign and already superseded targets", () => {
    const other = apply(wrong, [input(SHRINE, "active")], "d").progress;
    const fixed = apply(
      wrong,
      [input(YARD, "active", { supersedes: wrongId })],
      "c",
    ).progress;
    const again = (p: PackageProgress, supersedes: string, recordId = YARD) =>
      apply(p, [input(recordId, "altered", { supersedes })], "e");
    expect(again(wrong, "missing").dropped).toHaveLength(1);
    expect(again(other, other.events![2].id).dropped).toHaveLength(1);
    expect(again(fixed, wrongId).dropped).toHaveLength(1);
    expect(again(fixed, wrongId).progress.events).toEqual(fixed.events);
  });
});

describe("9 replay and reload", () => {
  it("rejects the same inputId and never duplicates event IDs", () => {
    const first = ok(commit(packageSession()));
    const same = commit(first);
    expect(same.ok ? "" : same.errors[0].code).toBe("duplicate-input");
    const replay = ok(commit(first, { inputId: "input-2" }));
    const ids = replay.packageProgress!.events!.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("keeps earlier events byte-equal across a reload", () => {
    const first = ok(commit(packageSession()));
    const reloaded = parseAdventureSession(JSON.parse(JSON.stringify(first)));
    const next = ok(
      commit(reloaded, { to: SHRINE, turnId: "turn-2", inputId: "input-2" }),
    );
    const earlier = first.packageProgress!.events!;
    expect(
      JSON.stringify(next.packageProgress!.events!.slice(0, earlier.length)),
    ).toBe(JSON.stringify(earlier));
  });
});

describe("10 isolation", () => {
  it("never shares ledger state between sessions or vaults", () => {
    const a = packageSession({ id: "session-a" });
    const b = packageSession({ id: "session-b" });
    const c = packageSession({ id: "session-c", vaultId: "vault-2" });
    const [bBefore, cBefore] = [structuredClone(b), structuredClone(c)];
    const aNext = ok(commit(a));
    expect(b).toEqual(bBefore);
    expect(c).toEqual(cBefore);
    expect(b.packageProgress).toEqual({ sceneId: LANDING });
    const bNext = ok(commit(b, { to: SHRINE }));
    expect(aNext.packageProgress!.sceneId).toBe(LANDING);
    expect(bNext.packageProgress!.sceneId).toBe(SHRINE);
    expect(statusOf(aNext.packageProgress, SHRINE)).toBe("available");
    expect(statusOf(bNext.packageProgress, SHRINE)).toBe("active");
    aNext.packageProgress!.events!.length = 0;
    aNext.packageProgress!.records![0].status = "skipped";
    expect(bNext.packageProgress!.events!.length).toBeGreaterThan(0);
    expect(statusOf(bNext.packageProgress, LANDING)).toBe("available");
    expect(a.packageProgress).toEqual({ sceneId: LANDING });
    expect(c).toEqual(cBefore);
  });
});

describe("11 legacy meta", () => {
  it("keeps { sceneId } when meta has no record kinds", () => {
    const next = ok(commit(packageSession(), { to: YARD, withIndex: false }));
    expect(next.packageProgress).toEqual({ sceneId: YARD });
  });
});

describe("claims and corrections keep records equal to the events", () => {
  const derived = (progress: PackageProgress, id: string) => {
    const superseded = new Set(
      progress.events!.flatMap((e) => e.supersedes ?? []),
    );
    const newest = progress
      .events!.filter(
        (e) =>
          e.recordId === id &&
          e.certainty === "confirmed" &&
          !superseded.has(e.id),
      )
      .at(-1);
    return newest?.to ?? "unvisited";
  };

  it("drops a claim that carries supersedes", () => {
    const start = apply(legacy, [input(YARD, "active")], "a").progress;
    const result = apply(
      start,
      [
        input(YARD, "resolved", {
          certainty: "claimed",
          supersedes: start.events![0].id,
        }),
      ],
      "b",
    );
    expect(result.dropped).toEqual([
      `packageEvents: invalid supersede ${YARD}`,
    ]);
    expect(result.progress.events).toEqual(start.events);
    expect(result.progress.records).toEqual(start.records);
  });

  it("derives the status from events after a correction with an unvisited baseline", () => {
    const wrong = apply(legacy, [input(YARD, "resolved")], "a").progress;
    const fixed = apply(
      wrong,
      [input(YARD, "skipped", { supersedes: wrong.events![0].id })],
      "b",
    );
    expect(fixed.dropped).toEqual([]);
    expect(statusOf(fixed.progress, YARD)).toBe(derived(fixed.progress, YARD));
    const reloaded = parseAdventureSession(
      JSON.parse(
        JSON.stringify(packageSession({ packageProgress: fixed.progress })),
      ),
    );
    expect(reloaded.packageProgress).toEqual(fixed.progress);
  });

  it("accepts a stored unvisited record on parse", () => {
    const stored = packageSession({
      packageProgress: {
        sceneId: LANDING,
        version: 1,
        records: [{ id: YARD, kind: "scene", status: "unvisited" }],
        events: [],
      },
    });
    expect(stored.packageProgress!.records).toHaveLength(1);
  });
});

describe("prototype-style ids", () => {
  const hostile = ["constructor", "toString", "hasOwnProperty", "__proto__"];

  it.each(hostile)(
    "commits a saved session at scene %s without throwing",
    (id) => {
      const s = packageSession({ packageProgress: { sceneId: id } });
      const next = ok(commit(s));
      expect(next.packageProgress!.sceneId).toBe(id);
      expect(next.packageProgress!.events ?? []).toEqual([]);
      expect(next.turns[0].dropped).toBeUndefined();
    },
  );

  it.each(hostile)("rejects %s as an unknown record", (id) => {
    const result = apply(legacy, [{ ...input(YARD, "active"), recordId: id }]);
    expect(result.dropped).toHaveLength(1);
    expect(result.progress.events).toEqual([]);
  });

  it("rejects a non-string kind", () => {
    const result = apply(legacy, [
      { ...input(YARD, "active"), kind: {} as never },
    ]);
    expect(result.dropped).toHaveLength(1);
  });

  it("round-trips a package record id of __proto__ through save and reload", () => {
    const hostilePkg = structuredClone(pkg);
    hostilePkg.clues[0] = { ...hostilePkg.clues[0], id: "__proto__" };
    const hostileIndex = packageProgressIndex(hostilePkg);
    expect(Object.hasOwn(hostileIndex.packageRecordKinds, "__proto__")).toBe(
      true,
    );
    expect(Object.hasOwn(hostileIndex.packageRecordKinds, "constructor")).toBe(
      false,
    );
    const result = applyPackageProgressEvents(
      legacy,
      [{ ...input(YARD, "resolved"), recordId: "__proto__", kind: "clue" }],
      { turnId: "t", index: hostileIndex },
    );
    expect(result.dropped).toEqual([]);
    expect(result.progress.records![0]).toEqual({
      id: "__proto__",
      kind: "clue",
      status: "resolved",
    });
    const reloaded = parseAdventureSession(
      JSON.parse(
        JSON.stringify(packageSession({ packageProgress: result.progress })),
      ),
    );
    expect(reloaded.packageProgress).toEqual(result.progress);
  });

  it("commits through meta that carries a __proto__ record", () => {
    const hostilePkg = structuredClone(pkg);
    hostilePkg.clues[0] = { ...hostilePkg.clues[0], id: "__proto__" };
    const next = ok(
      applyCompletedTurn(packageSession(), proposal(), {
        ...meta,
        ...packageProgressIndex(hostilePkg),
      }),
    );
    expect(next.packageProgress!.version).toBe(1);
  });
});
