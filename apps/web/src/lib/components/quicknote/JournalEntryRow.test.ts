/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import JournalEntryRow from "./JournalEntryRow.svelte";

vi.mock("$lib/components/MarkdownEditor.svelte", async () => ({
  default: (await import("./test-support/markdown-editor-stub"))
    .markdownEditorStub,
}));

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

  describe("roll breakdown (#3443)", () => {
    const parts = [
      { type: "dice", sides: 6, rolls: [6, 5, 3], dropped: [1], value: 14 },
    ];

    it("expands the saved dice of a roll without re-rolling", async () => {
      render(JournalEntryRow, {
        props: {
          entry: {
            ...entry("dice-roll", "Rolled 4d6kh3: 14"),
            sourceRef: { formula: "4d6kh3", total: 14, parts },
          },
        },
      });

      await fireEvent.click(screen.getByTestId("dice-disclosure-toggle"));

      expect(
        screen.getAllByTestId("dice-kept").map((el) => el.textContent),
      ).toEqual(["6", "5", "3"]);
      expect(
        screen.getAllByTestId("dice-dropped").map((el) => el.textContent),
      ).toEqual(["1"]);
      expect(screen.getByTestId("dice-breakdown-total").textContent).toBe("14");
    });

    it("shows the dice behind a table result too", () => {
      render(JournalEntryRow, {
        props: {
          entry: {
            ...entry("table-result", "Encounters: a merchant"),
            sourceRef: { total: 14, parts },
          },
        },
      });

      expect(screen.getByTestId("dice-disclosure-toggle")).toBeTruthy();
    });

    it("offers no breakdown for an older entry with no saved dice (negative)", () => {
      render(JournalEntryRow, {
        props: {
          entry: {
            ...entry("table-result", "Encounters: a merchant"),
            sourceRef: { total: 14, formula: "4d6kh3" },
          },
        },
      });

      expect(screen.queryByTestId("dice-disclosure-toggle")).toBeNull();
    });

    it("ignores a damaged trace rather than showing wrong dice (negative)", () => {
      render(JournalEntryRow, {
        props: {
          entry: {
            ...entry("dice-roll", "Rolled 2d6: 7"),
            sourceRef: { total: 7, parts: [{ type: "dice", rolls: "4,3" }] },
          },
        },
      });

      expect(screen.queryByTestId("dice-disclosure-toggle")).toBeNull();
    });

    it("hides a trace whose subtotal disagrees with the saved total (negative)", () => {
      render(JournalEntryRow, {
        props: {
          entry: {
            ...entry("dice-roll", "Rolled 4d6kh3: 14"),
            sourceRef: {
              total: 15,
              parts: [
                { type: "dice", rolls: [6, 5, 3], dropped: [1], value: 14 },
              ],
            },
          },
        },
      });

      expect(screen.queryByTestId("dice-disclosure-toggle")).toBeNull();
    });
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

describe("JournalEntryRow — Markdown formatting (#3481)", () => {
  it("renders bold, italic and a bullet list in a typed note", () => {
    render(JournalEntryRow, {
      props: {
        entry: entry(
          "manual-note",
          "**Found a key** in the *drowned crypt*.\n- It is cold to the touch",
        ),
      },
    });

    const content = screen.getByTestId("journal-entry-content");
    expect(content.querySelector("strong")?.textContent).toBe("Found a key");
    expect(content.querySelector("em")?.textContent).toBe("drowned crypt");
    expect(content.querySelector("li")?.textContent).toBe(
      "It is cold to the touch",
    );
  });

  it("turns a single line break into a visible break, not a run-on sentence", () => {
    render(JournalEntryRow, {
      props: { entry: entry("manual-note", "Line one\nLine two") },
    });

    const content = screen.getByTestId("journal-entry-content");
    expect(content.innerHTML).toContain("<br");
  });

  it("never interprets an automatic entry's text as Markdown (negative)", () => {
    render(JournalEntryRow, {
      props: { entry: entry("dice-roll", "Rolled **2d6**: 9") },
    });

    expect(screen.queryByTestId("journal-entry-content")).toBeNull();
    expect(screen.getByText("Rolled **2d6**: 9")).toBeTruthy();
  });

  it("still renders an older, unformatted plain-text entry correctly", () => {
    render(JournalEntryRow, {
      props: { entry: entry("manual-note", "Just plain text, nothing fancy") },
    });

    expect(screen.getByTestId("journal-entry-content").textContent).toContain(
      "Just plain text, nothing fancy",
    );
  });

  it("keeps the edited Markdown on save", async () => {
    const onEdit = vi.fn().mockResolvedValue({ ok: true } as const);
    render(JournalEntryRow, {
      props: { entry: entry("manual-note", "Plain"), onEdit },
    });

    await fireEvent.click(screen.getByTestId("journal-entry-edit"));
    const input = screen.getByTestId(
      "journal-entry-edit-input",
    ) as HTMLTextAreaElement;
    await fireEvent.input(input, { target: { value: "**Plain**" } });
    await fireEvent.click(screen.getByTestId("journal-entry-edit-save"));

    expect(onEdit).toHaveBeenCalledWith(
      expect.objectContaining({ content: "Plain" }),
      "**Plain**",
    );
  });
});

describe("JournalEntryRow — edit, delete and move (#3476)", () => {
  const ok = { ok: true } as const;

  it("offers Edit only for a typed note, not an automatic entry", () => {
    render(JournalEntryRow, {
      props: { entry: entry("manual-note"), onEdit: vi.fn() },
    });
    expect(screen.getByTestId("journal-entry-edit")).toBeTruthy();
  });

  it("does not offer Edit for an automatic entry, even when onEdit is given (negative)", () => {
    render(JournalEntryRow, {
      props: { entry: entry("dice-roll"), onEdit: vi.fn() },
    });
    expect(screen.queryByTestId("journal-entry-edit")).toBeNull();
  });

  it("does not offer Edit when no handler is given (negative)", () => {
    render(JournalEntryRow, { props: { entry: entry("manual-note") } });
    expect(screen.queryByTestId("journal-entry-edit")).toBeNull();
  });

  it("edits the text and calls back with the new content", async () => {
    const onEdit = vi.fn().mockResolvedValue(ok);
    render(JournalEntryRow, {
      props: { entry: entry("manual-note", "Original"), onEdit },
    });

    await fireEvent.click(screen.getByTestId("journal-entry-edit"));
    const input = screen.getByTestId(
      "journal-entry-edit-input",
    ) as HTMLTextAreaElement;
    expect(input.value).toBe("Original");
    await fireEvent.input(input, { target: { value: "Edited" } });
    await fireEvent.click(screen.getByTestId("journal-entry-edit-save"));

    expect(onEdit).toHaveBeenCalledWith(
      expect.objectContaining({ content: "Original" }),
      "Edited",
    );
    expect(screen.queryByTestId("journal-entry-edit-input")).toBeNull();
  });

  it("cancels an edit without calling back, restoring the original text", async () => {
    const onEdit = vi.fn().mockResolvedValue(ok);
    render(JournalEntryRow, {
      props: { entry: entry("manual-note", "Original"), onEdit },
    });

    await fireEvent.click(screen.getByTestId("journal-entry-edit"));
    await fireEvent.input(screen.getByTestId("journal-entry-edit-input"), {
      target: { value: "Changed my mind" },
    });
    await fireEvent.click(screen.getByTestId("journal-entry-edit-cancel"));

    expect(onEdit).not.toHaveBeenCalled();
    expect(screen.getByText("Original")).toBeTruthy();

    await fireEvent.click(screen.getByTestId("journal-entry-edit"));
    expect(
      (screen.getByTestId("journal-entry-edit-input") as HTMLTextAreaElement)
        .value,
    ).toBe("Original");
  });

  it("shows the failure and keeps editing when saving is refused (negative)", async () => {
    const onEdit = vi
      .fn()
      .mockResolvedValue({ ok: false, error: "A note needs some text." });
    render(JournalEntryRow, {
      props: { entry: entry("manual-note", "Original"), onEdit },
    });

    await fireEvent.click(screen.getByTestId("journal-entry-edit"));
    await fireEvent.input(screen.getByTestId("journal-entry-edit-input"), {
      target: { value: "   " },
    });
    await fireEvent.click(screen.getByTestId("journal-entry-edit-save"));

    expect(screen.getByRole("alert").textContent).toBe(
      "A note needs some text.",
    );
    expect(screen.getByTestId("journal-entry-edit-input")).toBeTruthy();
  });

  it("hides the move and delete buttons while editing", async () => {
    render(JournalEntryRow, {
      props: {
        entry: entry("manual-note"),
        onEdit: vi.fn(),
        onDelete: vi.fn(),
        onMoveUp: vi.fn(),
        canMoveUp: true,
      },
    });

    await fireEvent.click(screen.getByTestId("journal-entry-edit"));

    expect(screen.queryByTestId("journal-entry-delete")).toBeNull();
    expect(screen.queryByTestId("journal-entry-move-up")).toBeNull();
  });

  it("deletes on request", async () => {
    const onDelete = vi.fn().mockResolvedValue(ok);
    const e = entry("manual-note", "Gone soon");
    render(JournalEntryRow, { props: { entry: e, onDelete } });

    await fireEvent.click(screen.getByTestId("journal-entry-delete"));

    expect(onDelete).toHaveBeenCalledWith(e);
  });

  it("shows a message when delete fails, without crashing (negative)", async () => {
    const onDelete = vi
      .fn()
      .mockResolvedValue({ ok: false, error: "That entry no longer exists." });
    render(JournalEntryRow, {
      props: { entry: entry("manual-note"), onDelete },
    });

    await fireEvent.click(screen.getByTestId("journal-entry-delete"));

    expect(screen.getByRole("alert").textContent).toBe(
      "That entry no longer exists.",
    );
  });

  it("moves up and down, disabled at the boundary it is told about", async () => {
    const onMoveUp = vi.fn().mockResolvedValue(ok);
    const onMoveDown = vi.fn().mockResolvedValue(ok);
    const e = entry("manual-note");
    render(JournalEntryRow, {
      props: {
        entry: e,
        onMoveUp,
        onMoveDown,
        canMoveUp: false,
        canMoveDown: true,
      },
    });

    expect(
      (screen.getByTestId("journal-entry-move-up") as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    const down = screen.getByTestId(
      "journal-entry-move-down",
    ) as HTMLButtonElement;
    expect(down.disabled).toBe(false);

    await fireEvent.click(down);
    expect(onMoveDown).toHaveBeenCalledWith(e);
    expect(onMoveUp).not.toHaveBeenCalled();
  });

  it("moving an automatic entry works the same as a typed note", async () => {
    const onMoveUp = vi.fn().mockResolvedValue(ok);
    render(JournalEntryRow, {
      props: { entry: entry("dice-roll"), onMoveUp, canMoveUp: true },
    });

    await fireEvent.click(screen.getByTestId("journal-entry-move-up"));

    expect(onMoveUp).toHaveBeenCalledTimes(1);
  });

  it("does not offer move or delete controls when neither handler is given (negative)", () => {
    render(JournalEntryRow, { props: { entry: entry("manual-note") } });

    expect(screen.queryByTestId("journal-entry-move-up")).toBeNull();
    expect(screen.queryByTestId("journal-entry-move-down")).toBeNull();
    expect(screen.queryByTestId("journal-entry-delete")).toBeNull();
  });

  it("clicking a disabled boundary button does nothing (negative)", async () => {
    const onMoveUp = vi.fn();
    render(JournalEntryRow, {
      props: { entry: entry("manual-note"), onMoveUp, canMoveUp: false },
    });

    await fireEvent.click(screen.getByTestId("journal-entry-move-up"));

    expect(onMoveUp).not.toHaveBeenCalled();
  });
});
