import { describe, it, expect } from "vitest";
import { getIconClass } from "./icon";

describe("getIconClass", () => {
  it("formats prefix:name into icon-[prefix--name]", () => {
    expect(getIconClass("lucide:user")).toBe("icon-[lucide--user]");
    expect(getIconClass("game-icons:sword")).toBe("icon-[game-icons--sword]");
    expect(getIconClass("mdi:account-group")).toBe("icon-[mdi--account-group]");
  });

  it("preserves strings that already start with icon-", () => {
    expect(getIconClass("icon-[lucide--shield]")).toBe("icon-[lucide--shield]");
    expect(getIconClass("icon-custom-class")).toBe("icon-custom-class");
  });

  it("returns fallback icon when iconStr is undefined", () => {
    expect(getIconClass(undefined)).toBe("icon-[lucide--circle]");
  });

  it("returns fallback icon when iconStr is empty string", () => {
    expect(getIconClass("")).toBe("icon-[lucide--circle]");
  });

  it("falls back to default icon for malformed icon names", () => {
    expect(getIconClass("user")).toBe("icon-[lucide--circle]");
    expect(getIconClass("not-an-icon")).toBe("icon-[lucide--circle]");
    expect(getIconClass(":user")).toBe("icon-[lucide--circle]");
    expect(getIconClass("lucide:")).toBe("icon-[lucide--circle]");
  });

  it("falls back to default icon when string has more than one colon", () => {
    expect(getIconClass("lucide:user:profile")).toBe("icon-[lucide--circle]");
  });
});
