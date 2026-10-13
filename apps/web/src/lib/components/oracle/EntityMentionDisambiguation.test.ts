/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import EntityMentionDisambiguation from "./EntityMentionDisambiguation.svelte";

const candidates = [
  { id: "e-elena-1", title: "Elena", type: "character" },
  { id: "e-elena-2", title: "Elena", type: "location" },
];

describe("EntityMentionDisambiguation", () => {
  it("lists every candidate for the ambiguous name", () => {
    render(EntityMentionDisambiguation, {
      props: {
        name: "elena",
        candidates,
        onChoose: vi.fn(),
        onSendAsText: vi.fn(),
      },
    });
    const buttons = screen.getAllByRole("button", { name: /Elena/ });
    expect(buttons).toHaveLength(2);
    expect(buttons[0].textContent).toContain("character");
    expect(buttons[1].textContent).toContain("location");
  });

  it("reports the chosen candidate id", async () => {
    const onChoose = vi.fn();
    render(EntityMentionDisambiguation, {
      props: { name: "elena", candidates, onChoose, onSendAsText: vi.fn() },
    });
    await fireEvent.click(screen.getAllByRole("button", { name: /Elena/ })[1]);
    expect(onChoose).toHaveBeenCalledWith("e-elena-2");
  });

  it("sends the text without attaching any entity when the user declines to choose", async () => {
    const onChoose = vi.fn();
    const onSendAsText = vi.fn();
    render(EntityMentionDisambiguation, {
      props: { name: "elena", candidates, onChoose, onSendAsText },
    });
    await fireEvent.click(
      screen.getByRole("button", { name: /send as plain text/i }),
    );
    expect(onSendAsText).toHaveBeenCalled();
    expect(onChoose).not.toHaveBeenCalled();
  });
});
