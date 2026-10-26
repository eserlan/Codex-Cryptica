/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";

vi.mock("$lib/stores/vault.svelte", () => ({
  vault: { isGuest: false },
}));

import TextNode from "./TextNode.svelte";

describe("TextNode", () => {
  it("renders the note's text and reports edits", async () => {
    const onUpdateText = vi.fn();
    render(TextNode, {
      props: {
        data: { text: "hello", onUpdateText },
        selected: false,
      } as any,
    });

    const textarea = screen.getByRole("textbox", { name: "Canvas text note" });
    expect((textarea as HTMLTextAreaElement).value).toBe("hello");

    await fireEvent.input(textarea, { target: { value: "hello world" } });
    expect(onUpdateText).toHaveBeenCalledWith({ text: "hello world" });
  });

  it("is read-only when locked", () => {
    render(TextNode, {
      props: {
        data: { text: "locked note", locked: true },
        selected: false,
      } as any,
    });

    const textarea = screen.getByRole("textbox", {
      name: "Canvas text note",
    }) as HTMLTextAreaElement;
    expect(textarea.readOnly).toBe(true);
  });

  it("applies the requested font size", () => {
    render(TextNode, {
      props: {
        data: { text: "big note", fontSize: 24 },
        selected: false,
      } as any,
    });

    const textarea = screen.getByRole("textbox", { name: "Canvas text note" });
    expect(textarea.style.fontSize).toBe("24px");
  });

  it("falls back to the default font size for invalid data", () => {
    render(TextNode, {
      props: {
        data: { text: "note", fontSize: Number.NaN },
        selected: false,
      } as any,
    });

    const textarea = screen.getByRole("textbox", { name: "Canvas text note" });
    expect(textarea.style.fontSize).toBe("14px");
  });

  it("resolves a named background preset to its themed CSS value", () => {
    const { container } = render(TextNode, {
      props: {
        data: { text: "accent note", background: "accent" },
        selected: false,
      } as any,
    });

    const card = container.querySelector(".relative") as HTMLElement;
    expect(card.style.backgroundColor).toContain("var(--color-theme-accent)");
  });

  it("drops the shadow and uses a dashed border for a transparent background", () => {
    const { container } = render(TextNode, {
      props: {
        data: { text: "ghost note", background: "transparent" },
        selected: false,
      } as any,
    });

    const card = container.querySelector(".relative") as HTMLElement;
    expect(card.style.backgroundColor).toBe("transparent");
    expect(card.className).not.toContain("shadow-lg");
    expect(card.className).toContain("border-dashed");
  });
});
