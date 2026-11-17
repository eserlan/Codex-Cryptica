import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/svelte";
import { AdventureJsonV1Schema } from "@codex/adventure-engine";
import Page from "./+page.svelte";
import {
  CANONICAL_CONVERSION_PROMPT,
  CORRESPONDENCE_EXTENSION_DOC,
  COVERAGE_REPORT_PROMPT,
  LINK_HANDOFF_TEXT,
} from "./conversion-guide.js";

const copyMock = vi.fn<(...args: unknown[]) => Promise<boolean>>();

vi.mock("$app/paths", () => ({
  base: "",
  asset: (p: string) => p,
  resolve: (p: string) => p,
}));

vi.mock("#lib/utils/share-link.js", async () => {
  const actual = await vi.importActual<
    typeof import("#lib/utils/share-link.js")
  >("#lib/utils/share-link.js");
  return {
    ...actual,
    copyTextToClipboard: (...args: unknown[]) => copyMock(...args),
  };
});

describe("Adventure JSON Conversion Guide (/adventure-import)", () => {
  afterEach(() => {
    vi.useRealTimers();
    document.head.innerHTML = "";
    copyMock.mockReset();
  });

  it("renders H1, canonical prompt, source certainty rules, privacy notice, and schema links", () => {
    render(Page);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /Adventure JSON Conversion Guide/i,
      }),
    ).toBeTruthy();

    expect(
      screen.getByText(
        /Give your AI assistant this page and the adventure you legally have access to\./i,
      ),
    ).toBeTruthy();

    expect(
      screen.getAllByText(
        /Do not invent missing facts merely to fill fields\./i,
      ).length,
    ).toBeGreaterThanOrEqual(2);

    expect(
      screen.getByText(
        /Codex Cryptica never receives or uploads your source document/i,
      ),
    ).toBeTruthy();

    const schemaLink = screen.getByRole("link", {
      name: /JSON Schema \(v1\.json\)/i,
    });
    expect(schemaLink.getAttribute("href")).toBe(
      "/schemas/adventure-json/v1.json",
    );

    const minimalLink = screen.getByRole("link", {
      name: /Minimal Example/i,
    });
    expect(minimalLink.getAttribute("href")).toBe(
      "/schemas/adventure-json/examples/minimal.v1.json",
    );

    const referenceLink = screen.getByRole("link", {
      name: /Reference One-Shot Example/i,
    });
    expect(referenceLink.getAttribute("href")).toBe(
      "/schemas/adventure-json/examples/reference-one-shot.v1.json",
    );
  });

  it("shows the optional correspondence extension format for renamed content", () => {
    render(Page);

    expect(
      screen.getByRole("heading", {
        name: /Correspondence for renamed content/i,
      }),
    ).toBeTruthy();
    expect(
      screen.getByText(/extensions.*codex-cryptica\.adventure-correspondence/s),
    ).toBeTruthy();
    expect(
      screen.getByText(/Splits and merges are shown grouped/),
    ).toBeTruthy();
    expect(CORRESPONDENCE_EXTENSION_DOC).toContain('"previousId": string');
  });

  it("explains the post-conversion upload and links directly to its import area", () => {
    render(Page);

    expect(
      screen.getByText(/There is no paste box on this guide/),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", {
        name: "Next: upload your Adventure JSON",
      }),
    ).toBeTruthy();
    expect(
      screen.getByText(/For an unresolved item, use "ambiguous"/),
    ).toBeTruthy();

    const importLink = screen.getByRole("link", {
      name: /Go to Adventure JSON import/i,
    });
    expect(importLink.getAttribute("href")).toBe(
      "/adventure#import-adventure-json",
    );
  });

  it("leads with a task-first quick start, in order, before the prompt and field tables", () => {
    const { container } = render(Page);

    const headings = [...container.querySelectorAll("h2")].map(
      (h) => h.textContent?.trim() ?? "",
    );
    const quick = headings.findIndex((h) => /^Quick start/.test(h));
    expect(quick).toBe(0);
    expect(quick).toBeLessThan(headings.indexOf("Canonical Conversion Prompt"));
    expect(quick).toBeLessThan(headings.indexOf("Field-by-Field Structure"));

    const steps = [
      ...container
        .querySelector("#quick-start-heading")!
        .closest("section")!
        .querySelectorAll("ol > li > strong:first-child"),
    ].map((el) => el.textContent?.trim());
    expect(steps).toEqual([
      "Copy the prompt.",
      "Paste it and attach your adventure",
      "Save the reply as a plain .json file.",
      "Import it in your Vault.",
      "Review, approve, then start.",
    ]);
  });

  it("says the guide is not a converter and stays model-agnostic", () => {
    const { container } = render(Page);
    const quick = container
      .querySelector("#quick-start-heading")!
      .closest("section")!;

    expect(quick.textContent).toContain(
      "This page is a guide, not a converter.",
    );
    expect(quick.textContent).toContain("no Markdown code fences");
    expect(quick.textContent).not.toMatch(/\b(ChatGPT|Claude|Gemini)\b/);
  });

  it("links the quick start to import and troubleshooting anchors that exist", () => {
    const { container } = render(Page);

    for (const id of [
      "import-adventure-json-heading",
      "troubleshooting-heading",
      "prompt-heading",
    ]) {
      expect(container.querySelector(`a[href="#${id}"]`)).toBeTruthy();
      expect(container.querySelector(`#${id}`)).toBeTruthy();
    }
  });

  it("shows a minimal example that is the schema-valid published file", () => {
    const { container } = render(Page);
    const example = container.querySelector(
      'pre[aria-label="Minimal Adventure JSON v1 example"]',
    )!;

    expect(example.getAttribute("tabindex")).toBe("0");
    const parsed = JSON.parse(example.textContent ?? "");
    expect(parsed.formatVersion).toBe("adventure-json/v1");
    expect(AdventureJsonV1Schema.safeParse(parsed).success).toBe(true);
  });

  it("copies a short link instruction for browsing assistants, separately from the prompt", async () => {
    copyMock.mockResolvedValue(true);
    render(Page);

    await fireEvent.click(
      screen.getByRole("button", { name: /Copy guide link/i }),
    );

    expect(copyMock).toHaveBeenCalledTimes(1);
    expect(copyMock.mock.calls[0]?.[0]).toBe(LINK_HANDOFF_TEXT);
    expect(LINK_HANDOFF_TEXT).toContain(
      "https://codexcryptica.com/adventure-import/prompt.txt",
    );
    expect(LINK_HANDOFF_TEXT).toContain("Reply with the JSON only");
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Copied link/i })).toBeTruthy();
    });
    expect(
      screen.getAllByRole("button", { name: /Copy conversion prompt/i }),
    ).toHaveLength(2);
  });

  it("reports a failed link copy without affecting the prompt button", async () => {
    copyMock.mockResolvedValue(false);
    render(Page);

    await fireEvent.click(
      screen.getByRole("button", { name: /Copy guide link/i }),
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", {
          name: /Copy failed — copy the page address/i,
        }),
      ).toBeTruthy();
    });
    expect(
      screen.getAllByRole("button", { name: /Copy conversion prompt/i }),
    ).toHaveLength(2);
  });

  it("explains that the link shortcut needs a browsing-capable assistant", () => {
    const { container } = render(Page);
    expect(container.textContent).toContain(
      "only works if your assistant can open web pages",
    );
    expect(
      container.querySelector('a[href$="/adventure-import/prompt.txt"]'),
    ).toBeTruthy();
  });

  it("keeps both copy buttons in step on a failed copy", async () => {
    copyMock.mockResolvedValue(false);
    render(Page);

    await fireEvent.click(
      screen.getAllByRole("button", { name: /Copy conversion prompt/i })[1]!,
    );

    await waitFor(() => {
      expect(
        screen.getAllByRole("button", { name: /Copy failed/i }),
      ).toHaveLength(2);
    });
  });

  it("states that visibility covers the whole record, in the page and the copied prompt", () => {
    render(Page);

    expect(screen.getByText(/single fields/)).toBeTruthy();
    expect(
      screen.getByText(
        /title, hook, background and optional description player-safe/,
      ),
    ).toBeTruthy();
    expect(CANONICAL_CONVERSION_PROMPT).toContain(
      "Keep the title, hook, background, and optional description player-safe and limited to source-supported facts",
    );
    expect(CANONICAL_CONVERSION_PROMPT).toContain(
      '"visibility" applies to the WHOLE record, never to individual fields',
    );
    expect(CANONICAL_CONVERSION_PROMPT).toContain(
      'separate "secrets" entry that lists the record in "relatedEntityIds"',
    );
  });

  it("includes the offline collection contract in the displayed and copied prompt", () => {
    const { container } = render(Page);
    const prompt = container.querySelector("pre")?.textContent;
    expect(prompt).toBe(CANONICAL_CONVERSION_PROMPT);

    for (const rule of [
      'Every collection entry requires "id" (non-empty string) and "epistemicStatus"',
      "locations: required name, summary, visibility",
      "actors: required name, summary, visibility",
      "factions: required name, summary, visibility",
      "scenes: required title, summary, visibility",
      "encounters: required description, alternativeSolutions (an array, [] if absent), visibility",
      "clues: required text, visibility",
      'rumours: required text, truth ("true" | "false" | "partially-true" | "unverified", all strings), visibility',
      "items: required name, summary, visibility",
      'secrets: required text, visibility ("gm-only" only)',
      "endings: required description; optional title: string, conditions: string[]; visibility is not allowed",
      'unresolved: required code, message; optional relatedEntityId: string, context: string; epistemicStatus is "ambiguous" | "unresolved" only; visibility is not allowed',
      "SceneBranch: required targetSceneId: string, description: string",
      "LocationConnection: required targetLocationId: string",
      "Each alternativeSolutions entry requires method: non-empty string and description: non-empty string; optional socialBypassOfCombat: boolean",
      "Do not emit properties absent from the strict schema",
      "Do not add visibility to endings or unresolved",
    ]) {
      expect(prompt).toContain(rule);
    }
    expect(prompt).not.toContain('   - Use "visibility":');
    expect(prompt).toContain(
      "Every non-entry scene with source-supported progression must be reachable",
    );
    expect(prompt).toContain(
      "If progression is unknown, preserve the scene as ambiguous without inventing a branch.",
    );
    expect(
      screen.getByText(
        /If the source does not establish progression, preserve the scene as ambiguous and do not invent a branch\./,
      ),
    ).toBeTruthy();
  });

  it("copies the canonical conversion prompt via copyTextToClipboard and shows feedback", async () => {
    copyMock.mockResolvedValue(true);
    render(Page);

    const copyButton = screen.getAllByRole("button", {
      name: /Copy conversion prompt/i,
    })[0]!;
    await fireEvent.click(copyButton);

    expect(copyMock).toHaveBeenCalledTimes(1);
    expect(copyMock.mock.calls[0]?.[0]).toBe(CANONICAL_CONVERSION_PROMPT);

    await waitFor(() => {
      expect(
        screen.getAllByRole("button", { name: /Copied prompt/i })[0]!,
      ).toBeTruthy();
    });
  });

  it("shows fallback feedback if clipboard copy fails", async () => {
    copyMock.mockResolvedValue(false);
    render(Page);

    const copyButton = screen.getAllByRole("button", {
      name: /Copy conversion prompt/i,
    })[0]!;
    await fireEvent.click(copyButton);

    await waitFor(() => {
      expect(
        screen.getAllByRole("button", { name: /Copy failed/i })[0]!,
      ).toBeTruthy();
    });
  });

  it("ignores stale copy feedback when a newer copy finishes first", async () => {
    let resolveFirst!: (copied: boolean) => void;
    let resolveSecond!: (copied: boolean) => void;
    copyMock
      .mockImplementationOnce(
        () => new Promise((resolve) => (resolveFirst = resolve)),
      )
      .mockImplementationOnce(
        () => new Promise((resolve) => (resolveSecond = resolve)),
      );
    render(Page);

    const copyButton = screen.getAllByRole("button", {
      name: /Copy conversion prompt/i,
    })[0]!;
    await fireEvent.click(copyButton);
    await fireEvent.click(copyButton);

    resolveSecond(true);
    await waitFor(() => {
      expect(
        screen.getAllByRole("button", { name: /Copied prompt/i })[0]!,
      ).toBeTruthy();
    });

    resolveFirst(false);
    await Promise.resolve();
    expect(
      screen.getAllByRole("button", { name: /Copied prompt/i })[0]!,
    ).toBeTruthy();
  });

  it("does not schedule feedback timers when a pending copy resolves after teardown", async () => {
    let resolveCopy!: (copied: boolean) => void;
    copyMock.mockImplementationOnce(
      () => new Promise((resolve) => (resolveCopy = resolve)),
    );
    vi.useFakeTimers();
    const { unmount } = render(Page);

    await fireEvent.click(
      screen.getAllByRole("button", { name: /Copy conversion prompt/i })[0]!,
    );
    unmount();
    resolveCopy(true);
    await Promise.resolve();
    await Promise.resolve();

    expect(vi.getTimerCount()).toBe(0);
    vi.useRealTimers();
  });

  it("injects a breadcrumb JSON-LD schema and renders without an internal header", () => {
    const { container } = render(Page);

    expect(container.querySelector("header")).toBeNull();
    const scripts = document.querySelectorAll(
      'script[type="application/ld+json"]',
    );
    let found = false;
    scripts.forEach((script) => {
      try {
        const json = JSON.parse(script.innerHTML);
        if (json["@type"] === "BreadcrumbList") {
          found = true;
          expect(json.itemListElement).toHaveLength(2);
        }
      } catch {
        // ignore
      }
    });
    expect(found).toBe(true);
  });
  describe("completeness self-audit", () => {
    const norm = (t: string | null | undefined) =>
      (t ?? "").replace(/\s+/g, " ").trim();

    it("renders the completeness section after the import section, with Quick start still first", () => {
      const { container } = render(Page);
      const h2s = [...container.querySelectorAll("h2")];
      expect(norm(h2s[0]?.textContent)).toMatch(/^Quick start/);
      const texts = h2s.map((h) => norm(h.textContent));
      const idx = texts.indexOf("Valid is not the same as complete");
      expect(idx).toBeGreaterThan(-1);
      expect(texts[idx - 1]).toBe("Next: upload your Adventure JSON");
      expect(texts[idx + 1]).toBe("What a valid file looks like");
      expect(h2s[idx]?.id).toBe("completeness-heading");
    });

    it("lists the three outcomes and the verbatim limit sentence", () => {
      const { container } = render(Page);
      const section = container.querySelector(
        '[aria-labelledby="completeness-heading"]',
      );
      const text = norm(section?.textContent);
      expect(text).toContain("(a) Valid JSON");
      expect(text).toContain("(b) Importable package");
      expect(text).toContain("(c) Faithful, reasonably complete adaptation");
      expect(text).toContain(
        "Codex Cryptica checks only (a) and (b). It never sees your source, so a successful import does not prove that nothing was left out or changed.",
      );
    });

    it("adds rule 8 to the canonical prompt without changing rule 1", () => {
      expect(CANONICAL_CONVERSION_PROMPT).toContain(
        "8. Self-audit before returning",
      );
      expect(CANONICAL_CONVERSION_PROMPT).toContain("Return ONLY valid JSON");
    });

    it("shows the coverage prompt after the canonical prompt, with four list headings", () => {
      const { container } = render(Page);
      const pres = [...container.querySelectorAll("pre")];
      const coverage = container.querySelector(
        'pre[aria-label="Coverage report prompt"]',
      ) as HTMLElement;
      expect(coverage.getAttribute("tabindex")).toBe("0");
      expect(coverage.textContent).toBe(COVERAGE_REPORT_PROMPT);
      expect(pres.indexOf(coverage)).toBeGreaterThan(0);
      expect(pres[0]?.textContent).toBe(CANONICAL_CONVERSION_PROMPT);
      for (const heading of [
        "Covered sections",
        "Missing or shortened",
        "Risky inferences",
        "Left unresolved",
      ]) {
        expect(COVERAGE_REPORT_PROMPT).toContain(heading);
      }
    });

    it("copies the coverage prompt with its own feedback", async () => {
      copyMock.mockResolvedValue(true);
      render(Page);
      await fireEvent.click(
        screen.getByRole("button", { name: /Copy coverage report prompt/i }),
      );
      expect(copyMock.mock.calls[0]?.[0]).toBe(COVERAGE_REPORT_PROMPT);
      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /Copied coverage prompt/i }),
        ).toBeTruthy();
      });
      expect(
        screen.getAllByRole("button", { name: /Copy conversion prompt/i }),
      ).toHaveLength(2);
    });

    it("reports a failed coverage copy without touching the other buttons", async () => {
      copyMock.mockResolvedValue(false);
      render(Page);
      await fireEvent.click(
        screen.getByRole("button", { name: /Copy coverage report prompt/i }),
      );
      await waitFor(() => {
        expect(
          screen.getAllByRole("button", { name: /Copy failed/i }),
        ).toHaveLength(1);
      });
      expect(
        screen.getAllByRole("button", { name: /Copy conversion prompt/i }),
      ).toHaveLength(2);
      expect(
        screen.getByRole("button", { name: /Copy guide link/i }),
      ).toBeTruthy();
    });

    it("names the three omissions in the worked example", () => {
      const { container } = render(Page);
      const text = norm(
        container.querySelector('[aria-labelledby="completeness-heading"]')
          ?.textContent,
      );
      expect(text).toContain("Reed Shrine");
      expect(text).toContain("The Water Takes It");
      expect(text).toContain("Wick");
    });

    it("points from the quick start to an existing completeness section", () => {
      const { container } = render(Page);
      const link = container.querySelector(
        '[aria-labelledby="quick-start-heading"] a[href="#completeness-heading"]',
      );
      expect(link).toBeTruthy();
      expect(container.querySelector("#completeness-heading")).toBeTruthy();
    });
  });
});
