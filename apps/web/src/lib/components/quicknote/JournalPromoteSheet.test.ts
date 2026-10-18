/** @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import type { PromotionScope, SessionJournal } from "session-journal-engine";
import JournalPromoteSheet from "./JournalPromoteSheet.svelte";

const journal: SessionJournal = {
  id: "j1",
  vaultId: "v1",
  title: "Session one",
  status: "ended",
  startedAt: 1,
  sections: [{ id: "s1", name: "The Ambush" }],
  entries: [
    {
      id: "e1",
      timestamp: 10,
      type: "manual-note",
      content: "The party arrives",
    },
    {
      id: "e2",
      timestamp: 20,
      type: "dice-roll",
      content: "Rolled 1d20: 14",
      sectionId: "s1",
    },
  ],
};

const categories = [
  { id: "character", label: "Character" },
  { id: "event", label: "Event" },
  { id: "note", label: "Note" },
];

const formatTime = (t: number) => `T${t}`;

function mount(
  props: {
    scope?: PromotionScope;
    journal?: SessionJournal;
    onSubmit?: (type: string, title: string) => Promise<any>;
    onCancel?: () => void;
  } = {},
) {
  const onSubmit = props.onSubmit ?? vi.fn().mockResolvedValue({ ok: true });
  const onCancel = props.onCancel ?? vi.fn();
  render(JournalPromoteSheet, {
    props: {
      journal: props.journal ?? journal,
      scope: props.scope ?? { kind: "entry", entryId: "e1" },
      categories,
      formatTime,
      onSubmit,
      onCancel,
    },
  });
  return { onSubmit, onCancel };
}

const nameInput = () => screen.getByLabelText("Name") as HTMLInputElement;
const typeSelect = () => screen.getByLabelText("Type") as HTMLSelectElement;
const createButton = () =>
  screen.getByRole("button", { name: /create draft/i }) as HTMLButtonElement;

describe("JournalPromoteSheet", () => {
  it("pre-fills the name and lists the given categories with Note chosen", () => {
    mount();

    expect(nameInput().value).toBe("The party arrives");
    expect([...typeSelect().options].map((o) => o.textContent?.trim())).toEqual(
      ["Character", "Event", "Note"],
    );
    expect(typeSelect().value).toBe("note");
  });

  it("names a whole-journal promotion after the journal", () => {
    mount({ scope: { kind: "journal" } });
    expect(nameInput().value).toBe("Session one");
  });

  it("gives the chosen type and name to the handler", async () => {
    const { onSubmit } = mount();

    await fireEvent.change(typeSelect(), { target: { value: "event" } });
    await fireEvent.input(nameInput(), { target: { value: "Arrival" } });
    await fireEvent.click(createButton());

    expect(onSubmit).toHaveBeenCalledWith("event", "Arrival");
  });

  it("shows the start of the body as a preview", () => {
    mount({ scope: { kind: "journal" } });

    const preview = screen.getByTestId("promote-preview");
    expect(preview.textContent).toContain("# Session one");
    expect(preview.textContent).toContain("The party arrives");
  });

  it("cuts a long preview at 600 characters with an ellipsis, and leaves a short one alone", () => {
    const long: SessionJournal = {
      ...journal,
      entries: [
        {
          id: "e1",
          timestamp: 1,
          type: "manual-note",
          content: "x".repeat(2000),
        },
      ],
    };
    mount({ journal: long, scope: { kind: "entry", entryId: "e1" } });

    const text = screen.getByTestId("promote-preview").textContent ?? "";
    expect(text.length).toBe(601);
    expect(text.endsWith("…")).toBe(true);
  });

  it("does not add an ellipsis to a short preview", () => {
    mount();
    expect(screen.getByTestId("promote-preview").textContent).toBe(
      "The party arrives",
    );
  });

  it("puts focus in the name field when it opens", async () => {
    mount();
    await waitFor(() => expect(document.activeElement).toBe(nameInput()));
  });

  it("calls the cancel handler from the Cancel button and from Escape", async () => {
    const { onCancel } = mount();

    await fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    await fireEvent.keyDown(nameInput(), { key: "Escape" });

    expect(onCancel).toHaveBeenCalledTimes(2);
  });

  it("keeps Escape to itself, so the app's own Escape shortcut does not also close the panel", async () => {
    mount();
    const reachedWindow = vi.fn();
    window.addEventListener("keydown", reachedWindow);

    await fireEvent.keyDown(nameInput(), { key: "Escape" });

    window.removeEventListener("keydown", reachedWindow);
    expect(reachedWindow).not.toHaveBeenCalled();
  });

  it("labels its fields and its buttons", () => {
    mount();
    expect(screen.getByLabelText("Name")).toBeTruthy();
    expect(screen.getByLabelText("Type")).toBeTruthy();
    for (const button of screen.getAllByRole("button")) {
      expect(button.getAttribute("type")).toBe("button");
    }
  });

  describe("refuses (negative)", () => {
    it("a blank name, with a plain message and no call", async () => {
      const { onSubmit } = mount();

      await fireEvent.input(nameInput(), { target: { value: "   " } });
      await fireEvent.click(createButton());

      expect(onSubmit).not.toHaveBeenCalled();
      expect(screen.getByRole("alert").textContent).toContain("give it a name");
    });

    it("to close on a failed create: shows the message, keeps the values, and can try again", async () => {
      const onSubmit = vi
        .fn()
        .mockResolvedValueOnce({ ok: false, error: "Could not do it." })
        .mockResolvedValueOnce({ ok: true });
      mount({ onSubmit });

      await fireEvent.change(typeSelect(), { target: { value: "event" } });
      await fireEvent.input(nameInput(), { target: { value: "Kept name" } });
      await fireEvent.click(createButton());

      await waitFor(() =>
        expect(screen.getByRole("alert").textContent).toContain(
          "Could not do it.",
        ),
      );
      expect(nameInput().value).toBe("Kept name");
      expect(typeSelect().value).toBe("event");
      expect(createButton().disabled).toBe(false);

      await fireEvent.click(createButton());
      expect(onSubmit).toHaveBeenCalledTimes(2);
    });

    it("a second press while the first is still running", async () => {
      let finish!: (value: { ok: true }) => void;
      const onSubmit = vi.fn(
        () => new Promise<{ ok: true }>((resolve) => (finish = resolve)),
      );
      mount({ onSubmit });

      await fireEvent.click(createButton());
      await fireEvent.click(createButton());

      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(createButton().disabled).toBe(true);
      finish({ ok: true });
    });

    it("something with nothing to make: says why and disables Create", () => {
      mount({
        scope: { kind: "selection", entryIds: [], sectionIds: [] },
      });

      expect(screen.getByTestId("promote-reason").textContent).toContain(
        "nothing here to turn into an entity",
      );
      expect(createButton().disabled).toBe(true);
    });
  });
});
