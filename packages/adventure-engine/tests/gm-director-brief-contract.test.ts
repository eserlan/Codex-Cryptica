import { describe, expect, it } from "vitest";
import * as publicBrief from "../src/gm-director-brief";
import { MAX_DIRECTOR_BRIEF_CHARS as barrelLimit } from "../src";
import {
  DIRECTOR_HISTORY_LOOKBACK_TURNS,
  MAX_DIRECTOR_BRIEF_CHARS,
  MAX_OTHER_SCENARIO_IDS,
  type GMDirectorBrief,
  type GMDirectorBriefInput,
} from "../src/gm-director-brief-contract";
import { session } from "./reducer-fixtures";

describe("director brief contract", () => {
  it("preserves the runtime exports and limits at the original entry points", () => {
    expect(Object.keys(publicBrief).sort()).toEqual([
      "MAX_DIRECTOR_BRIEF_CHARS",
      "buildGMDirectorBrief",
      "buildGMDirectorBriefWithPacing",
    ]);
    expect(MAX_DIRECTOR_BRIEF_CHARS).toBe(2400);
    expect(publicBrief.MAX_DIRECTOR_BRIEF_CHARS).toBe(MAX_DIRECTOR_BRIEF_CHARS);
    expect(barrelLimit).toBe(MAX_DIRECTOR_BRIEF_CHARS);
    expect(MAX_OTHER_SCENARIO_IDS).toBe(6);
    expect(DIRECTOR_HISTORY_LOOKBACK_TURNS).toBe(256);
  });

  it("accepts the extracted input and output contracts through the existing API", () => {
    const input: GMDirectorBriefInput = {
      session: session(),
      phase: "opening",
    };
    const brief: GMDirectorBrief | undefined =
      publicBrief.buildGMDirectorBrief(input);
    expect(brief?.mode).toBe("open-world");
    expect(
      publicBrief.buildGMDirectorBrief({ ...input, maxChars: 0 }),
    ).toBeUndefined();
  });
});
