import { describe, it, expect } from "vitest";
import { ConnectionSchema, ConnectionTypeSchema } from "./connection";

describe("ConnectionTypeSchema family types", () => {
  it.each(["parent_of", "child_of", "spouse_of"])(
    "accepts family relationship type %s",
    (type) => {
      expect(ConnectionTypeSchema.parse(type)).toBe(type);
    },
  );

  it("parses a connection using a family type", () => {
    const conn = ConnectionSchema.parse({
      target: "entity-2",
      type: "parent_of",
    });
    expect(conn.type).toBe("parent_of");
    expect(conn.target).toBe("entity-2");
    expect(conn.strength).toBe(1);
  });

  it("still accepts existing generic types and custom strings", () => {
    expect(ConnectionSchema.parse({ target: "e", type: "knows" }).type).toBe(
      "knows",
    );
    expect(
      ConnectionSchema.parse({ target: "e", type: "custom_bond" }).type,
    ).toBe("custom_bond");
  });
});
