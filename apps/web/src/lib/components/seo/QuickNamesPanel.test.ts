/** @vitest-environment jsdom */
import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import { tick } from "svelte";
import QuickNamesPanel from "./QuickNamesPanel.svelte";
import type { QuickNamesAiResult } from "./quick-names";

function seededRng(seed = 1): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function renderPanel(
  overrides: Partial<{
    culture: string;
    writeText: (text: string) => Promise<void>;
    askAi: (query: string) => Promise<QuickNamesAiResult>;
    isOnline: boolean;
    nameType: string;
    cultureChoices: string[];
    nameTypeChoices: string[];
  }> = {},
) {
  const writeText = vi.fn(overrides.writeText ?? (async () => {}));
  const track = vi.fn();
  render(QuickNamesPanel, {
    props: {
      generatorType: "fantasy-names",
      culture: overrides.culture ?? "High Elf",
      gender: "Any",
      nameType: overrides.nameType ?? "Person",
      cultureChoices: overrides.cultureChoices ?? [],
      nameTypeChoices: overrides.nameTypeChoices ?? [],
      rng: seededRng(4),
      writeText,
      track,
      askAi: overrides.askAi,
      isOnline: overrides.isOnline ?? true,
    },
  });
  return { writeText, track };
}

const nameOf = (button: HTMLElement) =>
  button.getAttribute("aria-label")!.replace(/^Copy /, "");

const nameButtons = () =>
  screen
    .getAllByRole("button", { name: /^Copy / })
    .filter((button) => button.closest("li"));

describe("QuickNamesPanel", () => {
  it("shows a batch of ten names without any generation step", async () => {
    renderPanel();

    await waitFor(() => expect(nameButtons()).toHaveLength(10));
    expect(screen.getByText(/no account, no AI/i)).toBeTruthy();
  });

  it("copies one name with visible and announced feedback", async () => {
    const { writeText, track } = renderPanel();
    await waitFor(() => expect(nameButtons()).toHaveLength(10));
    const button = nameButtons()[2];
    const name = button.getAttribute("aria-label")!.replace(/^Copy /, "");

    await fireEvent.click(button);

    expect(writeText).toHaveBeenCalledWith(name);
    await waitFor(() => expect(button.textContent).toContain("Copied"));
    expect(screen.getByRole("status").textContent).toBe(`Copied ${name}.`);
    expect(track).toHaveBeenCalledWith(
      "copy",
      expect.objectContaining({
        copy_target: "quick_name",
        generator_mode: "quick_names",
      }),
    );
    expect(JSON.stringify(track.mock.calls)).not.toContain(name);
  });

  it("copies every name as a plain list", async () => {
    const { writeText, track } = renderPanel();
    await waitFor(() => expect(nameButtons()).toHaveLength(10));
    const names = nameButtons().map((button) =>
      button.getAttribute("aria-label")!.replace(/^Copy /, ""),
    );

    await fireEvent.click(screen.getByRole("button", { name: /copy all/i }));

    expect(writeText).toHaveBeenCalledWith(names.join("\n"));
    expect(track).toHaveBeenCalledWith(
      "copy",
      expect.objectContaining({ copy_target: "quick_name_list" }),
    );
  });

  it("rolls a fresh batch on New names and tracks the reroll", async () => {
    const { track } = renderPanel();
    await waitFor(() => expect(nameButtons()).toHaveLength(10));
    const before = nameButtons().map((button) => button.textContent);

    await fireEvent.click(screen.getByRole("button", { name: /new names/i }));

    expect(nameButtons().map((button) => button.textContent)).not.toEqual(
      before,
    );
    expect(track).toHaveBeenCalledWith(
      "reroll",
      expect.objectContaining({ name_culture: "High Elf" }),
    );
  });

  it("tells the visitor when the clipboard refuses the copy", async () => {
    renderPanel({
      writeText: async () => {
        throw new Error("denied");
      },
    });
    await waitFor(() => expect(nameButtons()).toHaveLength(10));

    await fireEvent.click(nameButtons()[0]);

    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toMatch(/copy failed/i),
    );
    expect(nameButtons()[0].textContent).not.toContain("Copied");
  });

  it("reports a typed-in culture to analytics as custom", async () => {
    const { track } = renderPanel({ culture: "Grandma's tongue" });
    await waitFor(() => expect(nameButtons()).toHaveLength(10));

    await fireEvent.click(screen.getByRole("button", { name: /new names/i }));

    expect(track).toHaveBeenCalledWith(
      "reroll",
      expect.objectContaining({ name_culture: "custom" }),
    );
  });

  it("clears the copied tick after a moment", async () => {
    vi.useFakeTimers();
    try {
      renderPanel();
      await vi.waitFor(() => expect(nameButtons()).toHaveLength(10));
      await fireEvent.click(nameButtons()[0]);
      await vi.waitFor(() =>
        expect(nameButtons()[0].textContent).toContain("Copied"),
      );

      await vi.advanceTimersByTimeAsync(1600);

      expect(nameButtons()[0].textContent).not.toContain("Copied");
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not tick a new name when a reroll lands mid-copy", async () => {
    let finishCopy: () => void = () => {};
    renderPanel({
      writeText: () => new Promise<void>((resolve) => (finishCopy = resolve)),
    });
    await waitFor(() => expect(nameButtons()).toHaveLength(10));

    await fireEvent.click(nameButtons()[1]);
    await fireEvent.click(screen.getByRole("button", { name: /new names/i }));
    finishCopy();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await tick();

    expect(nameButtons()[1].textContent).not.toContain("Copied");
  });

  it("replaces the batch with AI names and keeps the description out of analytics", async () => {
    const askAi = vi
      .fn()
      .mockResolvedValue({ names: ["Zephyrine", "Quillon"], fallback: false });
    const { track } = renderPanel({ askAi });
    await waitFor(() => expect(nameButtons()).toHaveLength(10));

    await fireEvent.input(screen.getByLabelText(/ask ai for names like/i), {
      target: { value: "sky pirates" },
    });
    await fireEvent.click(screen.getByRole("button", { name: "Ask AI" }));

    await waitFor(() =>
      expect(nameButtons().map((b) => b.textContent)).toEqual([
        expect.stringContaining("Zephyrine"),
        expect.stringContaining("Quillon"),
      ]),
    );
    expect(askAi).toHaveBeenCalledWith("sky pirates");
    expect(screen.getByRole("status").textContent).toBe("AI names ready.");
    expect(track).toHaveBeenCalledWith(
      "reroll",
      expect.objectContaining({ roll_source: "ai", ai_result: "ok" }),
    );
    expect(JSON.stringify(track.mock.calls)).not.toMatch(
      /sky pirates|Zephyrine/,
    );
  });

  it.each([
    [
      "the AI fell back to local tables",
      async () => ({ names: ["Local"], fallback: true }),
    ],
    ["the AI returned no names", async () => ({ names: [], fallback: false })],
    [
      "the AI request failed",
      async () => {
        throw new Error("proxy down");
      },
    ],
  ])("rolls on the device when %s", async (_label, askAi) => {
    const { track } = renderPanel({ askAi });
    await waitFor(() => expect(nameButtons()).toHaveLength(10));

    await fireEvent.click(screen.getByRole("button", { name: "Ask AI" }));

    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toMatch(
        /rolled on your device/,
      ),
    );
    expect(nameButtons()).toHaveLength(10);
    expect(track).toHaveBeenCalledWith(
      "reroll",
      expect.objectContaining({ ai_result: "fallback" }),
    );
  });

  it("ignores an AI reply that arrives after New names", async () => {
    let answer: (result: QuickNamesAiResult) => void = () => {};
    renderPanel({
      askAi: () => new Promise((resolve) => (answer = resolve)),
    });
    await waitFor(() => expect(nameButtons()).toHaveLength(10));

    await fireEvent.click(screen.getByRole("button", { name: "Ask AI" }));
    await fireEvent.click(screen.getByRole("button", { name: /new names/i }));
    const local = nameButtons().map((b) => b.textContent);
    answer({ names: ["Late"], fallback: false });
    await new Promise((resolve) => setTimeout(resolve, 0));
    await tick();

    expect(nameButtons().map((b) => b.textContent)).toEqual(local);
  });

  it("disables Ask AI offline and explains why", async () => {
    renderPanel({ askAi: vi.fn(), isOnline: false });

    expect(
      (screen.getByRole("button", { name: "Ask AI" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(screen.getByText(/needs a connection/i)).toBeTruthy();
  });

  it("offers no AI form when the page gives it no AI", () => {
    renderPanel();

    expect(screen.queryByRole("button", { name: "Ask AI" })).toBeNull();
  });

  it("keeps pinned names through New names and copies only them", async () => {
    const { writeText } = renderPanel();
    await waitFor(() => expect(nameButtons()).toHaveLength(10));
    const name = nameOf(nameButtons()[3]);
    const before = nameButtons().map(nameOf);

    await fireEvent.click(screen.getByRole("button", { name: `Pin ${name}` }));
    expect(nameButtons().map(nameOf)).toEqual(before);
    expect(
      screen
        .getByRole("button", { name: `Unpin ${name}` })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    await fireEvent.click(screen.getByRole("button", { name: /new names/i }));

    expect(nameOf(nameButtons()[0])).toBe(name);
    expect(nameButtons()).toHaveLength(10);
    await fireEvent.click(
      screen.getByRole("button", { name: /copy pinned \(1\)/i }),
    );
    expect(writeText).toHaveBeenLastCalledWith(name);
  });

  it("drops a name from the kept set when it is unpinned", async () => {
    renderPanel();
    await waitFor(() => expect(nameButtons()).toHaveLength(10));
    const name = nameOf(nameButtons()[0]);

    await fireEvent.click(screen.getByRole("button", { name: `Pin ${name}` }));
    await fireEvent.click(
      screen.getByRole("button", { name: `Unpin ${name}` }),
    );

    expect(screen.getByRole("button", { name: /^copy all$/i })).toBeTruthy();
    expect(screen.getByRole("status").textContent).toBe(`Unpinned ${name}.`);
  });

  it("offers first names only for people and rolls without surnames", async () => {
    renderPanel({ culture: "Dwarven" });
    await waitFor(() => expect(nameButtons()).toHaveLength(10));
    expect(nameButtons().every((b) => nameOf(b).includes(" "))).toBe(true);

    await fireEvent.click(
      screen.getByRole("checkbox", { name: /first names only/i }),
    );

    await waitFor(() =>
      expect(nameButtons().some((b) => nameOf(b).includes(" "))).toBe(false),
    );
  });

  it("hides the first-names option for other name types", async () => {
    renderPanel({ nameType: "Place" });
    await waitFor(() => expect(nameButtons()).toHaveLength(10));

    expect(
      screen.queryByRole("checkbox", { name: /first names only/i }),
    ).toBeNull();
  });

  it("badges a batch that came from the AI, and drops the badge on New names", async () => {
    renderPanel({
      askAi: async () => ({ names: ["Ysolde Brightwater"], fallback: false }),
    });
    await waitFor(() => expect(nameButtons()).toHaveLength(10));

    await fireEvent.click(screen.getByRole("button", { name: "Ask AI" }));
    await waitFor(() => expect(screen.getByText("AI names")).toBeTruthy());
    await fireEvent.click(screen.getByRole("button", { name: /new names/i }));

    expect(screen.queryByText("AI names")).toBeNull();
  });

  it("says where the batch came from, so an AI batch never claims no AI", async () => {
    renderPanel({
      askAi: async () => ({ names: ["Ysolde Brightwater"], fallback: false }),
    });
    await waitFor(() => expect(nameButtons()).toHaveLength(10));
    expect(
      screen.getByText(/rolled on your device: no account, no AI/i),
    ).toBeTruthy();

    await fireEvent.click(screen.getByRole("button", { name: "Ask AI" }));
    await waitFor(() =>
      expect(screen.getByText(/came from our AI service/i)).toBeTruthy(),
    );
    expect(screen.queryByText(/no account, no AI/i)).toBeNull();

    await fireEvent.click(screen.getByRole("button", { name: /new names/i }));
    expect(screen.getByText(/no account, no AI/i)).toBeTruthy();
    expect(screen.queryByText(/came from our AI service/i)).toBeNull();
  });

  it("keeps the local note when the AI fails and names are rolled instead", async () => {
    renderPanel({ askAi: async () => ({ names: [], fallback: true }) });
    await waitFor(() => expect(nameButtons()).toHaveLength(10));

    await fireEvent.click(screen.getByRole("button", { name: "Ask AI" }));
    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toMatch(
        /couldn't answer/i,
      ),
    );
    expect(screen.getByText(/no account, no AI/i)).toBeTruthy();
    expect(screen.queryByText(/came from our AI service/i)).toBeNull();
  });

  it("summarises the current settings on the collapsed settings row", async () => {
    renderPanel({ culture: "Dwarven" });
    await waitFor(() => expect(nameButtons()).toHaveLength(10));
    const summary = () =>
      document.querySelector("summary")!.textContent!.replace(/\s+/g, " ");

    expect(summary()).toContain("Dwarven · Person");
    expect(summary()).not.toContain("First names only");

    await fireEvent.click(
      screen.getByRole("checkbox", { name: /first names only/i }),
    );
    expect(summary()).toContain("Dwarven · Person · First names only");
  });

  it("lists the names before the actions that act on them", async () => {
    renderPanel();
    await waitFor(() => expect(nameButtons()).toHaveLength(10));
    const list = screen.getByRole("list", { name: "Names" });
    const newNames = screen.getByRole("button", { name: /new names/i });
    const settings = document.querySelector("details")!;

    expect(
      settings.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      list.compareDocumentPosition(newNames) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("shows a copy icon on each row and words only for the copied one", async () => {
    const { writeText } = renderPanel();
    await waitFor(() => expect(nameButtons()).toHaveLength(10));
    const [first, second] = nameButtons();

    expect(first.textContent).not.toMatch(/\bcopy\b/i);
    await fireEvent.click(first);
    await waitFor(() => expect(writeText).toHaveBeenCalled());
    await waitFor(() => expect(first.textContent).toMatch(/copied/i));
    expect(second.textContent).not.toMatch(/copied/i);
  });

  it("jumps to the full generator's button for names with notes", async () => {
    const target = document.createElement("button");
    target.id = "generate-button";
    target.scrollIntoView = vi.fn();
    document.body.append(target);
    try {
      renderPanel();
      await fireEvent.click(
        screen.getByRole("button", { name: /generate names with notes/i }),
      );
      expect(target.scrollIntoView).toHaveBeenCalled();
      expect(document.activeElement).toBe(target);
    } finally {
      target.remove();
    }
  });

  it("does nothing harmful when the full generator is not on the page", async () => {
    renderPanel();
    await fireEvent.click(
      screen.getByRole("button", { name: /generate names with notes/i }),
    );
    expect(document.activeElement).not.toBeNull();
  });

  it("lets small screens change culture and name type inside the panel", async () => {
    renderPanel({
      cultureChoices: ["Generic Fantasy", "Dwarven"],
      nameTypeChoices: ["Person", "Place"],
    });
    await waitFor(() => expect(nameButtons()).toHaveLength(10));
    const before = nameButtons().map(nameOf);

    await fireEvent.change(
      screen.getByRole("combobox", { name: "Name type" }),
      {
        target: { value: "Place" },
      },
    );

    await waitFor(() => expect(nameButtons().map(nameOf)).not.toEqual(before));
    const cultures = Array.from(
      (screen.getByRole("combobox", { name: "Culture" }) as HTMLSelectElement)
        .options,
    ).map((option) => option.value);
    expect(cultures).toEqual(["Generic Fantasy", "Dwarven", "High Elf"]);
  });
});
