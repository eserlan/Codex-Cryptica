import { describe, expect, it } from "bun:test";
import {
  canonicalProblem,
  openGraphProblem,
  redirectProbeUrls,
  redirectStep,
  redirectTargetProblem,
  robotsMetaProblem,
} from "./check-canonical-host.mjs";

describe("canonical-host response checks", () => {
  it("follows a permanent redirect relative to the current URL", () => {
    const current = new URL("https://www.codexcryptica.com/old?keep=1");
    const response = new Response(null, {
      status: 308,
      headers: { location: "/new?keep=1" },
    });

    expect(redirectStep(response, current)).toEqual({
      next: new URL("https://www.codexcryptica.com/new?keep=1"),
    });
  });

  it("rejects missing and temporary redirects", () => {
    const current = new URL("https://www.codexcryptica.com/");
    expect(redirectStep(new Response(null, { status: 301 }), current)).toEqual({
      error: "permanent redirect missing Location",
    });
    expect(
      redirectStep(
        new Response(null, { status: 302, headers: { location: "/" } }),
        current,
      ),
    ).toEqual({
      error: "non-permanent 302 redirect to /",
    });
  });

  it("requires the permanent redirect to preserve path and query", () => {
    const start = "http://www.codexcryptica.com/lore?chapter=2";
    expect(
      redirectTargetProblem(
        start,
        new URL("https://codexcryptica.com/lore?chapter=2"),
        true,
      ),
    ).toBeNull();
    expect(
      redirectTargetProblem(
        start,
        new URL("https://codexcryptica.com/lore"),
        true,
      ),
    ).toContain("expected https://codexcryptica.com/lore?chapter=2");
    expect(
      redirectTargetProblem(
        start,
        new URL("https://codexcryptica.com/lore?chapter=2"),
        false,
      ),
    ).toBe("no permanent redirect");
  });

  it("accepts an apex canonical and rejects malformed or misplaced canonicals", () => {
    const canonical = (href) => `<link rel="canonical" href="${href}">`;
    expect(
      canonicalProblem(
        "/answers/example",
        canonical("https://codexcryptica.com/answers/example"),
      ),
    ).toBeNull();
    expect(
      canonicalProblem("/answers/example", canonical("not a URL")),
    ).toContain("invalid canonical URL");
    expect(
      canonicalProblem(
        "/answers/example",
        canonical("https://www.codexcryptica.com/answers/example"),
      ),
    ).toContain("not https://codexcryptica.com");
    expect(
      canonicalProblem(
        "/answers/example",
        canonical("https://codexcryptica.com/"),
      ),
    ).toBe("canonical points to homepage unexpectedly");
  });

  it("requires Open Graph URLs to use the apex host", () => {
    expect(
      openGraphProblem(
        '<meta property="og:url" content="https://codexcryptica.com/answers/example">',
      ),
    ).toBeNull();
    expect(
      openGraphProblem(
        '<meta property="og:url" content="https://www.codexcryptica.com/answers/example">',
      ),
    ).toContain("not on preferred host");
  });

  it("checks all noncanonical HTTP and www origin combinations", () => {
    expect(redirectProbeUrls("/lore")).toEqual([
      "https://www.codexcryptica.com/lore?cc_host_probe=1",
      "http://codexcryptica.com/lore?cc_host_probe=1",
      "http://www.codexcryptica.com/lore?cc_host_probe=1",
    ]);
  });

  it("rejects noindex in a robots meta tag", () => {
    expect(
      robotsMetaProblem('<meta name="robots" content="index, noindex">'),
    ).toContain('<meta name="robots"');
    expect(
      robotsMetaProblem("<meta name=robots content=index,noindex>"),
    ).toContain('<meta name="robots"');
    expect(
      robotsMetaProblem('<meta name="robots" content="index, follow">'),
    ).toBeNull();
    expect(
      robotsMetaProblem("<meta name=robots content=index,follow>"),
    ).toBeNull();
  });
});
