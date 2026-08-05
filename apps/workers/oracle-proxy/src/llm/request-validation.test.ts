import { describe, it, expect } from "vitest";
import { validateOperationRequestBody } from "./request-validation";

const validBody = {
  operation: "freeform-generation",
  messages: [{ role: "user", content: "hi" }],
};

describe("validateOperationRequestBody", () => {
  it("accepts a well-formed freeform-generation request", () => {
    expect(validateOperationRequestBody(validBody).valid).toBe(true);
  });

  it("accepts a structured-generation request that includes a schema", () => {
    expect(
      validateOperationRequestBody({
        operation: "structured-generation",
        messages: validBody.messages,
        schema: { type: "object" },
      }).valid,
    ).toBe(true);
  });

  it("rejects a structured-generation request missing schema", () => {
    const result = validateOperationRequestBody({
      operation: "structured-generation",
      messages: validBody.messages,
    });
    expect(result.valid).toBe(false);
    expect(result.error?.code).toBe("LLM_SCHEMA_REQUIRED");
  });

  for (const field of ["apiKey", "provider", "providerUrl", "modelId"]) {
    it(`rejects a body containing the disallowed field "${field}"`, () => {
      const result = validateOperationRequestBody({
        ...validBody,
        [field]: "x",
      });
      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe("LLM_DISALLOWED_FIELD");
    });
  }

  it("rejects a body with no messages", () => {
    const result = validateOperationRequestBody({
      operation: "freeform-generation",
    });
    expect(result.valid).toBe(false);
  });
});
