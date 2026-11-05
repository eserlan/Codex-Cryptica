import { describe, expect, it } from "vitest";
import { mysteryStagePrompts as prompts } from "./mystery-stage-prompts";
import { validStages } from "./mystery-staged.fixtures";
import { resolveMystery } from "./public-mystery";
import { formatSeedBlock, type ConceptSeed } from "./concept-seed";

describe("mystery stage prompts", () => {
  it("locks prior artifacts into each later stage and carries audit issues through repair", () => {
    const resolved = resolveMystery();
    const [foundation, cast, clues, pressure] = validStages();
    const locked = { foundation, cast, clues, pressure };
    const issues = ["Fix the suspect's alibi"];
    const stages = [
      prompts.foundation(resolved, "campaign context"),
      prompts.cast(resolved, foundation),
      prompts.clues(resolved.mysteryType, foundation, cast),
      prompts.pressure(foundation, cast, clues),
      prompts.audit(locked),
      prompts.repair(locked, issues),
      prompts.finalAudit(locked, issues),
    ];
    stages.forEach((prompt, index) =>
      expect(prompt).toContain(`STAGE ${index + 1} OF 7:`),
    );
    expect(stages[0]).toContain("campaign context");
    stages
      .slice(1)
      .forEach((prompt) =>
        expect(prompt).toContain(JSON.stringify(foundation)),
      );
    stages
      .slice(2)
      .forEach((prompt) => expect(prompt).toContain(JSON.stringify(cast)));
    stages
      .slice(3)
      .forEach((prompt) => expect(prompt).toContain(JSON.stringify(clues)));
    stages
      .slice(4)
      .forEach((prompt) => expect(prompt).toContain(JSON.stringify(pressure)));
    stages
      .slice(5)
      .forEach((prompt) => expect(prompt).toContain(JSON.stringify(issues)));
  });
  it("adapts non-theft prompts and includes caller-provided banned names", () => {
    const options = resolveMystery({
      mysteryType: "Murder",
      avoidNames: ["Custom Name"],
    });
    expect(prompts.foundation(options, "")).toContain('"kind":"method"');
    expect(prompts.clues("Murder", {}, {})).toContain("forensic proof");
    expect(prompts.system(options)).toContain("Custom Name");
    expect(prompts.system(options)).toContain("never change accepted facts");
    expect(prompts.cast(options, {})).not.toContain("undefined");
  });
  it("uses an explicit seed instead of rolling and keeps campaign context first", () => {
    const seed: ConceptSeed = {
      premise: "A secret is concealed",
      stake: "A witness is at risk",
      setting: "Archive",
      distinctiveElement: "A bell",
      titleIdea: "Test case",
    };
    const rng = () => {
      throw new Error("should not roll");
    };
    expect(
      prompts.context(resolveMystery(), {
        contextPrefix: "Campaign",
        seed,
        rng,
      }),
    ).toBe(`Campaign\n\n${formatSeedBlock(seed)}`);
  });
  it("rolls when no seed is supplied, including null, and omits absent context", () => {
    const resolved = resolveMystery();
    const context = prompts.context(resolved, { rng: () => 0 });
    expect(context).toBe(
      prompts.context(resolved, { rng: () => 0, seed: null }),
    );
    expect(context).toContain("Concept constraints");
    expect(context).not.toContain("undefined");
    expect(context).not.toMatch(/^\n/);
  });
});
