import { describe, expect, it } from "vitest";
import {
  askJson,
  askModel,
  isAbort,
  pool,
  readJsonObject,
  throwIfAborted,
} from "./staged-runtime";

const abortError = () =>
  new DOMException("The operation was aborted", "AbortError");

describe("throwIfAborted", () => {
  it("does nothing without an aborted signal", () => {
    expect(() => throwIfAborted()).not.toThrow();
    expect(() => throwIfAborted(new AbortController().signal)).not.toThrow();
  });

  it("throws the signal's reason once aborted", () => {
    const controller = new AbortController();
    const reason = new Error("stop");
    controller.abort(reason);
    expect(() => throwIfAborted(controller.signal)).toThrow(reason);
  });
});

describe("isAbort", () => {
  it("recognises an AbortError or an aborted signal", () => {
    expect(isAbort(abortError())).toBe(true);
    const controller = new AbortController();
    controller.abort();
    expect(isAbort(new Error("network"), controller.signal)).toBe(true);
  });

  it("treats other failures as ordinary errors", () => {
    expect(isAbort(new Error("network"))).toBe(false);
    expect(isAbort(new DOMException("bad", "SyntaxError"))).toBe(false);
  });
});

describe("readJsonObject", () => {
  it("reads a fenced JSON object", () => {
    expect(readJsonObject('```json\n{"a": 1,}\n```')).toEqual({ a: 1 });
  });

  it("rejects arrays, primitives and malformed text", () => {
    expect(readJsonObject("[1, 2]")).toBeNull();
    expect(readJsonObject("42")).toBeNull();
    expect(readJsonObject("not json")).toBeNull();
  });
});

describe("askModel", () => {
  it("returns the first reply the reader accepts", async () => {
    const replies = ["nope", "yes"];
    let calls = 0;
    const result = await askModel(
      async () => replies[calls++],
      (r) => (r === "yes" ? r.toUpperCase() : null),
      { attempts: 2 },
    );
    expect(result).toBe("YES");
    expect(calls).toBe(2);
  });

  it("makes a single call by default and resolves null when it fails", async () => {
    let calls = 0;
    const result = await askJson(async () => {
      calls++;
      throw new Error("network");
    });
    expect(result).toBeNull();
    expect(calls).toBe(1);
  });

  it("gives up after the last attempt", async () => {
    let calls = 0;
    const result = await askJson(
      async () => {
        calls++;
        return "still not json";
      },
      { attempts: 3 },
    );
    expect(result).toBeNull();
    expect(calls).toBe(3);
  });

  it("propagates an AbortError from the call instead of retrying", async () => {
    let calls = 0;
    await expect(
      askJson(
        async () => {
          calls++;
          throw abortError();
        },
        { attempts: 2 },
      ),
    ).rejects.toThrow(/aborted/);
    expect(calls).toBe(1);
  });

  it("discards a reply that arrives after cancellation", async () => {
    const controller = new AbortController();
    await expect(
      askJson(
        async () => {
          controller.abort();
          return '{"ok": true}';
        },
        { signal: controller.signal, attempts: 2 },
      ),
    ).rejects.toThrow();
  });

  it("does not call the model when already cancelled", async () => {
    const controller = new AbortController();
    controller.abort();
    let calls = 0;
    await expect(
      askJson(
        async () => {
          calls++;
          return "{}";
        },
        { signal: controller.signal },
      ),
    ).rejects.toThrow();
    expect(calls).toBe(0);
  });
});

describe("pool", () => {
  it("keeps task order and never exceeds the limit", async () => {
    let active = 0;
    let peak = 0;
    const tasks = [30, 5, 20, 1, 10].map((ms, i) => async () => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, ms));
      active--;
      return i;
    });
    expect(await pool(tasks, 2)).toEqual([0, 1, 2, 3, 4]);
    expect(peak).toBe(2);
  });

  it("handles an empty task list", async () => {
    expect(await pool([], 3)).toEqual([]);
  });

  it("stops starting tasks once cancelled", async () => {
    const controller = new AbortController();
    let started = 0;
    const tasks = Array.from({ length: 4 }, () => async () => {
      started++;
      controller.abort();
      return started;
    });
    await expect(pool(tasks, 1, controller.signal)).rejects.toThrow();
    expect(started).toBe(1);
  });
});
