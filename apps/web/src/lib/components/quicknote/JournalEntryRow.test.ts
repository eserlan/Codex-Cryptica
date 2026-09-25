/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
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
});
