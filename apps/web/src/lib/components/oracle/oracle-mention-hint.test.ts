import { describe, expect, it } from "vitest";
import { takeMentionHint } from "./oracle-mention-hint";
import { HINT_KEYS } from "#lib/config/help-content.js";

const memory = (initial: Record<string, string> = {}) => {
  const store: Record<string, string> = { ...initial };
  return {
    store,
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
  };
};

describe("takeMentionHint", () => {
  it("returns the hint on the first @ and remembers it was shown", () => {
    const storage = memory();
    expect(takeMentionHint(storage)).toMatch(/Type @/);
    expect(storage.store[HINT_KEYS.ORACLE_MENTIONS]).toBe("true");
  });

  it("returns nothing once the hint has been seen", () => {
    const storage = memory({ [HINT_KEYS.ORACLE_MENTIONS]: "true" });
    expect(takeMentionHint(storage)).toBeNull();
  });

  it("returns nothing and does not throw when storage is blocked", () => {
    const blocked = {
      getItem: () => {
        throw new Error("SecurityError");
      },
      setItem: () => {},
      removeItem: () => {},
    };
    expect(takeMentionHint(blocked)).toBeNull();
  });
});
