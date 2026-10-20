import { describe, expect, it } from "vitest";
import { FEEDBACK_AREAS } from "feedback-engine";
import { HELP_AREAS } from "help-engine";

// The feedback package keeps its own copy of the help areas so that it does
// not import the help engine. This keeps the two lists in step.
describe("feedback areas", () => {
  it("contain every help area", () => {
    for (const area of HELP_AREAS) expect(FEEDBACK_AREAS).toContain(area);
  });
});
