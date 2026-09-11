/**
 * Lightweight structural validator for the subset of JSON Schema this
 * pipeline actually needs to check (type, required, properties, items,
 * enum, oneOf) — deliberately not a full JSON Schema engine (no $ref,
 * pattern, format, etc.). A "valid JSON" response is not the same claim as
 * "matches the requested schema"; without this, a schema-invalid response
 * (e.g. missing a required field) would be marked
 * `structuredOutputValid: true` and never trigger the retry/fallback
 * policy that FR-010a depends on.
 */

import type { LlmRequest } from "./types";

type JsonSchema = Record<string, unknown>;

/**
 * True when a request wants JSON-mode/structured output from the provider:
 * either it explicitly carries a `schema` (any operation), or its
 * `operation` is "structured-generation" (schema-less JSON mode). Shared
 * by both adaptors so the two stay in sync on what triggers JSON mode,
 * parsing, and optional schema validation.
 */
export function wantsStructuredOutput(request: LlmRequest): boolean {
  return !!request.schema || request.operation === "structured-generation";
}

/**
 * Applies the same structured-output validation the buffered adaptors run
 * (`callGemini`/`callOpenAi`) to a streaming adaptor's fully-accumulated
 * text, once its `complete` event is ready. Streaming has no retry/fallback
 * of its own (see `GenerationEvent`'s doc comment in `types.ts`) — an
 * invalid result here becomes an `error` event instead of silently skipping
 * the validation the buffered contract promises callers.
 */
export function validateStructuredStreamText(
  request: LlmRequest,
  text: string,
): { ok: true } | { ok: false; reason: string } {
  if (!wantsStructuredOutput(request)) return { ok: true };

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, reason: "structured-output-invalid" };
  }
  if (request.schema && !validateAgainstSchema(parsed, request.schema)) {
    return { ok: false, reason: "structured-output-schema-mismatch" };
  }
  return { ok: true };
}

function typeOf(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function matchesType(value: unknown, schemaType: unknown): boolean {
  const actual = typeOf(value);
  if (schemaType === "integer") {
    return actual === "number" && Number.isInteger(value);
  }
  return actual === schemaType;
}

export function validateAgainstSchema(
  value: unknown,
  schema: JsonSchema | undefined,
): boolean {
  if (!schema) return true;

  if (Array.isArray(schema.oneOf)) {
    return (
      schema.oneOf
        .filter(
          (branch): branch is JsonSchema =>
            !!branch && typeof branch === "object",
        )
        .filter((branch) => validateAgainstSchema(value, branch)).length === 1
    );
  }

  const schemaType = schema.type;
  if (typeof schemaType === "string" && !matchesType(value, schemaType)) {
    return false;
  }

  if (Array.isArray(schema.enum) && !schema.enum.includes(value)) {
    return false;
  }

  if (Array.isArray(schema.anyOf)) {
    return schema.anyOf.some(
      (branch): branch is JsonSchema =>
        !!branch &&
        typeof branch === "object" &&
        validateAgainstSchema(value, branch),
    );
  }

  if (
    typeof schema.minLength === "number" &&
    typeof value === "string" &&
    value.length < schema.minLength
  ) {
    return false;
  }

  if (
    typeof schema.maxLength === "number" &&
    typeof value === "string" &&
    value.length > schema.maxLength
  ) {
    return false;
  }

  if (
    typeof schema.pattern === "string" &&
    typeof value === "string" &&
    !new RegExp(schema.pattern).test(value)
  ) {
    return false;
  }

  if (typeOf(value) === "object" && value !== null) {
    const obj = value as Record<string, unknown>;

    const required = Array.isArray(schema.required) ? schema.required : [];
    for (const key of required) {
      if (typeof key === "string" && !(key in obj)) return false;
    }

    const properties = schema.properties;
    if (properties && typeof properties === "object") {
      for (const [key, subSchema] of Object.entries(
        properties as Record<string, JsonSchema>,
      )) {
        if (key in obj && !validateAgainstSchema(obj[key], subSchema)) {
          return false;
        }
      }
    }
  }

  if (
    typeOf(value) === "array" &&
    schema.items &&
    typeof schema.items === "object"
  ) {
    if (
      typeof schema.minItems === "number" &&
      (value as unknown[]).length < schema.minItems
    ) {
      return false;
    }
    if (
      typeof schema.maxItems === "number" &&
      (value as unknown[]).length > schema.maxItems
    ) {
      return false;
    }
    const itemSchema = schema.items as JsonSchema;
    for (const item of value as unknown[]) {
      if (!validateAgainstSchema(item, itemSchema)) return false;
    }
  }

  return true;
}
