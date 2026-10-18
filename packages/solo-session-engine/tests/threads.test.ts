import { describe, expect, it } from "bun:test";
import {
  THREAD_LIMITS,
  closeThread,
  createThread,
  editThread,
  filterThreads,
  linkEntity,
  parseThreadsFile,
  pickOpenThread,
  pruneLinks,
  reopenThread,
  serialiseThreadsFile,
  type Thread,
} from "../src/threads";

let n = 0;
const ids = { uuid: () => `id${++n}` };
const clock = { now: () => 1000 };
const make = (title: string, extra: Partial<Thread> = {}): Thread => {
  const result = createThread({ title, kind: "mystery" }, { ids, clock }, []);
  if (!result.ok) throw new Error(result.error);
  return { ...result.thread, ...extra };
};

describe("createThread", () => {
  it("refuses an empty title and an over-long title", () => {
    expect(
      createThread({ title: "  ", kind: "lead" }, { ids, clock }, []).ok,
    ).toBe(false);
    expect(
      createThread(
        { title: "x".repeat(THREAD_LIMITS.title + 1), kind: "lead" },
        { ids, clock },
        [],
      ).ok,
    ).toBe(false);
  });

  it("refuses an over-long note", () => {
    expect(
      createThread(
        { title: "T", kind: "lead", note: "x".repeat(501) },
        { ids, clock },
        [],
      ).ok,
    ).toBe(false);
  });

  it("refuses the 201st thread with a clear message", () => {
    const full = Array.from({ length: 200 }, (_, i) => make(`T${i}`));
    const result = createThread(
      { title: "One more", kind: "lead" },
      { ids, clock },
      full,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("200 threads");
  });
});

describe("closing and reopening", () => {
  it("keeps the closing note when the thread is reopened", () => {
    const closed = closeThread(make("Keeper"), "She was his daughter", clock);
    expect(closed.ok).toBe(true);
    if (!closed.ok) return;
    expect(closed.thread.status).toBe("closed");
    const reopened = reopenThread(closed.thread, clock);
    expect(reopened.status).toBe("open");
    expect(reopened.closingNote).toBe("She was his daughter");
  });

  it("refuses an over-long closing note", () => {
    expect(closeThread(make("Keeper"), "x".repeat(501), clock).ok).toBe(false);
  });
});

describe("links", () => {
  it("ignores a duplicate link and stops at 20 links", () => {
    let thread = make("Keeper");
    const first = linkEntity(thread, "e1", clock);
    if (!first.ok) throw new Error("link failed");
    thread = first.thread;
    expect(linkEntity(thread, "e1", clock)).toEqual({ ok: true, thread });
    for (let i = 2; i <= THREAD_LIMITS.links; i++) {
      const r = linkEntity(thread, `e${i}`, clock);
      if (r.ok) thread = r.thread;
    }
    expect(thread.entityIds.length).toBe(THREAD_LIMITS.links);
    expect(linkEntity(thread, "one-more", clock).ok).toBe(false);
  });

  it("prunes links to entries that no longer exist", () => {
    const thread = { ...make("Keeper"), entityIds: ["keep", "gone"] };
    const [pruned] = pruneLinks([thread], new Set(["keep"]));
    expect(pruned.entityIds).toEqual(["keep"]);
  });
});

describe("parseThreadsFile", () => {
  it("reads a file with the wrong version as no threads, and marks it invalid", () => {
    expect(parseThreadsFile({ version: 2, threads: [] })).toEqual({
      threads: [],
      valid: false,
    });
    expect(parseThreadsFile("not a file")).toEqual({
      threads: [],
      valid: false,
    });
  });

  it("skips invalid items and keeps valid ones", () => {
    const good = make("Good");
    const file = {
      version: 1,
      threads: [good, { id: "bad", title: "" }, null],
    };
    const parsed = parseThreadsFile(file);
    expect(parsed.valid).toBe(true);
    expect(parsed.threads.map((t) => t.title)).toEqual(["Good"]);
  });

  it("round-trips through the serialised file", () => {
    const threads = [make("A"), make("B")];
    const parsed = parseThreadsFile(JSON.parse(serialiseThreadsFile(threads)));
    expect(parsed.threads.map((t) => t.title)).toEqual(["A", "B"]);
  });
});

describe("filterThreads and pickOpenThread", () => {
  const open = make("Open one", { kind: "lead" });
  const closed = {
    ...make("Closed one", { kind: "mystery" }),
    status: "closed" as const,
  };

  it("filters by status, kind and search", () => {
    expect(filterThreads([open, closed], { status: "closed" })).toEqual([
      closed,
    ]);
    expect(filterThreads([open, closed], { kind: "lead" })).toEqual([open]);
    expect(filterThreads([open, closed], { search: "CLOSED" })).toEqual([
      closed,
    ]);
  });

  it("never picks a closed thread, and returns null when none are open", () => {
    expect(pickOpenThread([closed, open], () => 0.99)).toEqual(open);
    expect(pickOpenThread([closed], () => 0.5)).toBeNull();
  });

  it("edits the fields it is given", () => {
    const r = editThread(open, { title: "Renamed" }, clock);
    expect(r.ok && r.thread.title).toBe("Renamed");
  });
});
