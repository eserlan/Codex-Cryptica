import { describe, expect, it } from "vitest";
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

  it("tells the model to follow a length or format the guidance states", () => {
    expect(templateGuidanceInstruction("lore")).toContain(
      `If a section's guidance states a length or format, such as "one line" or "a bulleted list", follow it.`,
    );
  });
});
