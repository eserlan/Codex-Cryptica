import { describe, expect, test, mock } from "bun:test";
import {
  extractMetaContent,
  extractCanonicalUrl,
  extractH1,
  extractImages,
  extractLinks,
  normalizeInternalLink,
  checkAssetUrl,
  fetchWithRetry,
  verifyRenderedHtml,
  verifyRenderedAnswer,
} from "./verify-rendered-answer";
import type { AnswerConfig } from "../apps/web/src/lib/content/answers/schema";

const mockAnswer: AnswerConfig = {
  slug: "test-answer-slug",
  category: "session-prep",
  question: "How do you test an answer page?",
  kind: "how-to",
  shortAnswer:
    "Testing an answer page requires verifying content, SEO tags and assets.",
  sections: [
    {
      kind: "prose",
      heading: "Overview",
      paragraphs: ["This is a test paragraph."],
    },
    {
      kind: "table",
      heading: "Comparison",
      headers: ["Role", "Duty"],
      rows: [["Tester", "Verify"]],
    },
    {
      kind: "checklist",
      heading: "Checklist",
      items: ["Check H1", "Check links"],
    },
  ],
  relatedAnswers: [],
  relatedTopics: [
    {
      title: "D&D Beginners",
      url: "/topics/dnd-beginners",
      description: "Beginner hub",
    },
  ],
  relatedTools: [],
  relatedForPages: [],
  labels: [],
  publishedAt: "2026-10-12",
  seo: {
    title: "How to test an answer page",
    description: "A comprehensive guide to verifying answer pages.",
    canonical: "https://codexcryptica.com/answers/test-answer-slug",
    image: "https://assets.codexcryptica.com/og/test-answer-slug.jpg",
    imageAlt: "A group of players around a tabletop game board",
  },
};

const validHtml = `
<!doctype html>
<html>
<head>
  <title>How to test an answer page</title>
  <link rel="canonical" href="https://codexcryptica.com/answers/test-answer-slug" />
  <meta property="og:title" content="How to test an answer page" />
  <meta property="og:description" content="A comprehensive guide to verifying answer pages." />
  <meta property="og:image" content="https://assets.codexcryptica.com/og/test-answer-slug.jpg" />
  <meta name="description" content="A comprehensive guide to verifying answer pages." />
</head>
<body>
  <h1>How do you test an answer page?</h1>
  <p class="lead">Testing an answer page requires verifying content, SEO tags and assets before promotion.</p>
  <h2>Overview</h2>
  <p>This is a test paragraph.</p>
  <h2>Comparison</h2>
  <table>
    <thead><tr><th>Role</th><th>Duty</th></tr></thead>
    <tbody><tr><td>Tester</td><td>Verify</td></tr></tbody>
  </table>
  <h2>Checklist</h2>
  <ul>
    <li>Check H1</li>
    <li>Check links</li>
  </ul>
  <img src="https://assets.codexcryptica.com/og/test-answer-slug.jpg" alt="A group of players around a tabletop game board" />
  <a href="../topics/dnd-beginners">D&D Beginners</a>
  <a href="../answers/what-is-a-point-crawl">Point Crawl</a>
</body>
</html>
`;

describe("verify-rendered-answer HTML extractors", () => {
  test("extractMetaContent retrieves property and name meta tags", () => {
    expect(extractMetaContent(validHtml, "og:title")).toBe(
      "How to test an answer page",
    );
    expect(extractMetaContent(validHtml, "description")).toBe(
      "A comprehensive guide to verifying answer pages.",
    );
    expect(extractMetaContent(validHtml, "non-existent")).toBeNull();
  });

  test("extractCanonicalUrl extracts canonical link href", () => {
    expect(extractCanonicalUrl(validHtml)).toBe(
      "https://codexcryptica.com/answers/test-answer-slug",
    );
    expect(extractCanonicalUrl("<html><head></head></html>")).toBeNull();
  });

  test("extractH1 extracts text content of h1", () => {
    expect(extractH1(validHtml)).toBe("How do you test an answer page?");
    expect(extractH1("<h1>Title with <span>nested</span> span</h1>")).toBe(
      "Title with nested span",
    );
    expect(extractH1("<p>No H1 here</p>")).toBeNull();
  });

  test("extractImages extracts all image tags and alt attributes", () => {
    const images = extractImages(validHtml);
    expect(images.length).toBe(1);
    expect(images[0].src).toBe(
      "https://assets.codexcryptica.com/og/test-answer-slug.jpg",
    );
    expect(images[0].alt).toBe(
      "A group of players around a tabletop game board",
    );
  });

  test("extractLinks extracts all href attributes", () => {
    const links = extractLinks(validHtml);
    expect(links).toContain("../topics/dnd-beginners");
    expect(links).toContain("../answers/what-is-a-point-crawl");
  });

  test("normalizeInternalLink converts relative answers links to absolute app paths", () => {
    expect(normalizeInternalLink("../answers/point-crawl")).toBe(
      "/answers/point-crawl",
    );
    expect(normalizeInternalLink("../topics/dnd-beginners")).toBe(
      "/topics/dnd-beginners",
    );
    expect(
      normalizeInternalLink("https://codexcryptica.com/answers/point-crawl"),
    ).toBe("/answers/point-crawl");
    expect(normalizeInternalLink("https://external.com/path")).toBe(
      "https://external.com/path",
    );
  });
});

describe("checkAssetUrl", () => {
  test("returns ok when HEAD request returns 200", async () => {
    const mockFetch = mock(async () => new Response(null, { status: 200 }));
    const result = await checkAssetUrl(
      "https://assets.codexcryptica.com/og/test.jpg",
      mockFetch as any,
    );
    expect(result.ok).toBe(true);
    expect(result.status).toBe(200);
  });

  test("retries with GET when HEAD returns 405", async () => {
    let callCount = 0;
    const mockFetch = mock(async (_url: any, init: any) => {
      callCount++;
      if (init.method === "HEAD") {
        return new Response(null, { status: 405 });
      }
      return new Response("image-bytes", { status: 200 });
    });

    const result = await checkAssetUrl(
      "https://assets.codexcryptica.com/og/test.jpg",
      mockFetch as any,
    );
    expect(result.ok).toBe(true);
    expect(result.status).toBe(200);
    expect(callCount).toBe(2);
  });

  test("returns false when asset returns 404", async () => {
    const mockFetch = mock(async () => new Response(null, { status: 404 }));
    const result = await checkAssetUrl(
      "https://assets.codexcryptica.com/og/missing.jpg",
      mockFetch as any,
    );
    expect(result.ok).toBe(false);
    expect(result.status).toBe(404);
  });
});

describe("fetchWithRetry", () => {
  test("returns immediately when first attempt returns 200", async () => {
    const mockFetch = mock(
      async () => new Response("<html>200</html>", { status: 200 }),
    );
    const res = await fetchWithRetry("https://preview.pages.dev/answers/test", {
      timeoutMs: 1000,
      retryIntervalMs: 50,
      fetchFn: mockFetch as any,
    });
    expect(res.ok).toBe(true);
    expect(res.status).toBe(200);
    expect(res.attempts).toBe(1);
    expect(res.html).toBe("<html>200</html>");
  });

  test("retries across 404s until 200 arrives", async () => {
    let attempt = 0;
    const mockFetch = mock(async () => {
      attempt++;
      if (attempt < 3) {
        return new Response("Not found yet", { status: 404 });
      }
      return new Response("<html>Live!</html>", { status: 200 });
    });

    const res = await fetchWithRetry("https://preview.pages.dev/answers/test", {
      timeoutMs: 2000,
      retryIntervalMs: 50,
      fetchFn: mockFetch as any,
    });
    expect(res.ok).toBe(true);
    expect(res.status).toBe(200);
    expect(res.attempts).toBe(3);
    expect(res.html).toBe("<html>Live!</html>");
  });

  test("times out cleanly when preview is never ready", async () => {
    const mockFetch = mock(
      async () => new Response("Still 404", { status: 404 }),
    );
    const res = await fetchWithRetry("https://preview.pages.dev/answers/test", {
      timeoutMs: 150,
      retryIntervalMs: 50,
      fetchFn: mockFetch as any,
    });
    expect(res.ok).toBe(false);
    expect(res.status).toBe(404);
    expect(res.attempts).toBeGreaterThanOrEqual(2);
  });
});

describe("verifyRenderedHtml", () => {
  test("returns clean checks on matching HTML and live assets", async () => {
    const mockFetch = mock(async () => new Response(null, { status: 200 }));
    const result = await verifyRenderedHtml(
      validHtml,
      mockAnswer,
      "https://preview.pages.dev",
      {
        fetchFn: mockFetch as any,
      },
    );

    expect(result.checks.reachable).toBe(true);
    expect(result.checks.h1).toBe(true);
    expect(result.checks.shortAnswer).toBe(true);
    expect(result.checks.sections).toBe(true);
    expect(result.checks.canonical).toBe(true);
    expect(result.checks.metadata).toBe(true);
    expect(result.checks.images.valid).toBe(1);
    expect(result.checks.internalLinks.valid).toBe(2);
    expect(result.findings.length).toBe(0);
  });

  test("flags mismatched H1", async () => {
    const badHtml = validHtml.replace(
      "<h1>How do you test an answer page?</h1>",
      "<h1>Completely different heading</h1>",
    );
    const mockFetch = mock(async () => new Response(null, { status: 200 }));
    const result = await verifyRenderedHtml(
      badHtml,
      mockAnswer,
      "https://preview.pages.dev",
      {
        fetchFn: mockFetch as any,
      },
    );

    expect(result.checks.h1).toBe(false);
    expect(result.findings.some((f) => f.includes("H1 mismatch"))).toBe(true);
  });

  test("flags missing canonical URL", async () => {
    const badHtml = validHtml.replace(/<link rel="canonical"[^>]*\/>/, "");
    const mockFetch = mock(async () => new Response(null, { status: 200 }));
    const result = await verifyRenderedHtml(
      badHtml,
      mockAnswer,
      "https://preview.pages.dev",
      {
        fetchFn: mockFetch as any,
      },
    );

    expect(result.checks.canonical).toBe(false);
    expect(
      result.findings.some((f) => f.includes("Canonical URL mismatch")),
    ).toBe(true);
  });

  test("flags broken 404 remote image asset", async () => {
    const mockFetch = mock(async (url: any) => {
      if (typeof url === "string" && url.includes("assets.codexcryptica.com")) {
        return new Response(null, { status: 404 });
      }
      return new Response(null, { status: 200 });
    });

    const result = await verifyRenderedHtml(
      validHtml,
      mockAnswer,
      "https://preview.pages.dev",
      {
        fetchFn: mockFetch as any,
      },
    );

    expect(result.checks.images.valid).toBe(0);
    expect(result.findings.some((f) => f.includes("HTTP 404"))).toBe(true);
  });

  test("flags broken internal answer link", async () => {
    const badHtml = validHtml.replace(
      "../answers/what-is-a-point-crawl",
      "../answers/non-existent-answer-slug-xyz",
    );
    const mockFetch = mock(async () => new Response(null, { status: 200 }));
    const result = await verifyRenderedHtml(
      badHtml,
      mockAnswer,
      "https://preview.pages.dev",
      {
        fetchFn: mockFetch as any,
      },
    );

    expect(
      result.findings.some((f) => f.includes("non-existent-answer-slug-xyz")),
    ).toBe(true);
  });

  test("flags missing required related topic link", async () => {
    const badHtml = validHtml.replace(
      "../topics/dnd-beginners",
      "../some-other-link",
    );
    const mockFetch = mock(async () => new Response(null, { status: 200 }));
    const result = await verifyRenderedHtml(
      badHtml,
      mockAnswer,
      "https://preview.pages.dev",
      {
        fetchFn: mockFetch as any,
      },
    );

    expect(
      result.findings.some((f) => f.includes("Required related topic link")),
    ).toBe(true);
  });

  test("flags artifact commit mismatch when expectedCommit is not present", async () => {
    const mockFetch = mock(async () => new Response(null, { status: 200 }));
    const result = await verifyRenderedHtml(
      validHtml,
      mockAnswer,
      "https://preview.pages.dev",
      {
        expectedCommit: "c0ffee1234567890",
        fetchFn: mockFetch as any,
      },
    );

    expect(result.checks.commitMatch).toBe(false);
    expect(
      result.findings.some((f) => f.includes("Artifact commit mismatch")),
    ).toBe(true);
  });
});

describe("verifyRenderedAnswer end-to-end integration", () => {
  test("returns unverified when slug does not exist in registry", async () => {
    const result = await verifyRenderedAnswer("unknown-slug-not-in-db", {});
    expect(result.status).toBe("unverified");
    expect(result.deploymentReady).toBe(false);
    expect(result.findings[0]).toContain("not registered");
  });

  test("returns clean for registered answer when deployment is verified", async () => {
    const htmlWithRealAnswer = `
<!doctype html>
<html>
<head>
  <link rel="canonical" href="https://codexcryptica.com/answers/what-is-a-point-crawl" />
  <meta property="og:title" content="What is a point crawl?" />
  <meta property="og:description" content="Guide to point crawls" />
  <meta property="og:image" content="https://assets.codexcryptica.com/og/what-is-a-point-crawl.jpg" />
  <meta name="description" content="Guide to point crawls" />
</head>
<body>
  <h1>What is a point crawl?</h1>
  <p>A point crawl is a way of mapping an adventure area as a set of named locations joined by explicit routes, rather than as a grid of hexes or squares.</p>
  <h2>Why nodes instead of hexes</h2>
  <h2>What a point crawl is made of</h2>
  <h2>A worked example: the Saltmere fens</h2>
  <h2>When not to use a point crawl</h2>
  <h2>Where point crawls struggle</h2>
  <h2>Before you run it</h2>
  <ul>
    <li>Prep points</li>
    <li>Draw connections</li>
  </ul>
  <a href="../for/fantasy-worldbuilding">Fantasy Worldbuilding</a>
</body>
</html>
`;
    const mockFetch = mock(
      async () => new Response(htmlWithRealAnswer, { status: 200 }),
    );
    const result = await verifyRenderedAnswer("what-is-a-point-crawl", {
      fetchFn: mockFetch as any,
    });

    expect(result.status).toBe("clean");
    expect(result.deploymentReady).toBe(true);
    expect(result.checks.h1).toBe(true);
    expect(result.checks.shortAnswer).toBe(true);
  });
});
