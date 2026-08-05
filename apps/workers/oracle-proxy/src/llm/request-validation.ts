/**
 * Validates an incoming provider-neutral operation request body before it
 * reaches the resolver. Rejects any field that would let a client name a
 * concrete provider, provider URL, provider model identifier, or
 * credential directly (FR-003).
 *
 * `schema` is optional even for `structured-generation`: a caller can ask
 * for JSON-mode output without supplying (or wanting) real JSON Schema
 * validation — adaptors fall back to each provider's schema-less JSON mode
 * in that case (research.md R2 addendum).
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

  return { valid: true };
}
