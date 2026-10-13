import { describe, expect, it } from "bun:test";
import { QUICK_PROMPT_SETS } from "help-engine";
import { JourneyDefinitionSchema } from "../src/schema";
import { fixture } from "./fixtures";

const parse = (over: Record<string, unknown>) =>
  JourneyDefinitionSchema.safeParse({ ...fixture, ...over }).success;

const withStep = (index: number, over: Record<string, unknown>) =>
  parse({
    steps: fixture.steps.map((s, i) => (i === index ? { ...s, ...over } : s)),
  });

describe("JourneyDefinitionSchema", () => {
  it("accepts a valid definition", () => {
    expect(JourneyDefinitionSchema.safeParse(fixture).success).toBe(true);
  });

  it("rejects duplicate step ids", () => {
    expect(withStep(1, { id: "add-place" })).toBe(false);
  });

  it("rejects `after` that points at a later or unknown step", () => {
    expect(withStep(0, { after: ["connect"] })).toBe(false);
    expect(withStep(3, { after: ["nope"] })).toBe(false);
    expect(withStep(1, { after: ["add-character"] })).toBe(false);
  });

  it("rejects a step without fallback", () => {
    expect(withStep(2, { fallback: undefined })).toBe(false);
    expect(withStep(2, { fallback: "" })).toBe(false);
  });

  it("requires anyEntryCopy when a step names categories", () => {
    expect(withStep(0, { anyEntryCopy: undefined })).toBe(false);
  });

  it("rejects a showMe that is not a valid guidance action", () => {
    expect(
      withStep(0, { showMe: { type: "deleteEntry", label: "Delete" } }),
    ).toBe(false);
    expect(
      withStep(0, {
        showMe: { type: "highlight", target: "create-entry", label: "Create" },
      }),
    ).toBe(true);
  });

  it("only allows quick prompts that exist", () => {
    const real = QUICK_PROMPT_SETS[0]!.prompts[0]!;
    expect(withStep(0, { quickPrompt: real })).toBe(true);
    expect(withStep(0, { quickPrompt: "Write my world for me" })).toBe(false);
  });

  it("allows 2 to 6 steps", () => {
    expect(parse({ steps: fixture.steps.slice(0, 1) })).toBe(false);
    expect(parse({ steps: fixture.steps.slice(0, 2) })).toBe(true);
    const many = Array.from({ length: 7 }, (_, i) => ({
      id: `s-${i}`,
      instruction: "Do it.",
      completeOn: { kind: "entry-found" },
      fallback: "Do it.",
    }));
    expect(parse({ steps: many })).toBe(false);
  });

  it("enforces the copy limits", () => {
    expect(parse({ title: "x".repeat(61) })).toBe(false);
    expect(withStep(0, { instruction: "x".repeat(161) })).toBe(false);
    expect(withStep(0, { fallback: "x".repeat(201) })).toBe(false);
    expect(withStep(0, { anyEntryCopy: "x".repeat(161) })).toBe(false);
  });

  it("requires a positive integer version and kebab-case step ids", () => {
    expect(parse({ version: 0 })).toBe(false);
    expect(parse({ version: 1.5 })).toBe(false);
    expect(withStep(0, { id: "Add Place" })).toBe(false);
  });
});
