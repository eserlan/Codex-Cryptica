import { describe, expect, it } from "vitest";
import { ArtworkPreferences } from "./artwork-preferences";
describe("artwork visibility preference", () => {
  it("defaults on and persists a disabled setting", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        values.set(key, value);
      },
    };
    const prefs = new ArtworkPreferences(storage);
    expect(prefs.enabled).toBe(true);
    expect(prefs.setEnabled(false)).toBe(true);
    expect(new ArtworkPreferences(storage).enabled).toBe(false);
  });
  it("keeps the current session setting if storage fails", () => {
    const prefs = new ArtworkPreferences({
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    });
    expect(prefs.enabled).toBe(true);
    expect(prefs.setEnabled(false)).toBe(false);
    expect(prefs.enabled).toBe(false);
  });
});

it("notifies subscribers even when persistence is unavailable", () => {
  const prefs = new ArtworkPreferences(null);
  const changes: boolean[] = [];
  const unsubscribe = prefs.subscribe((enabled) => changes.push(enabled));
  prefs.setEnabled(false);
  unsubscribe();
  prefs.setEnabled(true);
  expect(changes).toEqual([false]);
});
