import { describe, expect, it } from "bun:test";
import {
  templateGuidanceBlock,
  templateGuidanceInstruction,
} from "./template-guidance";

describe("template guidance prompt helpers", () => {
  it("wraps a template in a named guidance block", () => {
    expect(templateGuidanceBlock("\n## Summary\nGuidance\n")).toBe(
      "<template_guidance>\n## Summary\nGuidance\n</template_guidance>",
    );
  });

  it("requires entity-specific prose rather than copied guidance", () => {
    expect(templateGuidanceInstruction("lore")).toContain(
      "Do not reproduce explanatory text, placeholders, questions, examples, or XML tags from <template_guidance> in the generated lore.",
    );
  });
});
