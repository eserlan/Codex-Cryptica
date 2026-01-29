import { describe, it, expect } from "vitest";
import { EntitySchema, CategorySchema, DEFAULT_ICON } from "./entity";

describe("Entity Schema Validation", () => {
  it("should validate a correct entity", () => {
    const validEntity = {
      id: "npc-1",
      type: "npc",
      title: "Valid NPC",
      tags: ["test"],
      connections: [{ target: "loc-1", type: "located_in", strength: 1 }],
      content: "Some content",
    };

    const result = EntitySchema.safeParse(validEntity);
    expect(result.success).toBe(true);
  });

  it("should accept custom entity types (flexible categories)", () => {
    const customTypeEntity = {
      id: "artifact-1",
      type: "artifact",  // Custom category type
      title: "Magic Sword",
    };

    const result = EntitySchema.safeParse(customTypeEntity);
    expect(result.success).toBe(true);
  });
});

describe("Category Schema Validation", () => {
  it("should validate a valid category", () => {
    const validCategory = {
      id: "custom-type",
      label: "Custom Type",
      color: "#ff5500",
      icon: "lucide:star",
    };

    const result = CategorySchema.safeParse(validCategory);
    expect(result.success).toBe(true);
  });

  it("should use default icon when not provided", () => {
    const categoryWithoutIcon = {
      id: "no-icon",
      label: "No Icon Category",
      color: "#123abc",
    };

    const result = CategorySchema.parse(categoryWithoutIcon);
    expect(result.icon).toBe(DEFAULT_ICON);
  });

  it("should reject invalid hex color", () => {
    const invalidColor = {
      id: "bad-color",
      label: "Bad Color",
      color: "not-a-color",
    };

    const result = CategorySchema.safeParse(invalidColor);
    expect(result.success).toBe(false);
  });

  it("should reject 3-digit hex color", () => {
    const shortHex = {
      id: "short-hex",
      label: "Short Hex",
      color: "#fff",
    };

    const result = CategorySchema.safeParse(shortHex);
    expect(result.success).toBe(false);
  });

  it("should reject empty ID", () => {
    const emptyId = {
      id: "",
      label: "Empty ID",
      color: "#ffffff",
    };

    const result = CategorySchema.safeParse(emptyId);
    expect(result.success).toBe(false);
  });

  it("should reject empty label", () => {
    const emptyLabel = {
      id: "empty-label",
      label: "",
      color: "#ffffff",
    };

    const result = CategorySchema.safeParse(emptyLabel);
    expect(result.success).toBe(false);
  });
});
