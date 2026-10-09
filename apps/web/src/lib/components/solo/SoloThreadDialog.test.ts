/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import type { Thread } from "solo-session-engine";
import SoloThreadDialog from "./SoloThreadDialog.svelte";

const thread: Thread = {
  id: "t1",
  title: "Why is the keeper lying?",
  kind: "mystery",
  note: "Check the logbook",
  status: "open",
  closingNote: "",
  entityIds: ["c1"],
  createdAt: 1,
  updatedAt: 1,
};

function setup(
  overrides: Record<string, unknown> = {},
  current: Thread | null = null,
) {
  const props = {
    thread: current,
    entityOptions: [
      { id: "c1", title: "Mara" },
      { id: "c2", title: "The Lighthouse" },
    ],
    onSave: vi.fn(() => null as string | null),
    onLink: vi.fn(() => null as string | null),
    onUnlink: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  };
  render(SoloThreadDialog, { props: props as never });
  return props;
}

describe("SoloThreadDialog", () => {
  it("saves a new thread with its title, kind and note", async () => {
    const props = setup();
    await fireEvent.input(screen.getByTestId("solo-thread-title"), {
      target: { value: "Find the bell" },
    });
    await fireEvent.change(screen.getByTestId("solo-thread-kind"), {
      target: { value: "objective" },
    });
    await fireEvent.input(screen.getByTestId("solo-thread-note"), {
      target: { value: "Under the chapel" },
    });
    await fireEvent.click(screen.getByTestId("solo-thread-save"));
    expect(props.onSave).toHaveBeenCalledWith({
      title: "Find the bell",
      kind: "objective",
      note: "Under the chapel",
    });
  });

  it("refuses an empty title with a message and does not save", async () => {
    const props = setup();
    await fireEvent.click(screen.getByTestId("solo-thread-save"));
    expect(screen.getByTestId("solo-thread-error").textContent).toContain(
      "Give the thread a title.",
    );
    expect(props.onSave).not.toHaveBeenCalled();
  });

  it("shows the save error the store returns, and keeps the dialog open", async () => {
    setup({
      onSave: vi.fn(
        () => "This vault has 200 threads. Close or delete one to add another.",
      ),
    });
    await fireEvent.input(screen.getByTestId("solo-thread-title"), {
      target: { value: "One too many" },
    });
    await fireEvent.click(screen.getByTestId("solo-thread-save"));
    expect(screen.getByTestId("solo-thread-error").textContent).toContain(
      "200 threads",
    );
  });

  it("limits the title to 120 and the note to 500, and counts what is left", async () => {
    setup();
    const title = screen.getByTestId("solo-thread-title") as HTMLInputElement;
    const note = screen.getByTestId("solo-thread-note") as HTMLTextAreaElement;
    expect(title.maxLength).toBe(120);
    expect(note.maxLength).toBe(500);
    await fireEvent.input(title, { target: { value: "abc" } });
    expect(screen.getByTestId("solo-thread-title-left").textContent).toContain(
      "117",
    );
  });

  it("links an entry and unlinks one already linked, when editing", async () => {
    const props = setup({}, thread);
    expect(screen.getByText("Unlink Mara")).toBeTruthy();
    await fireEvent.click(screen.getByText("Unlink Mara"));
    expect(props.onUnlink).toHaveBeenCalledWith("c1");
    await fireEvent.change(screen.getByTestId("solo-thread-link-choice"), {
      target: { value: "c2" },
    });
    await fireEvent.click(screen.getByText("Link"));
    expect(props.onLink).toHaveBeenCalledWith("c2");
  });

  it("does not offer links for a new thread, and cancel closes without saving", async () => {
    const props = setup();
    expect(screen.queryByText("Linked entries")).toBeNull();
    await fireEvent.click(screen.getByText("Cancel"));
    expect(props.onClose).toHaveBeenCalledOnce();
    expect(props.onSave).not.toHaveBeenCalled();
  });
});
