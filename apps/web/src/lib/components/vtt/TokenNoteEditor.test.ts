/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import TokenNoteEditor from "./TokenNoteEditor.svelte";

function renderEditor(body: string, props: Record<string, unknown> = {}) {
  const onChange = vi.fn();
  render(TokenNoteEditor, { props: { body, onChange, ...props } });
  const textarea = screen.getByTestId("token-note-body") as HTMLTextAreaElement;
  return { onChange, textarea };
}

/** Puts the caret where the GM would have left it before hitting a button. */
function select(textarea: HTMLTextAreaElement, start: number, end: number) {
  textarea.setSelectionRange(start, end);
}

describe("TokenNoteEditor formatting toolbar", () => {
  it("wraps the selection in bold markers", async () => {
    const { onChange, textarea } = renderEditor("2 goblins arguing");
    select(textarea, 0, 9);

    await fireEvent.click(screen.getByTestId("token-note-format-bold"));

    expect(onChange).toHaveBeenCalledWith("**2 goblins** arguing");
  });

  it("wraps the selection in italic markers", async () => {
    const { onChange, textarea } = renderEditor("2 goblins arguing");
    select(textarea, 10, 17);

    await fireEvent.click(screen.getByTestId("token-note-format-italic"));

    expect(onChange).toHaveBeenCalledWith("2 goblins *arguing*");
  });

  it("opens an empty marker pair when nothing is selected", async () => {
    const { onChange, textarea } = renderEditor("");
    select(textarea, 0, 0);

    await fireEvent.click(screen.getByTestId("token-note-format-bold"));

    expect(onChange).toHaveBeenCalledWith("****");
  });

  it("marks the line the caret sits on as a heading", async () => {
    const { onChange, textarea } = renderEditor("Guard post\n2 goblins");
    select(textarea, 3, 3);

    await fireEvent.click(screen.getByTestId("token-note-format-heading"));

    expect(onChange).toHaveBeenCalledWith("## Guard post\n2 goblins");
  });

  it("takes the heading marker back off a line that already has one", async () => {
    const { onChange, textarea } = renderEditor("## Guard post");
    select(textarea, 5, 5);

    await fireEvent.click(screen.getByTestId("token-note-format-heading"));

    expect(onChange).toHaveBeenCalledWith("Guard post");
  });

  it("bullets every line the selection touches", async () => {
    const { onChange, textarea } = renderEditor("one\ntwo\nthree");
    select(textarea, 1, 9);

    await fireEvent.click(screen.getByTestId("token-note-format-bullet"));

    expect(onChange).toHaveBeenCalledWith("- one\n- two\n- three");
  });

  it("takes the bullets back off a block that is already a list", async () => {
    const { onChange, textarea } = renderEditor("- one\n- two");
    select(textarea, 0, 11);

    await fireEvent.click(screen.getByTestId("token-note-format-bullet"));

    expect(onChange).toHaveBeenCalledWith("one\ntwo");
  });

  it("gives a read-only note no toolbar to format with", () => {
    renderEditor("2 goblins", { disabled: true });

    expect(screen.queryByTestId("token-note-format-toolbar")).toBeNull();
  });
});
