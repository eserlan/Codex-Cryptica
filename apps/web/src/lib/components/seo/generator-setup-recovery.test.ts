import { describe, expect, it } from "vitest";
import {
  consumeGeneratorSetupState,
  saveGeneratorSetupState,
} from "./generator-setup-recovery.js";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
}

describe("generator setup recovery", () => {
  it("stores and consumes route-scoped form values once", () => {
    const storage = memoryStorage();
    const state = {
      forms: { npc: { name: "Mira", occupation: "Guide" } },
      activeTheme: "Science Fiction",
      useAI: false,
    };
    expect(saveGeneratorSetupState("/generators/npc", state, storage)).toBe(
      true,
    );
    expect(
      consumeGeneratorSetupState("/generators/business", storage),
    ).toBeNull();
    expect(consumeGeneratorSetupState("/generators/npc", storage)).toEqual(
      state,
    );
    expect(consumeGeneratorSetupState("/generators/npc", storage)).toBeNull();
  });

  it("does not claim success when storage rejects the write", () => {
    const storage = {
      setItem: () => {
        throw new Error("storage full");
      },
    };
    expect(
      saveGeneratorSetupState(
        "/generators/npc",
        { forms: {}, activeTheme: "Fantasy", useAI: true },
        storage,
      ),
    ).toBe(false);
  });
});
