/** @vitest-environment jsdom */
import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import { tick } from "svelte";
import QuickNamesPanel from "./QuickNamesPanel.svelte";

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
  }> = {},
) {
  const writeText = vi.fn(overrides.writeText ?? (async () => {}));
  const track = vi.fn();
  render(QuickNamesPanel, {
    props: {
      generatorType: "fantasy-names",
      culture: overrides.culture ?? "High Elf",
      gender: "Any",
      nameType: "Person",
      rng: seededRng(4),
      writeText,
      track,
    },
  });
  return { writeText, track };
}

const nameButtons = () =>
  screen
    .getAllByRole("button", { name: /^Copy / })
    .filter((button) => button.closest("li"));

describe("QuickNamesPanel", () => {
  it("shows a batch of ten names without any generation step", async () => {
    renderPanel();

    await waitFor(() => expect(nameButtons()).toHaveLength(10));
    expect(screen.getByText(/no account and no AI/i)).toBeTruthy();
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
});
