import { describe, expect, it } from "bun:test";
import { PROMPT_END_MARKER as GUIDE_END_MARKER } from "../apps/web/src/routes/(marketing)/adventure-import/conversion-guide.ts";
import {
  appShellProblems,
  canonicalEquivalence,
  CTA_HREF,
  discoveryProblems,
  guideProblems,
  jsonAssetProblems,
  promptContentTypeProblems,
  promptEndMarkerProblems,
  promptPageMatchProblems,
  promptTxtProblems,
  productionLinks,
  PROMPT_END_MARKER,
  redirectNotes,
  run,
} from "./adventure-import-link-check.mjs";

const ok = { status: 200, contentType: "application/json", body: "{}" };

describe("adventure import link check", () => {
  it("accepts a valid JSON asset", () => {
    expect(jsonAssetProblems("/a.json", ok)).toEqual([]);
  });

  it("flags 404, wrong content-type and invalid JSON", () => {
    expect(jsonAssetProblems("/a.json", { ...ok, status: 404 })).toHaveLength(
      1,
    );
    expect(
      jsonAssetProblems("/a.json", { ...ok, contentType: "text/html" }),
    ).toHaveLength(1);
    expect(
      jsonAssetProblems("/a.json", { ...ok, body: "<html>" }),
    ).toHaveLength(1);
  });

  it("requires the guide's asset links and import CTA", () => {
    const html = [
      "./schemas/adventure-json/v1.json",
      "./schemas/adventure-json/examples/minimal.v1.json",
      "./schemas/adventure-json/examples/reference-one-shot.v1.json",
      CTA_HREF,
    ]
      .map((h) => `<a href="${h}">x</a>`)
      .join("");
    const page = { status: 200, contentType: "text/html; charset=utf-8" };
    expect(guideProblems({ ...page, body: html })).toEqual([]);
    expect(guideProblems({ ...page, body: "<p>none</p>" })).toHaveLength(4);
  });

  it("extracts production links once and ignores unrelated URLs", () => {
    const body =
      "https://codexcryptica.com/adventure-import https://codexcryptica.com/adventure-import https://codexcryptica.com/schemas/adventure-json/v1.json https://codexcryptica.com/privacy";
    expect(productionLinks(body)).toEqual([
      "https://codexcryptica.com/adventure-import",
      "https://codexcryptica.com/schemas/adventure-json/v1.json",
    ]);
  });

  it("checks versioned prompt URLs when the base is production", async () => {
    const originalFetch = globalThis.fetch;
    const originalLog = console.log;
    const requested = [];
    const html = [
      "./schemas/adventure-json/v1.json",
      "./schemas/adventure-json/examples/minimal.v1.json",
      "./schemas/adventure-json/examples/reference-one-shot.v1.json",
      CTA_HREF,
      "https://codexcryptica.com/schemas/adventure-json/v2.json",
    ]
      .map((href) => `<a href="${href}">x</a>`)
      .join("");
    const responses = new Map([
      ["/adventure-import", { contentType: "text/html", body: html }],
      [
        "/schemas/adventure-json/v1.json",
        { contentType: "application/json", body: "{}" },
      ],
      [
        "/schemas/adventure/v1.json",
        { contentType: "application/json", body: "{}" },
      ],
      [
        "/schemas/adventure-json/examples/minimal.v1.json",
        { contentType: "application/json", body: "{}" },
      ],
      [
        "/schemas/adventure-json/examples/reference-one-shot.v1.json",
        { contentType: "application/json", body: "{}" },
      ],
      ["/schemas/adventure-json/v2.json", { status: 404, body: "{}" }],
      [
        "/adventure-import/prompt.txt",
        {
          contentType: "text/plain",
          body: "Convert the tabletop RPG adventure I provide.",
        },
      ],
      ["/adventure", { contentType: "text/html", body: "<html>app</html>" }],
      [
        "/llms.txt",
        {
          contentType: "text/plain",
          body: "https://codexcryptica.com/adventure-import",
        },
      ],
      [
        "/llms-full.txt",
        { contentType: "text/plain", body: "/adventure-import" },
      ],
    ]);

    globalThis.fetch = async (input) => {
      const url = new URL(String(input));
      requested.push(url.href);
      const {
        status = 200,
        contentType = "application/json",
        body,
      } = responses.get(url.pathname);
      return {
        status,
        headers: { get: () => contentType },
        text: async () => body,
      };
    };
    console.log = () => {};

    try {
      const result = await run({
        base: "https://codexcryptica.com",
        strictProduction: true,
      });
      expect(requested).toContain(
        "https://codexcryptica.com/schemas/adventure-json/v2.json",
      );
      expect(result.errors).toContain(
        "https://codexcryptica.com/schemas/adventure-json/v2.json: HTTP 404 on production; testers on https://codexcryptica.com are sent there by the guide's prompt",
      );
    } finally {
      globalThis.fetch = originalFetch;
      console.log = originalLog;
    }
  });

  it("does not judge app routes by HTTP status", () => {
    const shell = { contentType: "text/html", body: "<!doctype html><html>" };
    expect(appShellProblems("/adventure", shell)).toEqual([]);
    expect(
      appShellProblems("/adventure", { contentType: "text/plain", body: "" }),
    ).toHaveLength(1);
  });

  it("checks discovery entries", () => {
    expect(
      discoveryProblems(
        "https://codexcryptica.com/adventure-import",
        "see /adventure-import",
      ),
    ).toEqual([]);
    expect(discoveryProblems("", "")).toHaveLength(2);
  });
  it("accepts the plain-text prompt and rejects HTML or wrong content", () => {
    const good = {
      status: 200,
      contentType: "text/plain; charset=utf-8",
      body: "Convert the tabletop RPG adventure I provide.\nSchema: https://codexcryptica.com/schemas/adventure-json/v1.json",
    };
    expect(promptTxtProblems(good)).toEqual([]);
    expect(promptContentTypeProblems(good)).toEqual([]);
    expect(
      promptContentTypeProblems({ ...good, contentType: "text/html" }),
    ).toHaveLength(1);
    expect(promptTxtProblems({ ...good, contentType: "text/html" })).toEqual(
      [],
    );
    expect(
      promptTxtProblems({
        status: 404,
        contentType: "text/html",
        body: "<html>",
      }),
    ).toHaveLength(2);
  });

  it("includes prompt.txt among production links", () => {
    expect(
      productionLinks(
        "see https://codexcryptica.com/adventure-import/prompt.txt now",
      ),
    ).toEqual(["https://codexcryptica.com/adventure-import/prompt.txt"]);
  });

  it("keeps the script's end marker equal to the guide's", () => {
    expect(PROMPT_END_MARKER).toBe(GUIDE_END_MARKER);
  });

  it("accepts a body whose last non-empty line is the end marker", () => {
    expect(promptEndMarkerProblems(`x\n${PROMPT_END_MARKER}\n\n`)).toEqual([]);
  });

  it("flags a body without the end marker", () => {
    expect(promptEndMarkerProblems("x\nmore\n")).toHaveLength(1);
    expect(
      promptEndMarkerProblems(`${PROMPT_END_MARKER}\ntrailing`),
    ).toHaveLength(1);
  });

  it("matches the page prompt to prompt.txt, decoding entities", () => {
    const body = `a & b <c> "d" 'e' é é\n`;
    const html = `<pre id="canonical-prompt" class="x">a &amp; b &lt;c&gt; &quot;d&quot; &#39;e&#39; &#233; &#xE9;</pre>`;
    expect(promptPageMatchProblems(body, html)).toEqual([]);
  });

  it("reports a page prompt mismatch separately from a missing pre", () => {
    const mismatch = promptPageMatchProblems(
      "one\n",
      '<pre id="canonical-prompt">two</pre>',
    );
    const missing = promptPageMatchProblems("one\n", "<pre>one</pre>");
    expect(mismatch).toHaveLength(1);
    expect(missing).toHaveLength(1);
    expect(mismatch[0]).toContain("differs");
    expect(missing[0]).toContain("no <pre");
  });

  it("warns only when the final URL differs", () => {
    expect(redirectNotes("/a", "https://x/a", "https://x/a")).toEqual([]);
    const notes = redirectNotes("/a", "https://x/a", "https://y/a/");
    expect(notes).toHaveLength(1);
    expect(notes[0]).toContain("https://x/a");
    expect(notes[0]).toContain("https://y/a/");
  });

  it("verifies equivalent JSON, ignoring formatting, and exact prompt text", () => {
    const a = { status: 200, body: '{"a":1,"b":[2]}' };
    const b = { status: 200, body: '{ "b": [2], "a": 1 }' };
    expect(canonicalEquivalence("/s.json", a, b)).toEqual({
      note: "verified canonical equivalent: /s.json",
    });
    const t = { status: 200, body: "text\n" };
    expect(
      canonicalEquivalence("/adventure-import/prompt.txt", t, t).note,
    ).toContain("verified canonical equivalent");
  });

  it("reports different content and a production 404 as problems", () => {
    const base = { status: 200, body: '{"a":1}' };
    expect(
      canonicalEquivalence("/s.json", base, { status: 200, body: '{"a":2}' })
        .problem,
    ).toContain("differs from production");
    expect(
      canonicalEquivalence("/adventure-import/prompt.txt", base, {
        status: 200,
        body: '{"a":1}\n',
      }).problem,
    ).toContain("differs");
    expect(
      canonicalEquivalence("/s.json", base, { status: 404, body: "" }).problem,
    ).toContain("HTTP 404");
  });

  describe("run with mocked fetch", () => {
    const PROMPT = `Convert the tabletop RPG adventure I provide.\nSchema: https://codexcryptica.com/schemas/adventure-json/v1.json\n${PROMPT_END_MARKER}`;
    const guideHtml = [
      "./schemas/adventure-json/v1.json",
      "./schemas/adventure-json/examples/minimal.v1.json",
      "./schemas/adventure-json/examples/reference-one-shot.v1.json",
      CTA_HREF,
    ]
      .map((h) => `<a href="${h}">x</a>`)
      .join("")
      .concat(`<pre id="canonical-prompt">${PROMPT}</pre>`);
    const json = { contentType: "application/json", body: '{"a":1}' };
    const routes = (over = {}) => ({
      "/adventure-import": { contentType: "text/html", body: guideHtml },
      "/schemas/adventure-json/v1.json": json,
      "/schemas/adventure/v1.json": json,
      "/schemas/adventure-json/examples/minimal.v1.json": json,
      "/schemas/adventure-json/examples/reference-one-shot.v1.json": json,
      "/adventure-import/prompt.txt": {
        contentType: "text/plain; charset=utf-8",
        body: `${PROMPT}\n`,
      },
      "/adventure": { contentType: "text/html", body: "<html>" },
      "/llms.txt": {
        contentType: "text/plain",
        body: "https://codexcryptica.com/adventure-import",
      },
      "/llms-full.txt": {
        contentType: "text/plain",
        body: "/adventure-import",
      },
      ...over,
    });

    async function withFetch(table, options) {
      const originalFetch = globalThis.fetch;
      const originalLog = console.log;
      globalThis.fetch = async (input) => {
        const url = new URL(String(input));
        const entry = table(url);
        if (entry instanceof Error) throw entry;
        const {
          status = 200,
          contentType = "text/plain",
          body = "",
          url: final,
        } = entry;
        return {
          status,
          url: final ?? "",
          headers: { get: () => contentType },
          text: async () => body,
        };
      };
      console.log = () => {};
      try {
        return await run(options);
      } finally {
        globalThis.fetch = originalFetch;
        console.log = originalLog;
      }
    }

    const STAGING = "https://staging.codexcryptica.com";
    const sameForAll = (table) => (url) =>
      table[url.pathname] ?? { status: 404 };

    it("passes cleanly and verifies equivalence on a non-production base", async () => {
      const result = await withFetch(sameForAll(routes()), {
        base: STAGING,
        strictProduction: true,
      });
      expect(result.errors).toEqual([]);
      expect(result.warnings).toEqual([]);
      expect(result.notes).toContain(
        "verified canonical equivalent: /adventure-import/prompt.txt",
      );
      expect(result.notes).toContain(
        "verified canonical equivalent: /schemas/adventure-json/v1.json",
      );
    });

    it("reports a text/html prompt.txt as a content-type problem only", async () => {
      const table = routes({
        "/adventure-import/prompt.txt": {
          contentType: "text/html",
          body: `${PROMPT}\n`,
        },
      });
      const result = await withFetch(sameForAll(table), {
        base: "https://codexcryptica.com",
        strictProduction: false,
      });
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("content-type");
    });

    it("reports a missing end marker as an end-marker problem only", async () => {
      const body =
        "Convert the tabletop RPG adventure I provide.\nSchema: https://codexcryptica.com/schemas/adventure-json/v1.json\n";
      const table = routes({
        "/adventure-import": {
          contentType: "text/html",
          body: guideHtml.replace(
            /<pre[\s\S]*<\/pre>/,
            `<pre id="canonical-prompt">${body.trimEnd()}</pre>`,
          ),
        },
        "/adventure-import/prompt.txt": { contentType: "text/plain", body },
      });
      const result = await withFetch(sameForAll(table), {
        base: "https://codexcryptica.com",
        strictProduction: false,
      });
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("end marker");
    });

    it("warns about a redirect to a different final URL", async () => {
      const table = routes({
        "/schemas/adventure/v1.json": {
          ...json,
          url: "https://cdn.example/v1.json",
        },
      });
      const result = await withFetch(sameForAll(table), {
        base: "https://codexcryptica.com",
        strictProduction: false,
      });
      expect(result.errors).toEqual([]);
      expect(result.warnings.join("\n")).toContain(
        "https://cdn.example/v1.json",
      );
    });

    it("warns on a production 404 by default and errors when strict", async () => {
      const table = routes();
      const handler = (url) =>
        url.hostname === "codexcryptica.com" &&
        url.pathname === "/schemas/adventure-json/v1.json"
          ? { status: 404 }
          : (table[url.pathname] ?? { status: 404 });
      const lax = await withFetch(handler, {
        base: STAGING,
        strictProduction: false,
      });
      expect(lax.errors).toEqual([]);
      expect(lax.warnings.join("\n")).toContain("HTTP 404");
      const strict = await withFetch(handler, {
        base: STAGING,
        strictProduction: true,
      });
      expect(strict.errors.join("\n")).toContain("HTTP 404");
    });

    it("warns on differing production content by default", async () => {
      const table = routes();
      const handler = (url) =>
        url.hostname === "codexcryptica.com" &&
        url.pathname === "/schemas/adventure/v1.json"
          ? { ...json, body: '{"a":2}' }
          : (table[url.pathname] ?? { status: 404 });
      const result = await withFetch(handler, {
        base: STAGING,
        strictProduction: false,
      });
      expect(result.errors).toEqual([]);
      expect(result.warnings.join("\n")).toContain("differs from production");
    });

    it("records a thrown fetch for one URL and keeps checking the rest", async () => {
      const table = routes();
      const handler = (url) =>
        url.pathname === "/schemas/adventure/v1.json"
          ? new Error("timeout")
          : (table[url.pathname] ?? { status: 404 });
      const result = await withFetch(handler, {
        base: "https://codexcryptica.com",
        strictProduction: false,
      });
      expect(result.errors).toEqual([
        "https://codexcryptica.com/schemas/adventure/v1.json: fetch failed (timeout)",
      ]);
      expect(result.notes).toContain(
        "/adventure-import/prompt.txt: ends with the end marker",
      );
    });
  });
});
