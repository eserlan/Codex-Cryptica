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
    document.head.innerHTML = "";
    copyMock.mockReset();
  });

  it("renders H1, canonical prompt, epistemic rules, privacy notice, and schema links", () => {
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
