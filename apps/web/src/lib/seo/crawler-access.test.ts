import { describe, expect, it } from "vitest";
import {
  downgradeKnownGaps,
  evaluateCrawlResponse,
  expectationFor,
  isPathAllowed,
  OAI_SEARCHBOT_TOKEN,
  parseRobotsTxt,
  pickRepresentativeRoutes,
  selectRobotsGroup,
  type CrawlResponse,
} from "./crawler-access";

const PRODUCTION_ROBOTS = `User-agent: *
Allow: /
Allow: /llms.txt
Allow: /llms-full.txt

# Explicitly invite AI search & citation bots
User-agent: GPTBot
User-agent: OAI-SearchBot
User-agent: Google-Extended
User-agent: ClaudeBot
User-agent: PerplexityBot
Allow: /
Allow: /llms.txt
Allow: /llms-full.txt

# Host-specific sitemap declaration
Sitemap: https://codexcryptica.com/sitemap.xml`;

describe("parseRobotsTxt", () => {
  it("groups consecutive user-agent lines and collects sitemaps", () => {
    const robots = parseRobotsTxt(PRODUCTION_ROBOTS);

    expect(robots.groups).toHaveLength(2);
    expect(robots.groups[0].agents).toEqual(["*"]);
    expect(robots.groups[1].agents).toContain("oai-searchbot");
    expect(robots.groups[1].agents).toContain("gptbot");
    expect(robots.sitemaps).toEqual(["https://codexcryptica.com/sitemap.xml"]);
  });

  it("starts a new group when a user-agent line follows a rule line", () => {
    const robots = parseRobotsTxt(
      ["User-agent: A", "Disallow: /a", "User-agent: B", "Disallow: /b"].join(
        "\n",
      ),
    );

    expect(robots.groups).toHaveLength(2);
    expect(robots.groups[0].disallow).toEqual(["/a"]);
    expect(robots.groups[1].disallow).toEqual(["/b"]);
  });

  it("ignores comments and malformed lines", () => {
    const robots = parseRobotsTxt(
      [
        "# comment",
        "not a directive",
        "User-agent: *",
        "Allow: / # trailing",
      ].join("\n"),
    );

    expect(robots.groups).toHaveLength(1);
    expect(robots.groups[0].allow).toEqual(["/"]);
  });
});

describe("selectRobotsGroup", () => {
  it("prefers the named group over the wildcard group", () => {
    const robots = parseRobotsTxt(PRODUCTION_ROBOTS);
    const group = selectRobotsGroup(robots, OAI_SEARCHBOT_TOKEN);

    expect(group?.agents).toContain("oai-searchbot");
    expect(group?.agents).not.toContain("*");
  });

  it("falls back to the wildcard group for an unnamed crawler", () => {
    const robots = parseRobotsTxt(PRODUCTION_ROBOTS);

    expect(selectRobotsGroup(robots, "SomeOtherBot")?.agents).toEqual(["*"]);
  });

  it("returns null when neither a named nor wildcard group exists", () => {
    const robots = parseRobotsTxt("User-agent: OnlyBot\nDisallow: /");

    expect(selectRobotsGroup(robots, "OAI-SearchBot")).toBeNull();
  });
});

describe("isPathAllowed", () => {
  it("allows the public discovery routes for OAI-SearchBot", () => {
    const robots = parseRobotsTxt(PRODUCTION_ROBOTS);

    for (const path of ["/", "/llms.txt", "/for/game-masters", "/answers/x"]) {
      expect(isPathAllowed(robots, OAI_SEARCHBOT_TOKEN, path)).toBe(true);
    }
  });

  it("honours the longest matching rule, with Allow winning ties", () => {
    const robots = parseRobotsTxt(
      "User-agent: *\nDisallow: /vault\nAllow: /vault/public",
    );

    expect(isPathAllowed(robots, "*", "/vault/private")).toBe(false);
    expect(isPathAllowed(robots, "*", "/vault/public/page")).toBe(true);
  });

  it("supports the * and $ pattern extensions", () => {
    const robots = parseRobotsTxt(
      "User-agent: *\nDisallow: /*.json$\nDisallow: /tmp",
    );

    expect(isPathAllowed(robots, "*", "/data/report.json")).toBe(false);
    expect(isPathAllowed(robots, "*", "/data/report.json.html")).toBe(true);
    expect(isPathAllowed(robots, "*", "/tmp/anything")).toBe(false);
  });

  it("does not let a named group inherit wildcard disallows", () => {
    const robots = parseRobotsTxt(
      [
        "User-agent: *",
        "Disallow: /",
        "",
        "User-agent: OAI-SearchBot",
        "Allow: /",
      ].join("\n"),
    );

    expect(isPathAllowed(robots, OAI_SEARCHBOT_TOKEN, "/for/dms")).toBe(true);
    expect(isPathAllowed(robots, "SomeOtherBot", "/for/dms")).toBe(false);
  });
});

const HEAD = [
  "<title>Codex Cryptica for Game Masters</title>",
  '<meta name="description" content="Run your table.">',
  '<meta name="robots" content="index, follow">',
  '<link rel="canonical" href="https://codexcryptica.com/for/game-masters">',
].join("");

const bodyWith = (extra = "") =>
  `${HEAD}${extra}<h1>For Game Masters</h1>${"x".repeat(2000)}`;

const htmlResponse = (
  overrides: Partial<CrawlResponse> = {},
): CrawlResponse => ({
  requestedUrl: "https://codexcryptica.com/for/game-masters",
  finalUrl: "https://codexcryptica.com/for/game-masters",
  status: 200,
  headers: { "content-type": "text/html; charset=utf-8" },
  body: bodyWith(),
  ...overrides,
});

describe("evaluateCrawlResponse", () => {
  it("reports nothing for a healthy public page", () => {
    expect(evaluateCrawlResponse(htmlResponse(), { kind: "html" })).toEqual([]);
  });

  it("flags a non-200 status", () => {
    const findings = evaluateCrawlResponse(htmlResponse({ status: 404 }), {
      kind: "html",
    });

    expect(findings.map((finding) => finding.code)).toContain("status");
  });

  it("flags a Cloudflare cf-mitigated challenge", () => {
    const findings = evaluateCrawlResponse(
      htmlResponse({
        status: 403,
        headers: { "cf-mitigated": "challenge" },
      }),
      { kind: "html" },
    );

    expect(findings.map((finding) => finding.code)).toContain("challenge");
  });

  it("flags a JS challenge interstitial served with a 200", () => {
    const findings = evaluateCrawlResponse(
      htmlResponse({ body: bodyWith("<p>Just a moment...</p>") }),
      { kind: "html" },
    );

    expect(findings.map((finding) => finding.code)).toContain("challenge");
  });

  it("flags a redirect into an authentication route", () => {
    const findings = evaluateCrawlResponse(
      htmlResponse({ finalUrl: "https://codexcryptica.com/login?next=/for" }),
      { kind: "html" },
    );

    expect(findings.map((finding) => finding.code)).toContain("auth-redirect");
  });

  it("flags noindex from either the meta tag or the header", () => {
    const fromMeta = evaluateCrawlResponse(
      htmlResponse({
        body: bodyWith().replace(
          '<meta name="robots" content="index, follow">',
          '<meta name="robots" content="noindex, nofollow">',
        ),
      }),
      { kind: "html" },
    );
    const fromHeader = evaluateCrawlResponse(
      htmlResponse({
        headers: { "X-Robots-Tag": "noindex" },
      }),
      { kind: "html" },
    );

    expect(fromMeta.map((finding) => finding.code)).toContain("noindex");
    expect(fromHeader.map((finding) => finding.code)).toContain("noindex");
  });

  it("flags an off-origin canonical as an error and a same-origin mismatch as a warning", () => {
    const offOrigin = evaluateCrawlResponse(
      htmlResponse({
        body: bodyWith().replace(
          "https://codexcryptica.com/for/game-masters",
          "https://example.com/for",
        ),
      }),
      { kind: "html" },
    );
    const mismatch = evaluateCrawlResponse(
      htmlResponse({
        body: bodyWith().replace(
          'href="https://codexcryptica.com/for/game-masters"',
          'href="https://codexcryptica.com/features"',
        ),
      }),
      { kind: "html" },
    );

    expect(
      offOrigin.find((finding) => finding.code === "canonical-off-origin")
        ?.severity,
    ).toBe("error");
    expect(
      mismatch.find((finding) => finding.code === "canonical-mismatch")
        ?.severity,
    ).toBe("warning");
  });

  it("tolerates a trailing slash difference in the canonical", () => {
    const findings = evaluateCrawlResponse(
      htmlResponse({
        body: bodyWith().replace(
          'href="https://codexcryptica.com/for/game-masters"',
          'href="https://codexcryptica.com/for/game-masters/"',
        ),
      }),
      { kind: "html" },
    );

    expect(findings).toEqual([]);
  });

  it("flags an empty shell response", () => {
    const findings = evaluateCrawlResponse(
      htmlResponse({ body: "<html></html>" }),
      { kind: "html" },
    );

    expect(findings.map((finding) => finding.code)).toContain("thin-content");
  });

  it("flags a client-rendered shell that has bytes but no crawlable content", () => {
    const findings = evaluateCrawlResponse(
      htmlResponse({
        body: `<head><link rel="icon" href="/favicon.png"></head><body><div id="app"></div><script>${"x".repeat(30000)}</script></body>`,
      }),
      { kind: "html" },
    );
    const codes = findings.map((finding) => finding.code);

    expect(codes).toContain("no-title");
    expect(codes).toContain("no-heading");
    expect(codes).not.toContain("thin-content");
  });

  it("skips HTML-only checks for text routes", () => {
    const findings = evaluateCrawlResponse(
      {
        requestedUrl: "https://codexcryptica.com/llms.txt",
        finalUrl: "https://codexcryptica.com/llms.txt",
        status: 200,
        headers: { "content-type": "text/plain" },
        body: "# Codex Cryptica",
      },
      { kind: "text" },
    );

    expect(findings).toEqual([]);
  });
});

describe("pickRepresentativeRoutes", () => {
  it("picks one path per discovery family", () => {
    const sitemap = `<urlset>
      <url><loc>https://codexcryptica.com/</loc></url>
      <url><loc>https://codexcryptica.com/for/game-masters</loc></url>
      <url><loc>https://codexcryptica.com/for/writers</loc></url>
      <url><loc>https://codexcryptica.com/answers/what-is-a-session-zero</loc></url>
      <url><loc>https://codexcryptica.com/blog/one</loc></url>
    </urlset>`;

    expect(pickRepresentativeRoutes(sitemap)).toEqual([
      "/",
      "/answers/what-is-a-session-zero",
      "/blog/one",
      "/for/game-masters",
    ]);
  });

  it("ignores malformed loc entries", () => {
    const routes = pickRepresentativeRoutes(
      "<url><loc>not-a-url</loc></url><url><loc>https://codexcryptica.com/vs/x</loc></url>",
    );

    expect(routes).toEqual(["/vs/x"]);
  });
});

describe("expectationFor", () => {
  it("treats text and XML routes as non-HTML", () => {
    expect(expectationFor("/llms.txt").kind).toBe("text");
    expect(expectationFor("/sitemap.xml").kind).toBe("text");
  });

  it("treats page routes as HTML", () => {
    expect(expectationFor("/").kind).toBe("html");
    expect(expectationFor("/vs/obsidian").kind).toBe("html");
  });
});

describe("downgradeKnownGaps", () => {
  const gaps = [
    { path: "/", code: "no-title", reason: "root is the client-rendered app" },
  ];

  it("downgrades a matching error to a warning and explains why", () => {
    const [finding] = downgradeKnownGaps(
      "/",
      [{ code: "no-title", severity: "error", message: "no <title>" }],
      gaps,
    );

    expect(finding.severity).toBe("warning");
    expect(finding.message).toContain("root is the client-rendered app");
  });

  it("leaves errors on other paths and other codes alone", () => {
    const findings = downgradeKnownGaps(
      "/for",
      [
        { code: "no-title", severity: "error", message: "no <title>" },
        { code: "challenge", severity: "error", message: "blocked" },
      ],
      gaps,
    );

    expect(findings.every((finding) => finding.severity === "error")).toBe(
      true,
    );
  });
});
