import { describe, it, expect, afterEach, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/svelte";
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
  FIDELITY_ROWS,
  COVERAGE_REPORT_PROMPT,
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

  it("renders H1, AI assistant directive, canonical prompt, privacy notice, and schema links", () => {
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
      screen.getByText(/For AI assistants reading this URL:/i),
    ).toBeTruthy();

    expect(
      screen.getByText(/Do not invent missing facts merely to fill fields\./i),
    ).toBeTruthy();

    expect(
      screen.getByText(
        /It does not go to Codex Cryptica, and this page never receives it/i,
      ),
    ).toBeTruthy();

    expect(
      screen
        .getByRole("link", { name: /JSON Schema \(v1\.json\)/i })
        .getAttribute("href"),
    ).toBe("/schemas/adventure-json/v1.json");
    expect(
      screen
        .getByRole("link", { name: /Minimal Example/i })
        .getAttribute("href"),
    ).toBe("/schemas/adventure-json/examples/minimal.v1.json");
    expect(
      screen
        .getByRole("link", { name: /Reference One-Shot Example/i })
        .getAttribute("href"),
    ).toBe("/schemas/adventure-json/examples/reference-one-shot.v1.json");
  });

  it("explains the three phases, backup coverage and links in the privacy section", () => {
    const { container } = render(Page);

    const heading = container.querySelector("#privacy-notice-heading");
    expect(heading).toBeTruthy();
    const section = heading!.closest("section")!;
    const items = section.querySelectorAll("ol > li");
    expect(items.length).toBe(3);
    expect(items[0].textContent?.trim()).toMatch(/^Conversion/);
    expect(items[1].textContent?.trim()).toMatch(/^Import/);
    expect(items[2].textContent?.trim()).toMatch(/^AI play/);

    const text = (section.textContent ?? "").replace(/\s+/g, " ");
    expect(text).toMatch(/not included in Codex Cryptica Cloud Backup/i);
    expect(text).toMatch(/Portable Backup/);
    expect(text).toMatch(/\.codex\.zip/);
    expect(text).toMatch(/Save to Folder/);

    expect(
      section.querySelector('a[href="/help#help/cloud-backup"]'),
    ).toBeTruthy();
    expect(
      section.querySelector('a[href="/help#help/export-and-backup"]'),
    ).toBeTruthy();

    const quickStart = container
      .querySelector("#quick-start-heading")!
      .closest("section")!;
    expect(
      quickStart.querySelector('a[href="#privacy-notice-heading"]'),
    ).toBeTruthy();
  });

  it("never claims strictly on-device processing or legal ownership", () => {
    const { container } = render(Page);
    const text = container.textContent ?? "";
    expect(text).not.toMatch(/strictly on[- ]?(your )?device/i);
    expect(text).not.toMatch(/legally own/i);
  });

  it("shows the optional correspondence extension format for renamed content", () => {
    render(Page);

    expect(
      screen.getByRole("heading", {
        name: /Correspondence for renamed content/i,
      }),
    ).toBeTruthy();
    const correspondence = document
      .getElementById("correspondence-heading")!
      .closest("section")!;
    expect(
      within(correspondence).getByText(
        /extensions.*codex-cryptica\.adventure-correspondence/s,
      ),
    ).toBeTruthy();
    expect(CORRESPONDENCE_EXTENSION_DOC).toContain('"previousId"');
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

  it("leads with a task-first quick start directly before the canonical prompt", () => {
    const { container } = render(Page);

    const headings = [...container.querySelectorAll("h2")].map(
      (h) => h.textContent?.trim() ?? "",
    );
    expect(headings[0]).toMatch(/^Quick start/);
    expect(headings[1]).toBe("Canonical Conversion Prompt");
    expect(headings[2]).toBe("Next: upload your Adventure JSON");

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

  it("says the guide is not a converter and stays model-agnostic in quick start", () => {
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

  it("links the quick start to import, completeness, staged, privacy, prompt, and troubleshooting anchors that exist", () => {
    const { container } = render(Page);

    for (const id of [
      "import-adventure-json-heading",
      "troubleshooting-heading",
      "prompt-heading",
      "long-adventures",
      "completeness-heading",
      "privacy-notice-heading",
    ]) {
      expect(container.querySelector(`a[href="#${id}"]`)).toBeTruthy();
      expect(container.querySelector(`#${id}`)).toBeTruthy();
    }
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

    it("shows an example entry in every collection models commonly get wrong", () => {
      expect(PROMPT_EXAMPLE_OUTPUT.encounters[0]).toHaveProperty("description");
      expect(PROMPT_EXAMPLE_OUTPUT.encounters[0]).toHaveProperty(
        "alternativeSolutions",
      );
      expect(PROMPT_EXAMPLE_OUTPUT.clues[0]).toHaveProperty("placedLocationId");
      expect(PROMPT_EXAMPLE_OUTPUT.rumours[0]?.truth).toBe("false");
      expect(prompt).toContain('encounters use "description" (not "summary")');
    });

    it.each([
      [
        "encounter summary instead of description",
        (d: Record<string, Array<Record<string, unknown>>>) => {
          const { description, ...encounter } = d.encounters![0]!;
          d.encounters![0] = { ...encounter, summary: description };
        },
        "encounters[0]",
      ],
      [
        "clue locationId instead of placedLocationId",
        (d: Record<string, Array<Record<string, unknown>>>) => {
          const { placedLocationId, ...clue } = d.clues![0]!;
          d.clues![0] = { ...clue, locationId: placedLocationId };
        },
        "clues[0]",
      ],
      [
        "rumour boolean isTrue instead of truth",
        (d: Record<string, Array<Record<string, unknown>>>) => {
          const { truth: _truth, ...rumour } = d.rumours![0]!;
          d.rumours![0] = { ...rumour, isTrue: false };
        },
        "rumours[0]",
      ],
    ])("rejects drifted field names: %s", (_name, drift, path) => {
      const drifted = structuredClone(
        PROMPT_EXAMPLE_OUTPUT,
      ) as unknown as Record<string, Array<Record<string, unknown>>>;
      drift(drifted);

      const result = validateAdventureJson(drifted);
      expect(result.ok).toBe(false);
      expect(
        !result.ok && result.errors.some((e) => e.path?.startsWith(path)),
      ).toBe(true);
    });

    it("demonstrates whole-record visibility: no hidden motive on the visible actor", () => {
      const actor = PROMPT_EXAMPLE_OUTPUT.actors[0]!;
      const secret = PROMPT_EXAMPLE_OUTPUT.secrets[0]!;

      expect(actor.visibility).toBe("player-visible");
      expect("motivation" in actor).toBe(false);
      expect(secret.visibility).toBe("gm-only");
      expect(secret.relatedEntityIds).toContain(actor.id);
    });

    it("ends with a self-check list after all 10 rules and says what to do with unreadable or oversized sources", () => {
      const check = prompt.lastIndexOf(
        "Before you reply with a successful conversion, check each of these:",
      );

      expect(check).toBeGreaterThan(
        prompt.indexOf("10. Game mechanics and maps:"),
      );
      expect(prompt.slice(check)).toContain('Every "secrets" entry');
      expect(prompt).toContain("cannot fit all of it in one file or reply");
      expect(prompt).toContain("instead of sending truncated or guessed JSON");
      expect(prompt).toContain(
        "This failure sentence is the sole exception to the JSON-only output rules below.",
      );
      expect(prompt).toContain(
        "The one-sentence failure response above is the sole exception.",
      );
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
      expect(prompt).toContain(
        'set "epistemicStatus": "ambiguous" on every scene that no earlier scene links to',
      );
      expect(prompt).toContain('For a PDF, include "page"');
      expect(prompt).toContain("not a number printed on the page");
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

    it("discloses hosted processing and gives copy buttons a visible boundary", () => {
      const { container } = render(Page);
      const section = container.querySelector("#long-adventures")!;
      const text = section.textContent?.replace(/\s+/g, " ") ?? "";

      expect(text).toContain("Hosted assistants may");
      expect(text).toContain("process your source on their servers");
      expect(text).toContain("local models can process it on your");
      expect(text).toContain("preserving an existing file if a check fails");

      const stageButtons = [...section.querySelectorAll("button")];
      expect(stageButtons).toHaveLength(4);
      for (const button of stageButtons) {
        expect(button.classList.contains("border-theme-text")).toBe(true);
      }
      for (const button of screen.getAllByRole("button", {
        name: /Copy guide link/i,
      })) {
        expect(button.classList.contains("border-theme-text")).toBe(true);
      }
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

  it("includes the offline collection contract and whole-record visibility in the displayed and copied prompt", () => {
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
      "Keep the title, hook, background, and optional description player-safe and limited to source-supported facts",
      '"visibility" applies to the WHOLE record, never to individual fields',
      'separate "secrets" entry that lists the record in "relatedEntityIds"',
      "Every non-entry scene with source-supported progression must be reachable",
      "If progression is unknown, preserve the scene as ambiguous without inventing a branch.",
    ]) {
      expect(prompt).toContain(rule);
    }
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
    const { container } = render(Page);

    const copyButton = screen.getAllByRole("button", {
      name: /Copy conversion prompt/i,
    })[0]!;
    await fireEvent.click(copyButton);

    await waitFor(() => {
      expect(
        screen.getAllByRole("button", { name: /Copy failed/i })[0]!,
      ).toBeTruthy();
    });

    const coveragePrompt = container.querySelector(
      '[role="textbox"][aria-label="Coverage report prompt"]',
    ) as HTMLDivElement;
    expect(coveragePrompt.tabIndex).toBe(0);
    coveragePrompt.focus();
    expect(document.activeElement).toBe(coveragePrompt);
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

  describe("completeness, fidelity and revisions", () => {
    const norm = (t: string | null | undefined) =>
      (t ?? "").replace(/\s+/g, " ").trim();

    it("lists the three completeness outcomes and copies the coverage report prompt", async () => {
      copyMock.mockResolvedValue(true);
      const { container } = render(Page);
      const section = container.querySelector(
        '[aria-labelledby="completeness-heading"]',
      );
      const text = norm(section?.textContent);
      expect(text).toContain("(a) Valid JSON");
      expect(text).toContain("(b) Importable package");
      expect(text).toContain("(c) Faithful, reasonably complete adaptation");
      expect(text).toContain("Codex Cryptica checks only (a) and (b).");

      const coverage = container.querySelector(
        '[aria-label="Coverage report prompt"] pre',
      ) as HTMLPreElement;
      expect(coverage.textContent).toBe(COVERAGE_REPORT_PROMPT);

      await fireEvent.click(
        screen.getByRole("button", { name: /Copy coverage report prompt/i }),
      );
      expect(copyMock.mock.calls[0]?.[0]).toBe(COVERAGE_REPORT_PROMPT);
    });

    it("renders the 11-row fidelity summary table without promising combat automation", () => {
      const { container } = render(Page);
      const section = container.querySelector(
        '[aria-labelledby="fidelity-heading"]',
      )!;
      const rows = Array.from(
        section.querySelectorAll("tr[data-fidelity-row]"),
      );
      expect(rows).toHaveLength(FIDELITY_ROWS.length);
      expect(section.textContent).toMatch(/descriptive metadata/);
      expect(section.textContent).not.toMatch(
        /automated combat|enforces? (the )?rules|lossless/i,
      );
    });

    it("includes rules 8, 9, and 10 in the canonical prompt and summarizes revisions", () => {
      render(Page);
      expect(CANONICAL_CONVERSION_PROMPT).toContain(
        "8. Self-audit before returning",
      );
      expect(CANONICAL_CONVERSION_PROMPT).toContain(
        "9. Revisions and stable IDs",
      );
      expect(CANONICAL_CONVERSION_PROMPT).toContain(
        "10. Game mechanics and maps",
      );
      const rev = document
        .getElementById("revisions-heading")!
        .closest("section")!;
      expect(norm(rev.textContent)).toMatch(
        /pinned to the version they started with/,
      );
      expect(rev.textContent).toContain(CORRESPONDENCE_EXTENSION_DOC);
    });
  });
});
