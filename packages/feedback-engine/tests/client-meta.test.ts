import { describe, expect, test } from "bun:test";
import { browserFamily, screenClass } from "../src/client-meta";

describe("browserFamily", () => {
  test("prefers userAgentData brands", () => {
    expect(
      browserFamily({
        userAgentData: { brands: [{ brand: "Microsoft Edge" }] },
      }),
    ).toBe("edge");
    expect(
      browserFamily({
        userAgentData: { brands: [{ brand: "Google Chrome" }] },
      }),
    ).toBe("chrome");
  });

  test("detects Edge before Chrome, and Samsung Internet before Chrome", () => {
    expect(
      browserFamily({ userAgent: "Mozilla/5.0 Chrome/120 Edg/120.0" }),
    ).toBe("edge");
    expect(
      browserFamily({ userAgent: "Mozilla/5.0 SamsungBrowser/24 Chrome/120" }),
    ).toBe("samsung");
  });

  test("detects Firefox and Safari, and falls back to other", () => {
    expect(browserFamily({ userAgent: "Mozilla/5.0 Firefox/128.0" })).toBe(
      "firefox",
    );
    expect(
      browserFamily({ userAgent: "Mozilla/5.0 Version/17 Safari/605.1" }),
    ).toBe("safari");
    expect(browserFamily({ userAgent: "SomeBot/1.0" })).toBe("other");
    expect(browserFamily({})).toBe("other");
  });
});

describe("screenClass", () => {
  test("narrow under 640 CSS pixels, wide from 640", () => {
    expect(screenClass(639)).toBe("narrow");
    expect(screenClass(640)).toBe("wide");
  });
});
