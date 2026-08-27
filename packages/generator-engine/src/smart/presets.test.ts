import { describe, expect, it } from "vitest";
import { applyPreset, presetsFor, type SmartPreset } from "./presets";

const PRESETS: SmartPreset[] = [
  {
    id: "merchant-port",
    label: "Merchant Port",
    description: "A harbour town that lives on the tide of trade.",
    genres: ["Fantasy"],
    set: { environment: "Coastal harbour", primaryFunction: "Trade hub" },
  },
  {
    id: "anywhere",
    label: "Anywhere",
    description: "Fits any genre.",
    set: { tone: "Grim" },
  },
];

describe("presetsFor", () => {
  it("keeps genre-scoped presets only for their genre", () => {
    expect(presetsFor(PRESETS, "Fantasy").map((p) => p.id)).toEqual([
      "merchant-port",
      "anywhere",
    ]);
    expect(presetsFor(PRESETS, "Cyberpunk").map((p) => p.id)).toEqual([
      "anywhere",
    ]);
  });

  it("preserves declaration order", () => {
    expect(presetsFor(PRESETS, "Fantasy")[0].id).toBe("merchant-port");
  });
});

describe("applyPreset", () => {
  it("locks each of the preset's axes with preset provenance", () => {
    const config = applyPreset({ genre: "Fantasy" }, PRESETS[0]);
    expect(config.locked).toEqual({
      environment: { value: "Coastal harbour", source: "preset" },
      primaryFunction: { value: "Trade hub", source: "preset" },
    });
  });

  it("leaves the rest of the config alone", () => {
    const config = applyPreset({ genre: "Fantasy" }, PRESETS[1]);
    expect(config.genre).toBe("Fantasy");
    expect(Object.keys(config.locked ?? {})).toEqual(["tone"]);
  });

  it("does not override a choice the user made by hand", () => {
    const config = applyPreset(
      {
        locked: {
          environment: { value: "Mountain pass", source: "manual" },
        },
      },
      PRESETS[0],
    );
    expect(config.locked?.environment).toEqual({
      value: "Mountain pass",
      source: "manual",
    });
    expect(config.locked?.primaryFunction).toEqual({
      value: "Trade hub",
      source: "preset",
    });
  });

  it("replaces a value an earlier preset set", () => {
    const first = applyPreset({}, PRESETS[0]);
    const second = applyPreset(first, {
      id: "inland",
      label: "Inland",
      description: "Nowhere near water.",
      set: { environment: "Mountain pass" },
    });
    expect(second.locked?.environment).toEqual({
      value: "Mountain pass",
      source: "preset",
    });
  });

  it("does not mutate the config it was given", () => {
    const original = { genre: "Fantasy" };
    applyPreset(original, PRESETS[0]);
    expect(original).toEqual({ genre: "Fantasy" });
  });
});
