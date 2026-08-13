/**
 * Lightweight structural validator for the subset of JSON Schema this
 * pipeline actually needs to check (type, required, properties, items,
 * enum) — deliberately not a full JSON Schema engine (no $ref, oneOf,
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

  const schemaType = schema.type;
  if (typeof schemaType === "string" && !matchesType(value, schemaType)) {
    return false;
  }

  if (Array.isArray(schema.enum) && !schema.enum.includes(value)) {
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
    const itemSchema = schema.items as JsonSchema;
    for (const item of value as unknown[]) {
      if (!validateAgainstSchema(item, itemSchema)) return false;
    }
  }

  return true;
}
