import { describe, expect, it } from "vitest";
import { VillainDomainHistoryStore } from "./villain-domain-history";

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
  };
}

describe("VillainDomainHistoryStore", () => {
  it("starts empty", () => {
    const store = new VillainDomainHistoryStore(memoryStorage());
    expect(store.recent()).toEqual([]);
  });

  it("records domains most-recent-first", () => {
    const store = new VillainDomainHistoryStore(memoryStorage());
    store.record("Cult Ritual");
    store.record("Military Conquest");
    expect(store.recent()).toEqual(["Military Conquest", "Cult Ritual"]);
  });

  it("de-duplicates and moves a repeated domain to the front", () => {
    const store = new VillainDomainHistoryStore(memoryStorage());
    store.record("Cult Ritual");
    store.record("Military Conquest");
    store.record("Cult Ritual");
    expect(store.recent()).toEqual(["Cult Ritual", "Military Conquest"]);
  });

  it("caps history at 5 entries", () => {
    const store = new VillainDomainHistoryStore(memoryStorage());
    for (const domain of ["A", "B", "C", "D", "E", "F"]) store.record(domain);
    expect(store.recent()).toEqual(["F", "E", "D", "C", "B"]);
  });

  it("ignores blank domains", () => {
    const store = new VillainDomainHistoryStore(memoryStorage());
    store.record(undefined);
    store.record("  ");
    expect(store.recent()).toEqual([]);
  });
});
