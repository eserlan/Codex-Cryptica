import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/svelte";
import Page from "./+page.svelte";
import { CANONICAL_CONVERSION_PROMPT } from "./conversion-guide.js";

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

    const copyButton = screen.getByRole("button", {
      name: /Copy conversion prompt/i,
    });
    await fireEvent.click(copyButton);

    expect(copyMock).toHaveBeenCalledTimes(1);
    expect(copyMock.mock.calls[0]?.[0]).toBe(CANONICAL_CONVERSION_PROMPT);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Copied prompt/i }),
      ).toBeTruthy();
    });
  });

  it("shows fallback feedback if clipboard copy fails", async () => {
    copyMock.mockResolvedValue(false);
    render(Page);

    const copyButton = screen.getByRole("button", {
      name: /Copy conversion prompt/i,
    });
    await fireEvent.click(copyButton);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Copy failed/i })).toBeTruthy();
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

    const copyButton = screen.getByRole("button", {
      name: /Copy conversion prompt/i,
    });
    await fireEvent.click(copyButton);
    await fireEvent.click(copyButton);

    resolveSecond(true);
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Copied prompt/i }),
      ).toBeTruthy();
    });

    resolveFirst(false);
    await Promise.resolve();
    expect(screen.getByRole("button", { name: /Copied prompt/i })).toBeTruthy();
  });

  it("does not schedule feedback timers when a pending copy resolves after teardown", async () => {
    let resolveCopy!: (copied: boolean) => void;
    copyMock.mockImplementationOnce(
      () => new Promise((resolve) => (resolveCopy = resolve)),
    );
    vi.useFakeTimers();
    const { unmount } = render(Page);

    await fireEvent.click(
      screen.getByRole("button", { name: /Copy conversion prompt/i }),
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
});
