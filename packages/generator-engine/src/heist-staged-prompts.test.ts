import { describe, expect, it } from "vitest";
import {
  objectiveMessage,
  responseMessage,
  securityMessage,
} from "./heist-staged-prompts";
import {
  RESOLVED_THEFT,
  VALID_STAGE_1,
  VALID_STAGE_2,
} from "./heist-staged.fixtures";
import { NAME_BAN_PROMPT } from "./public-npc";

describe("heist stage prompts", () => {
  it("carries caller context, objective constraints and the name ban into every stage", () => {
    const messages = [
      objectiveMessage(RESOLVED_THEFT, "Locked campaign facts"),
      securityMessage(RESOLVED_THEFT, VALID_STAGE_1, "Locked campaign facts"),
      responseMessage(
        RESOLVED_THEFT,
        VALID_STAGE_1,
        VALID_STAGE_2,
        "Locked campaign facts",
      ),
    ];
    messages.forEach((message, index) => {
      expect(message).toContain(`STAGE ${index + 1} OF 3`);
      expect(message).toContain("Locked campaign facts\n\nHeist Options:");
      expect(message).toContain(`- Heist Type: ${RESOLVED_THEFT.heistType}`);
      expect(message).toContain(
        `- Objective Complication: ${RESOLVED_THEFT.prizeComplication}`,
      );
      expect(message).toContain("House Valdor's rebellion");
      expect(message).toContain(NAME_BAN_PROMPT);
    });
  });

  it("locks earlier objective and security facts into later prompts", () => {
    const security = securityMessage(RESOLVED_THEFT, VALID_STAGE_1);
    const response = responseMessage(
      RESOLVED_THEFT,
      VALID_STAGE_1,
      VALID_STAGE_2,
    );
    for (const message of [security, response]) {
      expect(message).toContain(String(VALID_STAGE_1.title));
      expect(message).toContain(String(VALID_STAGE_1.score));
      expect(message).toContain(String(VALID_STAGE_1.objective));
      expect(message).toContain("service tunnel under the south cloister");
    }
    expect(response).toContain(String(VALID_STAGE_2.hiddenFactor));
    expect(response).toContain(
      "Templar sentries patrol the cloister courtyard.",
    );
    expect(response).toContain(`- **${RESOLVED_THEFT.innerRingLabel}**:`);
  });

  it("omits optional context and prize rather than interpolating missing values", () => {
    const resolved = { ...RESOLVED_THEFT, prize: "", campaignContext: "" };
    for (const message of [
      objectiveMessage(resolved),
      securityMessage(resolved, {}),
      responseMessage(resolved, {}, {}),
    ]) {
      expect(message).not.toContain("Requested Prize / Objective:");
      expect(message).not.toContain("undefined");
      expect(message).not.toContain("House Valdor");
    }
  });
});
