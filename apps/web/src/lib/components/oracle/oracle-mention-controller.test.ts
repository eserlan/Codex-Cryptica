import { describe, it, expect, vi, afterEach } from "vitest";
import { OracleMentionController } from "./oracle-mention-controller.svelte";
import type { EntityLike, MentionSource } from "entity-mention-engine";

const elara: EntityLike = {
  id: "e-elara",
  title: "Elara Voss",
  type: "character",
  summary: "The Grand Archmage.",
};
const spy: EntityLike = {
  id: "e-spy",
  title: "Shadow Spy",
  type: "character",
  labels: ["hidden"],
};

const source: MentionSource = {
  getEntity: (id) => [elara, spy].find((e) => e.id === id),
  isVisible: (e) => !(e.labels ?? []).includes("hidden"),
  listCandidates: () => [elara, spy],
};

const make = () => new OracleMentionController(() => source);

describe("OracleMentionController", () => {
  it("opens the picker with a matching entity when @ is typed", () => {
    const c = make();
    c.handleInput("", "@ela", 4);
    expect(c.open).toBe(true);
    expect(c.suggestions.map((s) => s.entityId)).toEqual(["e-elara"]);
    expect(c.activeIndex).toBe(0);
  });

  it("keeps the picker open with an empty list when nothing matches", () => {
    const c = make();
    c.handleInput("", "@zzz", 4);
    expect(c.open).toBe(true);
    expect(c.suggestions).toEqual([]);
  });

  describe("full-text search", () => {
    afterEach(() => vi.useRealTimers());

    const academy: EntityLike = {
      id: "e-academy",
      title: "Royal Academy",
      type: "location",
    };
    const withAcademy: MentionSource = {
      getEntity: (id) => [elara, academy].find((e) => e.id === id),
      isVisible: (e) => !(e.labels ?? []).includes("hidden"),
      listCandidates: () => [elara, academy],
    };

    it("merges search hits after a 120 ms pause and shows loading meanwhile", async () => {
      vi.useFakeTimers();
      const search = vi.fn(async () => ["e-academy"]);
      const c = new OracleMentionController(() => withAcademy, search);
      c.handleInput("", "@school", 7);
      expect(c.loading).toBe(true);
      expect(search).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(120);
      expect(search).toHaveBeenCalledWith("school");
      expect(c.loading).toBe(false);
      expect(c.suggestions.map((s) => s.entityId)).toEqual(["e-academy"]);
    });

    it("searches only the last query when the user keeps typing", async () => {
      vi.useFakeTimers();
      const search = vi.fn(async () => []);
      const c = new OracleMentionController(() => withAcademy, search);
      c.handleInput("", "@s", 2);
      c.handleInput("@s", "@sc", 3);
      c.handleInput("@sc", "@sch", 4);
      await vi.advanceTimersByTimeAsync(120);
      expect(search).toHaveBeenCalledTimes(1);
      expect(search).toHaveBeenCalledWith("sch");
    });

    it("drops a late search result after the picker is closed", async () => {
      vi.useFakeTimers();
      let finish!: (ids: string[]) => void;
      const search = vi.fn(
        () => new Promise<string[]>((resolve) => (finish = resolve)),
      );
      const c = new OracleMentionController(() => withAcademy, search);
      c.handleInput("", "@school", 7);
      await vi.advanceTimersByTimeAsync(120);
      c.handleKey("Escape", "@school", 7);
      finish(["e-academy"]);
      await vi.runAllTimersAsync();
      expect(c.open).toBe(false);
      expect(c.suggestions).toEqual([]);
    });

    it("treats a failing search as no extra hits", async () => {
      vi.useFakeTimers();
      const search = vi.fn(async () => {
        throw new Error("offline");
      });
      const c = new OracleMentionController(() => withAcademy, search);
      c.handleInput("", "@zzz", 4);
      await vi.advanceTimersByTimeAsync(120);
      expect(c.loading).toBe(false);
      expect(c.suggestions).toEqual([]);
    });
  });

  it("does not open for an ordinary word", () => {
    const c = make();
    c.handleInput("", "hello", 5);
    expect(c.open).toBe(false);
  });

  it("does not suggest a hidden entity", () => {
    const c = make();
    c.handleInput("", "@shadow", 7);
    expect(c.suggestions).toEqual([]);
  });

  it("moves the highlight with ArrowDown and ArrowUp, staying in range", () => {
    const c = new OracleMentionController(() => ({
      ...source,
      listCandidates: () => [elara, { id: "e-2", title: "Elara Two" }],
    }));
    c.handleInput("", "@ela", 4);
    expect(c.handleKey("ArrowDown", "@ela", 4).handled).toBe(true);
    expect(c.activeIndex).toBe(1);
    c.handleKey("ArrowDown", "@ela", 4);
    expect(c.activeIndex).toBe(1);
    c.handleKey("ArrowUp", "@ela", 4);
    expect(c.activeIndex).toBe(0);
  });

  it("selects the highlighted suggestion on Enter and reports the new text", () => {
    const c = make();
    c.handleInput("", "who is @ela", 11);
    const result = c.handleKey("Enter", "who is @ela", 11);
    expect(result.handled).toBe(true);
    expect(result.text).toBe("who is @Elara Voss ");
    expect(result.caret).toBe(19);
    expect(c.open).toBe(false);
    expect(c.mentions.map((m) => m.entityId)).toEqual(["e-elara"]);
  });

  it("selects with Tab as well", () => {
    const c = make();
    c.handleInput("", "@ela", 4);
    expect(c.handleKey("Tab", "@ela", 4).handled).toBe(true);
    expect(c.mentions).toHaveLength(1);
  });

  it("dismisses on Escape and keeps the typed text", () => {
    const c = make();
    c.handleInput("", "@ela", 4);
    expect(c.handleKey("Escape", "@ela", 4).handled).toBe(true);
    expect(c.open).toBe(false);
    expect(c.mentions).toEqual([]);
  });

  it("does not handle Enter when the picker is closed, so the message can send", () => {
    const c = make();
    c.handleInput("", "hello", 5);
    expect(c.handleKey("Enter", "hello", 5).handled).toBe(false);
  });

  it("drops a selected mention once its text is edited", () => {
    const c = make();
    c.handleInput("", "who is @ela", 11);
    const { text } = c.handleKey("Enter", "who is @ela", 11);
    const edited = text.replace("Elara", "Elora");
    c.handleInput(text, edited, edited.length);
    expect(c.mentions).toEqual([]);
  });

  it("returns and clears the draft mentions when a message is sent", () => {
    const c = make();
    c.handleInput("", "@ela", 4);
    c.handleKey("Enter", "@ela", 4);
    const taken = c.takeMentions();
    expect(taken).toHaveLength(1);
    expect(c.mentions).toEqual([]);
  });

  it("keeps each mention's range right after text is inserted before and between mentions", () => {
    const academy: EntityLike = {
      id: "e-academy",
      title: "Royal Academy",
      type: "location",
    };
    const twoEntities: MentionSource = {
      getEntity: (id) => [elara, academy].find((e) => e.id === id),
      isVisible: () => true,
      listCandidates: () => [elara, academy],
    };
    const c = new OracleMentionController(() => twoEntities);
    c.handleInput("", "@ela", 4);
    const first = c.handleKey("Enter", "@ela", 4);
    const typed = `${first.text}@roy`;
    c.handleInput(first.text, typed, typed.length);
    const second = c.handleKey("Enter", typed, typed.length);
    expect(second.text).toBe("@Elara Voss @Royal Academy ");

    const inserted = `Hi ${second.text}`;
    c.handleInput(second.text, inserted, 3);

    expect(c.mentions.map((m) => inserted.slice(m.start, m.end))).toEqual([
      "@Elara Voss",
      "@Royal Academy",
    ]);
  });

  it("clears draft mentions and the picker when the active Vault changes", () => {
    const c = make();
    c.syncVault("vault-a");
    c.handleInput("", "@ela", 4);
    c.handleKey("Enter", "@ela", 4);
    expect(c.mentions).toHaveLength(1);
    c.handleInput("", "@ela", 4);
    c.syncVault("vault-b");
    expect(c.mentions).toEqual([]);
    expect(c.open).toBe(false);
  });

  it("keeps draft mentions when the same Vault is re-synced", () => {
    const c = make();
    c.syncVault("vault-a");
    c.handleInput("", "@ela", 4);
    c.handleKey("Enter", "@ela", 4);
    c.syncVault("vault-a");
    expect(c.mentions).toHaveLength(1);
  });

  it("applies a chosen candidate to an ambiguous span", () => {
    const c = make();
    const applied = c.choose(
      "ask @Elara Voss",
      { start: 4, end: 15, query: "Elara Voss" },
      elara,
    );
    expect(applied.text).toBe("ask @Elara Voss ");
    expect(c.mentions.map((m) => m.entityId)).toEqual(["e-elara"]);
  });
});
