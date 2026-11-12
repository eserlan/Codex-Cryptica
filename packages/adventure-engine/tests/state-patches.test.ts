import { describe, expect, it } from "vitest";
import {
  applyHiddenPatch,
  applyVisiblePatch,
  materializeHiddenPatch,
  materializeVisiblePatch,
} from "../src/state-patches";
import {
  proposal,
  session,
  emptyVisiblePatch,
  emptyHiddenPatch,
} from "./reducer-fixtures";
import type { StateFact } from "../src/types";

const fact = (id: string): StateFact => ({
  id,
  text: id,
  source: "provisional",
});

describe("state patch materialisation", () => {
  it("allocates singleton and collection IDs in order while retaining updates", () => {
    const patch = proposal().visiblePatch;
    patch.location = { text: "Road", source: "provisional" };
    patch.situation = { text: "Quiet", source: "provisional" };
    patch.objectives.add = [{ text: "Travel", source: "provisional" }];
    patch.knownFacts.update = [fact("existing")];
    let id = 0;
    const result = materializeVisiblePatch(patch, new Set(), () => `${++id}`);
    expect(result).toEqual({
      ok: true,
      value: {
        ...patch,
        location: { ...patch.location, id: "1" },
        situation: { ...patch.situation, id: "2" },
        objectives: {
          ...patch.objectives,
          add: [{ ...patch.objectives.add[0], id: "3" }],
        },
      },
    });
    const hidden = proposal().hiddenPatch;
    hidden.secrets.add = [{ text: "Private", status: "hidden" }];
    hidden.gmThreads.add = [{ text: "Thread", status: "hidden" }];
    const resultHidden = materializeHiddenPatch(
      hidden,
      new Set(),
      () => `${++id}`,
    );
    expect(resultHidden.ok && resultHidden.value.secrets.add[0]?.id).toBe("4");
    expect(resultHidden.ok && resultHidden.value.gmThreads.add[0]?.id).toBe(
      "5",
    );
  });

  it("preserves omitted and cleared singletons and rejects exhausted allocation", () => {
    const patch = proposal().visiblePatch;
    patch.location = null;
    expect(materializeVisiblePatch(patch, new Set(), () => "unused")).toEqual({
      ok: true,
      value: { ...patch, situation: undefined },
    });
    patch.situation = { text: "Quiet", source: "provisional" };
    expect(materializeVisiblePatch(patch, new Set(), () => "")).toEqual({
      ok: false,
      errors: "id-allocation-failed",
    });
    delete patch.situation;
    patch.relationships.add = [
      {
        text: "Ally",
        source: "provisional",
        subjectId: "mara",
        disposition: "friendly",
      },
    ];
    expect(materializeVisiblePatch(patch, new Set(), () => "").ok).toBe(false);
    const hidden = proposal().hiddenPatch;
    hidden.gmThreads.add = [{ text: "Private", status: "hidden" }];
    expect(materializeHiddenPatch(hidden, new Set(), () => "").ok).toBe(false);
  });
});

describe("state patch application", () => {
  it("updates, removes, and appends facts without changing the input", () => {
    const current = session().visibleState;
    current.location = fact("old-location");
    current.situation = fact("situation");
    current.knownFacts = [fact("keep"), fact("remove")];
    const patch = {
      ...emptyVisiblePatch(),
      location: null,
      knownFacts: {
        add: [fact("new")],
        update: [{ ...fact("keep"), text: "Updated" }],
        removeIds: ["remove", "absent"],
      },
    };
    const result = applyVisiblePatch(current, patch);
    expect(result.ok && result.value.location).toBeUndefined();
    expect(result.ok && result.value.situation).toEqual(current.situation);
    expect(result.ok && result.value.knownFacts).toEqual([
      { ...fact("keep"), text: "Updated" },
      fact("new"),
    ]);
    expect(current.knownFacts).toEqual([fact("keep"), fact("remove")]);
    expect(current.location).toEqual(fact("old-location"));
    const hidden = session().hiddenState;
    const secret = { id: "secret", text: "Private", status: "hidden" as const };
    expect(
      applyHiddenPatch(hidden, {
        ...emptyHiddenPatch(),
        secrets: { add: [secret], update: [], removeIds: [] },
      }),
    ).toEqual({ ok: true, value: { secrets: [secret], gmThreads: [] } });
    expect(hidden.secrets).toEqual([]);
  });

  it.each([
    [{ add: [fact("a")], update: [], removeIds: [] }, "duplicate:a"],
    [{ add: [fact("b"), fact("b")], update: [], removeIds: [] }, "duplicate:b"],
    [
      { add: [], update: [fact("missing")], removeIds: [] },
      "unknown-update:missing",
    ],
    [{ add: [], update: [fact("a")], removeIds: ["a"] }, "unknown-update:a"],
    [{ add: [], update: [], removeIds: ["a", "a"] }, "duplicate-removal"],
  ])(
    "rejects conflicting collection operations atomically (%s)",
    (collection, message) => {
      const current = session().visibleState;
      current.knownFacts = [fact("a")];
      expect(
        applyVisiblePatch(current, {
          ...emptyVisiblePatch(),
          knownFacts: collection,
        }),
      ).toEqual({ ok: false, errors: message });
      expect(current.knownFacts).toEqual([fact("a")]);
    },
  );

  it("rejects updates to unknown hidden secrets", () => {
    expect(
      applyHiddenPatch(session().hiddenState, {
        ...emptyHiddenPatch(),
        secrets: {
          add: [],
          update: [{ id: "missing", text: "Private", status: "hidden" }],
          removeIds: [],
        },
      }),
    ).toEqual({ ok: false, errors: "unknown-update:missing" });
  });
});
