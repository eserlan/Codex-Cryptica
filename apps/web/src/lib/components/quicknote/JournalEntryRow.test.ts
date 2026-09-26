/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import JournalEntryRow from "./JournalEntryRow.svelte";

const entry = (type: string, content = "Something happened") => ({
  id: "e1",
  timestamp: 1_000,
  type,
  content,
});

describe("JournalEntryRow (FR-028)", () => {
  it("shows a typed note with no automatic label", () => {
    render(JournalEntryRow, { props: { entry: entry("manual-note", "Hi") } });

    const row = screen.getByTestId("journal-entry");
    expect(row.getAttribute("data-automatic")).toBe("false");
    expect(screen.queryByTestId("journal-entry-label")).toBeNull();
    expect(row.textContent).toContain("Hi");
  });

  it.each([
    ["dice-roll", "Dice roll"],
    ["card-draw", "Card draw"],
    ["table-result", "Table result"],
  ])("labels a %s entry as %s and marks it automatic", (type, label) => {
    render(JournalEntryRow, { props: { entry: entry(type) } });

    expect(
      screen.getByTestId("journal-entry").getAttribute("data-automatic"),
    ).toBe("true");
    expect(screen.getByTestId("journal-entry-label").textContent).toContain(
      label,
    );
  });

  it("gives each known kind its own icon", () => {
    const icons = ["dice-roll", "card-draw", "table-result"].map((type) => {
      const { container, unmount } = render(JournalEntryRow, {
        props: { entry: entry(type) },
      });
      const icon = container.querySelector(
        '[data-testid="journal-entry-label"] [aria-hidden="true"]',
      )!.className;
      unmount();
      return icon;
    });
    expect(new Set(icons).size).toBe(3);
  });

  it("still shows a type it has never seen, as a generic automatic entry (negative)", () => {
    render(JournalEntryRow, {
      props: { entry: entry("generator-output", "A tavern") },
    });

    expect(screen.getByTestId("journal-entry-label").textContent).toContain(
      "Automatic entry",
    );
    expect(screen.getByTestId("journal-entry").textContent).toContain(
      "A tavern",
    );
  });

  it("renders entry text as text, never as HTML (negative)", () => {
    const { container } = render(JournalEntryRow, {
      props: {
        entry: entry("table-result", '<img src="x" onerror="alert(1)">'),
      },
    });

    expect(container.querySelector("img")).toBeNull();
    expect(container.textContent).toContain("<img");
  });

  it("shows the section name when the entry is in a section", () => {
    render(JournalEntryRow, {
      props: { entry: entry("dice-roll"), sectionName: "The Ambush" },
    });
    expect(screen.getByTestId("journal-entry").textContent).toContain(
      "The Ambush",
    );
  });

  describe("promote and choose controls (slice 4)", () => {
    it("offers Make entity when given a handler, for typed and automatic entries alike", async () => {
      for (const type of ["manual-note", "dice-roll"]) {
        const onPromote = vi.fn();
        const e = entry(type, "Something happened");
        const { unmount } = render(JournalEntryRow, {
          props: { entry: e, onPromote },
        });

        await fireEvent.click(screen.getByTestId("journal-entry-promote"));

        expect(onPromote).toHaveBeenCalledWith(e);
        unmount();
      }
    });

    it("gives the button and checkbox names that say which entry", () => {
      render(JournalEntryRow, {
        props: {
          entry: entry("manual-note", "The party arrives"),
          onPromote: vi.fn(),
          selectable: true,
        },
      });

      expect(
        screen.getByRole("button", {
          name: "Make entity from: The party arrives",
        }),
      ).toBeTruthy();
      expect(
        screen.getByRole("checkbox", { name: "Choose: The party arrives" }),
      ).toBeTruthy();
    });

    it("shows a checkbox while choosing, reflecting and toggling the choice", async () => {
      const onToggleSelect = vi.fn();
      const e = entry("manual-note", "Pick me");
      render(JournalEntryRow, {
        props: { entry: e, selectable: true, selected: true, onToggleSelect },
      });

      const box = screen.getByRole("checkbox") as HTMLInputElement;
      expect(box.checked).toBe(true);

      await fireEvent.click(box);
      expect(onToggleSelect).toHaveBeenCalledWith(e);
    });

    it("renders neither control when not asked, so rows look as before (negative)", () => {
      render(JournalEntryRow, { props: { entry: entry("manual-note", "Hi") } });

      expect(screen.queryByRole("button")).toBeNull();
      expect(screen.queryByRole("checkbox")).toBeNull();
    });

    it("shows the checkbox without a button when only choosing (negative)", () => {
      render(JournalEntryRow, {
        props: { entry: entry("manual-note", "Hi"), selectable: true },
      });

      expect(screen.getByRole("checkbox")).toBeTruthy();
      expect(screen.queryByRole("button")).toBeNull();
    });

    it("shortens a long entry in the accessible names", () => {
      render(JournalEntryRow, {
        props: {
          entry: entry("manual-note", "x".repeat(100)),
          onPromote: vi.fn(),
        },
      });

      const name = screen
        .getByTestId("journal-entry-promote")
        .getAttribute("aria-label")!;
      expect(name.length).toBeLessThan(70);
      expect(name.endsWith("…")).toBe(true);
    });
  });
});
