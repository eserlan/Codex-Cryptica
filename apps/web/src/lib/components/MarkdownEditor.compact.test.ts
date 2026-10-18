/** @vitest-environment jsdom */

import { render, screen, waitFor } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";

vi.mock("$app/navigation", () => ({ goto: vi.fn() }));
vi.mock("$lib/stores/vault.svelte", () => ({
  vault: { resolveImageUrl: vi.fn(), releaseImageUrl: vi.fn() },
}));

import MarkdownEditor from "./MarkdownEditor.svelte";

describe("MarkdownEditor compact variant", () => {
  it("shows Markdown as formatted text, not syntax, in one field", async () => {
    render(MarkdownEditor, {
      props: {
        content: "**bold** and *italic*",
        compact: true,
        label: "Journal note",
        testId: "note",
      },
    });

    const surface = await screen.findByTestId("note");
    await waitFor(() => expect(surface.querySelector("strong")).not.toBeNull());
    expect(surface.querySelector("em")).not.toBeNull();
    expect(surface.textContent).not.toContain("**");
    // Same field, not a second preview beside it.
    expect(document.querySelectorAll(".ProseMirror")).toHaveLength(1);
  });

  it("offers inline marks and lists but no headings, table or Zen mode", async () => {
    render(MarkdownEditor, {
      props: { content: "", compact: true, label: "Journal note" },
    });

    await screen.findByLabelText("Bold (Cmd+B)");
    expect(screen.getByLabelText("Bullet List")).toBeTruthy();
    expect(screen.queryByLabelText("Heading 1")).toBeNull();
    expect(screen.queryByLabelText("Insert Table")).toBeNull();
    expect(screen.queryByLabelText(/zen mode/i)).toBeNull();
  });

  it("keeps the full toolbar by default (negative)", async () => {
    render(MarkdownEditor, { props: { content: "" } });

    await screen.findByLabelText("Heading 1");
    expect(screen.getByLabelText("Insert Table")).toBeTruthy();
    expect(screen.getByLabelText(/zen mode/i)).toBeTruthy();
  });
});
