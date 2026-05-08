import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildAbsoluteUrl, getRobotsDirective } from "./site";

describe("site SEO helpers", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it("builds absolute URLs from the configured public origin", () => {
    vi.stubEnv("VITE_PUBLIC_APP_URL", "https://example.com/");

    expect(buildAbsoluteUrl("/blog/post")).toBe(
      "https://example.com/blog/post",
    );
    expect(buildAbsoluteUrl("blog")).toBe("https://example.com/blog");
  });

  it("falls back to the production robots directive when not configured", () => {
    expect(getRobotsDirective()).toBe("index, follow");
  });

  it("uses the configured robots directive", () => {
    vi.stubEnv("VITE_ROBOTS_DIRECTIVE", "noindex, nofollow");
    expect(getRobotsDirective()).toBe("noindex, nofollow");
  });
});
