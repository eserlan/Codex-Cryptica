import { vi } from "vitest";

// Mocks must be declared before any imports that trigger SvelteKit or vault side effects
vi.mock("$app/paths", () => ({ base: "" }));
vi.mock("./vault.svelte", () => ({
  vault: {
    activeVaultId: "test-vault-123",
  },
}));

import { describe, it, expect, beforeEach } from "vitest";
import { calendarStore } from "./calendar.svelte";
import { DEFAULT_CALENDAR } from "chronology-engine";

vi.mock("../utils/idb", () => {
  const store = new Map();
  return {
    getDB: vi.fn().mockResolvedValue({
      get: vi
        .fn()
        .mockImplementation(async (table, key) => store.get(`${table}_${key}`)),
      put: vi.fn().mockImplementation(async (table, val, key) => {
        store.set(`${table}_${key}`, val);
        return key;
      }),
    }),
  };
});

describe("CalendarStore", () => {
  beforeEach(() => {
    calendarStore.config = { ...DEFAULT_CALENDAR, revision: 1 };
  });

  it("should return a calendar snapshot with correct revision", () => {
    const snapshot = calendarStore.getSnapshot();
    expect(snapshot.revision).toBe(1);
    expect(snapshot.config.useGregorian).toBe(true);
  });

  it("should auto-increment revision when setting a new config", async () => {
    const newConfig = {
      ...DEFAULT_CALENDAR,
      useGregorian: false,
      months: [{ id: "m1", name: "Janus", days: 30 }],
    };

    await calendarStore.setConfig(newConfig);
    expect(calendarStore.config.revision).toBe(2);
    expect(calendarStore.getSnapshot().revision).toBe(2);
  });

  it("should reuse the existing revision if structural rules did not change", async () => {
    const sameConfig = {
      ...DEFAULT_CALENDAR,
      revision: 1,
    };
    await calendarStore.setConfig(sameConfig);
    expect(calendarStore.config.revision).toBe(1);
  });
});
