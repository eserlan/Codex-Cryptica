/**
 * Validates an incoming provider-neutral operation request body before it
 * reaches the resolver. Rejects any field that would let a client name a
 * concrete provider, provider URL, provider model identifier, or
 * credential directly (FR-003), and requires a JSON Schema for
 * structured-generation requests.
 */

const DISALLOWED_CLIENT_FIELDS = [
  "apiKey",
  "provider",
  "providerUrl",
  "modelId",
];

export interface ValidationResult {
  valid: boolean;
  error?: { code: string; message: string };
}

export function validateOperationRequestBody(body: any): ValidationResult {
  for (const field of DISALLOWED_CLIENT_FIELDS) {
    if (body[field] !== undefined) {
      return {
        valid: false,
        error: {
          code: "LLM_DISALLOWED_FIELD",
          message: `The field "${field}" is not accepted in this request — provider details are resolved server-side.`,
        },
      };
    }
  }

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return {
      valid: false,
      error: {
        code: "LLM_INVALID_REQUEST",
        message: "Invalid request format. Required: messages (non-empty array)",
      },
    };
  }

  if (body.operation === "structured-generation" && !body.schema) {
    return {
      valid: false,
      error: {
        code: "LLM_SCHEMA_REQUIRED",
        message:
          "A JSON schema is required when operation is structured-generation",
      },
    };
  }

  return { valid: true };
}
