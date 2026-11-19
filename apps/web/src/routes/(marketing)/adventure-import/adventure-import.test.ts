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
  STAGED_COVERAGE_PROMPT,
  STAGED_INVENTORY_PROMPT,
} from "./staged-conversion.js";
import {
  CANONICAL_CONVERSION_PROMPT,
  CORRESPONDENCE_EXTENSION_DOC,
  FIDELITY_ROWS,
  COVERAGE_REPORT_PROMPT,
  LINK_HANDOFF_TEXT,
  PROMPT_END_MARKER,
  PROMPT_EXAMPLE_OUTPUT,
  PROMPT_TXT_URL,
} from "./conversion-guide.js";
import {
  CANONICAL_ORIGIN,
  isCanonicalProductionHost,
} from "./canonical-origin.js";
import { AUTOMATIC_STAGING_RULES } from "./staged-conversion.js";

const copyMock = vi.fn<(...args: unknown[]) => Promise<boolean>>();
const config = vi.hoisted(() => ({ isStaging: false }));

vi.mock("#lib/config/index.js", async () => {
  const actual = await vi.importActual<object>("#lib/config/index.js");
  const mod = { ...actual };
  Object.defineProperty(mod, "IS_STAGING", {
    enumerable: true,
    get: () => config.isStaging,
  });
  return mod;
});

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
    config.isStaging = false;
  });

  it("builds the prompt's absolute URLs from CANONICAL_ORIGIN", () => {
    expect(CANONICAL_ORIGIN).toBe("https://codexcryptica.com");
    expect(CANONICAL_CONVERSION_PROMPT).toContain(
      `Schema: ${CANONICAL_ORIGIN}/schemas/adventure-json/v1.json`,
    );
    expect(CANONICAL_CONVERSION_PROMPT).toContain(
      `Guide: ${CANONICAL_ORIGIN}/adventure-import`,
    );
    expect(CANONICAL_CONVERSION_PROMPT).toContain(
      "Schema: https://codexcryptica.com/schemas/adventure-json/v1.json",
    );
    expect(CANONICAL_CONVERSION_PROMPT.endsWith(`\n${PROMPT_END_MARKER}`)).toBe(
      true,
    );
    expect(AUTOMATIC_STAGING_RULES).toContain(
      `${CANONICAL_ORIGIN}/adventure-import#long-adventures`,
    );
    expect(PROMPT_TXT_URL).toBe(
      `${CANONICAL_ORIGIN}/adventure-import/prompt.txt`,
    );
  });

  it("recognises only the canonical production host", () => {
    expect(isCanonicalProductionHost("codexcryptica.com")).toBe(true);
    expect(
      isCanonicalProductionHost(
        "factory-065-adventure-import.codex-cryptica.pages.dev",
      ),
    ).toBe(false);
  });

  it("shows the note on non-production hosts when IS_STAGING is false", async () => {
    config.isStaging = false;
    render(Page);
    expect(
      await screen.findByTestId("non-production-canonical-note"),
    ).toBeTruthy();
  });

  it("shows the non-production note with local schema and prompt.txt links when IS_STAGING is true", async () => {
    config.isStaging = true;
    render(Page);
    const note = await screen.findByTestId("non-production-canonical-note");
    expect(note.textContent).toContain("production");
    const hrefs = [...note.querySelectorAll("a")].map((a) =>
      a.getAttribute("href"),
    );
    expect(hrefs).toContain("/schemas/adventure-json/v1.json");
    expect(hrefs).toContain("/adventure-import/prompt.txt");
  });

  it("explains the fallback when the assistant cannot open the link", () => {
    const { container } = render(Page);
    const text = (container.textContent ?? "").replace(/\s+/g, " ");
    expect(text).toContain(
      "cannot open the link, or its reply shows the prompt did not end with the end marker, use Copy conversion prompt and paste the full prompt instead",
    );
  });

  it("renders the prompt in a pre with id canonical-prompt", () => {
    const { container } = render(Page);
    expect(container.querySelector("pre#canonical-prompt")?.textContent).toBe(
      CANONICAL_CONVERSION_PROMPT,
    );
  });

  it("Copy conversion prompt copies exactly CANONICAL_CONVERSION_PROMPT", async () => {
    copyMock.mockResolvedValue(true);
    render(Page);
    await fireEvent.click(
      screen.getAllByRole("button", { name: /Copy conversion prompt/i })[0]!,
    );
    expect(copyMock.mock.calls[0]?.[0]).toBe(CANONICAL_CONVERSION_PROMPT);
  });

  it("Copy guide link copies exactly LINK_HANDOFF_TEXT", async () => {
    copyMock.mockResolvedValue(true);
    render(Page);
    await fireEvent.click(
      screen.getByRole("button", { name: /Copy guide link/i }),
    );
    expect(copyMock.mock.calls[0]?.[0]).toBe(LINK_HANDOFF_TEXT);
  });

  it("Copy coverage report prompt copies exactly COVERAGE_REPORT_PROMPT", async () => {
    copyMock.mockResolvedValue(true);
    render(Page);
    await fireEvent.click(
      screen.getByRole("button", { name: /Copy coverage report prompt/i }),
    );
    expect(copyMock.mock.calls[0]?.[0]).toBe(COVERAGE_REPORT_PROMPT);
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
    });

    it("starts staging on overflow and keeps a checkpoint out of import JSON", () => {
      expect(prompt).toContain("start staged conversion now");
      expect(prompt).toContain("make a numbered inventory");
      expect(prompt).toContain("Define each entry only in its owning chunk");
      expect(prompt).toContain(
        "compare its actual JSON IDs and per-collection counts with the expected IDs and counts",
      );
      expect(prompt).toContain(
        "each section's expected IDs and per-collection counts have been compared with its actual chunk JSON",
      );
      expect(prompt).toContain("Continue with chunk 01");
      expect(prompt).toContain("exact top-level metadata values");
      expect(prompt).toContain("convert only the requested chunk");
      expect(prompt).toContain(
        "Assemble only after every planned chunk is present",
      );
      expect(prompt).toContain("label the result unvalidated");
      expect(prompt).toContain(
        "Never label an inventory, partial chunk set, or truncated reply as the final adventure",
      );
      expect(prompt).not.toContain("the sole exception");
    });

    it("applies the tested source fidelity rules during conversion", () => {
      expect(prompt).toContain(
        "Inventory the source by section before writing JSON",
      );
      expect(prompt).toContain(
        'Use "unverified" when rumour truth is unspecified',
      );
      expect(prompt).toContain('Put keyed rooms in "locations"');
      expect(prompt).toContain(
        "A link from another unreachable scene does not make it reachable",
      );
      expect(prompt).toContain(
        "absent from all player-visible names, text, IDs, and linked details",
      );
      expect(prompt).toContain(
        'Put each source-supported investigative observation in "clues"',
      );
      expect(prompt).toContain(
        "cite its key entry rather than an earlier mention",
      );
      expect(prompt).toContain(
        "For unpaginated sources, cite a supported section, anchor or other stable source range",
      );
      expect(prompt).toContain(
        "For paginated sources, cite the page position and heading",
      );
    });

    it("requires the whole prompt before staging and can work without the external schema URL", () => {
      expect(prompt.trimEnd().split("\n").at(-1)).toBe(
        "END OF ADVENTURE JSON V1 CONVERSION PROMPT",
      );
      expect(prompt).toContain(
        "Wait for it before making an inventory or generating any chunk",
      );
      expect(prompt).toContain("does not replace the missing prompt");
      expect(prompt).toContain(
        "use that contract without asking the user to paste the schema",
      );
    });

    it("asks for missing source material without inventing a conversion", () => {
      expect(prompt).toContain("name the missing input or page range");
      expect(prompt).toContain("ask for readable text or a smaller upload");
      expect(prompt).toContain("Never guess.");
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
        'An authored scene keeps the "epistemicStatus" its source supports',
      );
      expect(prompt).toContain(
        'add one "unresolved" entry with "code": "UNKNOWN_SCENE_PROGRESSION"',
      );
      expect(prompt).toContain(
        'Never mark a scene "ambiguous" only to pass the reachability check',
      );
      expect(prompt).toContain("Four kinds of link:");
      expect(prompt).not.toContain("no earlier scene links to");
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
    it("uses source ranges that work for paginated and unpaginated material", () => {
      expect(STAGED_INVENTORY_PROMPT).toContain(
        "If it is not paginated, say that and do not invent page numbers",
      );
      expect(STAGED_INVENTORY_PROMPT).toContain(
        "heading/anchor/source range otherwise",
      );
      expect(STAGED_CHUNK_PROMPT).toContain(
        "For unpaginated sources, use the supported section or anchor reference",
      );
      expect(STAGED_CHUNK_PROMPT).toContain("never invent a page number");
    });

    it("checks expected entry IDs against the actual chunk JSON", () => {
      expect(STAGED_INVENTORY_PROMPT).toContain(
        "every expected source-supported entry",
      );
      expect(STAGED_INVENTORY_PROMPT).toContain(
        "grouped by Adventure JSON collection",
      );
      expect(STAGED_CHUNK_PROMPT).toContain(
        "IDs actually present in each collection",
      );
      expect(STAGED_COVERAGE_PROMPT).toContain(
        "the JSON files for every chunk",
      );
      expect(STAGED_COVERAGE_PROMPT).toContain(
        "expected-entry checklist with the actual IDs and counts",
      );
      expect(STAGED_COVERAGE_PROMPT).toContain(
        "not as proof that an entry exists",
      );
      expect(STAGED_COVERAGE_PROMPT).toContain(
        "Mark a section converted only when every expected ID",
      );
    });

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

    it("states that v1 has no field-level or reveal-later visibility", () => {
      expect(CANONICAL_CONVERSION_PROMPT).toContain(
        'v1 has no field-level or "revealed later" visibility. A fact players only learn in play',
      );
      expect(CANONICAL_CONVERSION_PROMPT).toContain(
        'goes in a "gm-only" secret, clue, scene or encounter',
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
      `${CANONICAL_ORIGIN}/adventure-import/prompt.txt`,
    );
    expect(LINK_HANDOFF_TEXT).toContain("the prompt is incomplete");
    expect(LINK_HANDOFF_TEXT).toContain(
      "paste the entire prompt into this chat",
    );
    expect(LINK_HANDOFF_TEXT).toContain("does not replace the missing prompt");
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
      "A non-entry scene (scenes[1..]) is reachable when a breadth-first walk that starts at scenes[0]",
      'For each unreachable non-entry scene, add one "unresolved" entry with "code": "UNKNOWN_SCENE_PROGRESSION"',
    ]) {
      expect(prompt).toContain(rule);
    }
    expect(
      screen.getByText(
        /When the source leaves progression open, add an unresolved entry with code "UNKNOWN_SCENE_PROGRESSION"/,
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
