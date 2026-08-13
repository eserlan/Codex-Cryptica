import { describe, it, expect } from "vitest";
import { validateAgainstSchema } from "./schema-validation";

describe("validateAgainstSchema", () => {
  it("passes when no schema is given", () => {
    expect(validateAgainstSchema({ anything: true }, undefined)).toBe(true);
  });

  it("checks top-level type", () => {
    expect(validateAgainstSchema({ ok: true }, { type: "object" })).toBe(true);
    expect(validateAgainstSchema("not an object", { type: "object" })).toBe(
      false,
    );
    expect(validateAgainstSchema(42, { type: "number" })).toBe(true);
    expect(validateAgainstSchema(42.5, { type: "integer" })).toBe(false);
    expect(validateAgainstSchema(42, { type: "integer" })).toBe(true);
  });

  it("rejects an object missing a required property", () => {
    const schema = {
      type: "object",
      required: ["ok"],
      properties: { ok: { type: "boolean" } },
    };
    expect(validateAgainstSchema({ ok: true }, schema)).toBe(true);
    expect(validateAgainstSchema({}, schema)).toBe(false);
  });

  it("rejects a property whose value doesn't match its subschema type", () => {
    const schema = {
      type: "object",
      required: ["count"],
      properties: { count: { type: "number" } },
    };
    expect(validateAgainstSchema({ count: "five" }, schema)).toBe(false);
    expect(validateAgainstSchema({ count: 5 }, schema)).toBe(true);
  });

  it("validates array items recursively", () => {
    const schema = { type: "array", items: { type: "string" } };
    expect(validateAgainstSchema(["a", "b"], schema)).toBe(true);
    expect(validateAgainstSchema(["a", 2], schema)).toBe(false);
  });

  it("validates nested objects recursively", () => {
    const schema = {
      type: "object",
      required: ["location"],
      properties: {
        location: {
          type: "object",
          required: ["name"],
          properties: { name: { type: "string" } },
        },
      },
    };
    expect(
      validateAgainstSchema({ location: { name: "The Crossing" } }, schema),
    ).toBe(true);
    expect(validateAgainstSchema({ location: {} }, schema)).toBe(false);
  });

  it("checks enum membership", () => {
    const schema = { enum: ["low", "medium", "high"] };
    expect(validateAgainstSchema("medium", schema)).toBe(true);
    expect(validateAgainstSchema("extreme", schema)).toBe(false);
  });
});
