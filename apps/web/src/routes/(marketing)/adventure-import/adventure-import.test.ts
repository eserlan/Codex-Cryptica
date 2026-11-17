import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/svelte";
import {
  AdventureJsonV1Schema,
  validateAdventureJson,
} from "@codex/adventure-engine";
import Page from "./+page.svelte";
import {
  STAGED_ASSEMBLE_SCRIPT,
  STAGED_CHUNK_PROMPT,
  STAGED_INVENTORY_PROMPT,
} from "./staged-conversion.js";
import {
  CANONICAL_CONVERSION_PROMPT,
  CORRESPONDENCE_EXTENSION_DOC,
  LINK_HANDOFF_TEXT,
  PROMPT_EXAMPLE_OUTPUT,
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
      "Save the result as a plain .json file.",
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

  describe("LLM-friendly prompt structure (#4907)", () => {
    const prompt = CANONICAL_CONVERSION_PROMPT;

    it("states the output contract first, then a worked example, then the rules", () => {
      const contract = prompt.indexOf("Output contract (read this first):");
      const example = prompt.indexOf("Shape of a valid answer");
      const rules = prompt.indexOf("Strict output rules:");

      expect(contract).toBeGreaterThan(-1);
      expect(contract).toBeLessThan(example);
      expect(example).toBeLessThan(rules);
      expect(prompt.slice(contract, example)).toContain("ONE JSON object");
      expect(prompt.slice(contract, example)).toContain(
        "Include all 11 collection arrays",
      );
    });

    it("embeds an example that is schema-valid and semantically valid", () => {
      expect(prompt).toContain(JSON.stringify(PROMPT_EXAMPLE_OUTPUT, null, 2));
      expect(
        AdventureJsonV1Schema.safeParse(PROMPT_EXAMPLE_OUTPUT).success,
      ).toBe(true);
      expect(validateAdventureJson(PROMPT_EXAMPLE_OUTPUT).ok).toBe(true);
    });

    it("demonstrates whole-record visibility: no hidden motive on the visible actor", () => {
      const actor = PROMPT_EXAMPLE_OUTPUT.actors[0]!;
      const secret = PROMPT_EXAMPLE_OUTPUT.secrets[0]!;

      expect(actor.visibility).toBe("player-visible");
      expect("motivation" in actor).toBe(false);
      expect(secret.visibility).toBe("gm-only");
      expect(secret.relatedEntityIds).toContain(actor.id);
    });

    it("ends with a self-check list and says what to do with unreadable or oversized sources", () => {
      const check = prompt.lastIndexOf(
        "Before you reply, check each of these:",
      );

      expect(check).toBeGreaterThan(prompt.indexOf("Strict output rules:"));
      expect(prompt.slice(check)).toContain('Every "secrets" entry');
      expect(prompt).toContain("cannot fit all of it in one file or reply");
      expect(prompt).toContain("instead of sending truncated or guessed JSON");
    });

    it("guards against over-hiding, copied example codes and missing items", () => {
      expect(prompt).toContain("Do not over-hide.");
      expect(prompt).toContain("whatever players can learn in play");
      expect(prompt).toContain("only illustrative; use your own");
      expect(prompt).toContain('in "items"');
      expect(prompt).toContain('specific "code"');
    });

    it("prefers a JSON file over chat output, with a JSON-only reply fallback", () => {
      const contract = prompt.slice(
        prompt.indexOf("Output contract"),
        prompt.indexOf("Shape of a valid answer"),
      );

      expect(contract).toContain(
        'as a file named after the "id", such as "the-last-grind.json"',
      );
      expect(contract).toContain(
        "If you cannot create files, your entire reply is the JSON object",
      );
      expect(contract).toContain(
        "Never put JSON in a chat reply when you could have attached a file",
      );
    });

    it("tells models how to handle long sources, sandbox modules and confidence", () => {
      expect(prompt).toContain(
        "Never shorten the conversion by dropping or merging entries",
      );
      expect(prompt).toContain(
        "https://codexcryptica.com/adventure-import#long-adventures",
      );
      expect(prompt).not.toContain("compress each to a short summary");
      expect(prompt).toContain(
        'set "epistemicStatus": "ambiguous" on every scene that no earlier scene links to',
      );
      expect(prompt).toContain('For a PDF, include "page"');
      expect(prompt).toContain("has no authored order");
      expect(prompt).toContain("Do not invent a flow or an ending");
      expect(prompt).toContain(
        'Use "explicit" only for what the source states',
      );
      expect(prompt).toContain(
        'Use "inferred" for anything you worked out yourself',
      );
    });

    it("stays provider-neutral", () => {
      expect(prompt).not.toMatch(
        /\b(ChatGPT|Claude|Gemini|GPT|OpenAI|Anthropic)\b/,
      );
    });
  });

  describe("staged conversion section (#4896)", () => {
    it("is reachable from the quick start and from the one-pass prompt's pointer", () => {
      const { container } = render(Page);

      expect(container.querySelector("#long-adventures")).toBeTruthy();
      expect(
        container.querySelector('a[href="#long-adventures"]'),
      ).toBeTruthy();
      expect(CANONICAL_CONVERSION_PROMPT).toContain(
        "https://codexcryptica.com/adventure-import#long-adventures",
      );
    });

    it("explains the stages in order and that nothing is converted here", () => {
      const { container } = render(Page);
      const section = container.querySelector("#long-adventures")!;
      const titles = [...section.querySelectorAll("h3")].map((h) =>
        h.textContent?.trim(),
      );

      expect(titles.slice(1)).toEqual([
        "1. Inventory the source",
        "2. Convert one section at a time",
        "3. Check coverage against the inventory",
        "4. Assemble the sections into one file",
        "5. Import and fix what it reports",
      ]);
      const text = section.textContent?.replace(/\s+/g, " ") ?? "";
      expect(text).toContain("Do not trust an assistant that says");
      expect(text).toContain("This page converts nothing");
      expect(text).toContain("Three different problems");
    });

    it("copies the right text per stage and the assemble script", async () => {
      copyMock.mockResolvedValue(true);
      render(Page);

      await fireEvent.click(
        screen.getByRole("button", { name: /Copy inventory prompt/i }),
      );
      await fireEvent.click(
        screen.getByRole("button", { name: /Copy section prompt/i }),
      );
      await fireEvent.click(
        screen.getByRole("button", { name: /Copy assemble script/i }),
      );

      expect(copyMock.mock.calls.map((c) => c[0])).toEqual([
        STAGED_INVENTORY_PROMPT,
        STAGED_CHUNK_PROMPT,
        STAGED_ASSEMBLE_SCRIPT,
      ]);
    });

    it("reports a failed copy on that button only", async () => {
      copyMock.mockResolvedValue(false);
      render(Page);

      await fireEvent.click(
        screen.getByRole("button", { name: /Copy coverage prompt/i }),
      );

      await waitFor(() => {
        expect(
          screen.getAllByRole("button", { name: /Copy failed/i }),
        ).toHaveLength(1);
      });
      expect(
        screen.getByRole("button", { name: /Copy inventory prompt/i }),
      ).toBeTruthy();
    });
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
    expect(LINK_HANDOFF_TEXT).toContain("downloadable .json file");
    expect(LINK_HANDOFF_TEXT).toContain("otherwise reply with the JSON only");
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
});
