import { describe, expect, it } from "vitest";
import { buildStatBlockReadPrompt } from "./prompt";
import { fixtureById } from "./__fixtures__/stat-blocks";

const copy = { mode: "copy" as const, reader: "ai" as const };

describe("buildStatBlockReadPrompt", () => {
  it("gives the copy rules and keeps the pasted source out of the system instruction", () => {
    const source = fixtureById("clean-hill-brute").source;
    const { systemInstruction, prompt } = buildStatBlockReadPrompt({
      ...copy,
      source,
    });
    expect(systemInstruction).toContain("Transcribe only");
    expect(systemInstruction).toContain('outcome "several"');
    expect(systemInstruction).not.toContain("Greatclub");
    expect(prompt).toContain("Greatclub");
  });

  it("only uses open rules terms from rules-sources as grounding", () => {
    const { systemInstruction } = buildStatBlockReadPrompt({
      ...copy,
      source: "x",
    });
    expect(systemInstruction).toContain("Open Black Flag terms");
    expect(systemInstruction).toContain("(ToV) replaces");
  });

  it("switches to the conversion rules in convert-5e mode", () => {
    const { systemInstruction } = buildStatBlockReadPrompt({
      mode: "convert-5e",
      reader: "ai",
      source: "x",
    });
    expect(systemInstruction).toContain("convert one 5e stat block");
    expect(systemInstruction).toContain('state "converted"');
    expect(systemInstruction).not.toContain("Transcribe only");
  });

  it("passes a kind hint through to the prompt", () => {
    const { prompt } = buildStatBlockReadPrompt({
      ...copy,
      source: "x",
      kindHint: "npc",
    });
    expect(prompt).toContain("quick NPC");
  });
});
