import { describe, it, expect } from "vitest";
import { getDiceIcon } from "./dice-icons";

describe("getDiceIcon", () => {
  it("returns corresponding icon for standard dice sides", () => {
    expect(getDiceIcon(4)).toBe("icon-[mdi--dice-d4]");
    expect(getDiceIcon(6)).toBe("icon-[mdi--dice-d6]");
    expect(getDiceIcon(8)).toBe("icon-[mdi--dice-d8]");
    expect(getDiceIcon(10)).toBe("icon-[mdi--dice-d10]");
    expect(getDiceIcon(12)).toBe("icon-[mdi--dice-d12]");
    expect(getDiceIcon(20)).toBe("icon-[mdi--dice-d20]");
  });

  it("returns fallback icon when sides is undefined", () => {
    expect(getDiceIcon()).toBe("icon-[mdi--dice-multiple]");
    expect(getDiceIcon(undefined)).toBe("icon-[mdi--dice-multiple]");
  });

  it("returns fallback icon for non-standard sides", () => {
    expect(getDiceIcon(100)).toBe("icon-[mdi--dice-multiple]");
    expect(getDiceIcon(2)).toBe("icon-[mdi--dice-multiple]");
    expect(getDiceIcon(0)).toBe("icon-[mdi--dice-multiple]");
    expect(getDiceIcon(-6)).toBe("icon-[mdi--dice-multiple]");
  });
});
