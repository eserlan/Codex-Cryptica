/** @vitest-environment jsdom */
import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import HelpAssistantComposer from "./HelpAssistantComposer.svelte";

const box = () =>
  screen.getByLabelText(/Ask Cif a question/i) as HTMLTextAreaElement;
const type = (value: string) => fireEvent.input(box(), { target: { value } });
const ask = () => fireEvent.click(screen.getByRole("button", { name: "Ask" }));

function setup(onAsk: (text: string) => Promise<boolean>, pending = false) {
  render(HelpAssistantComposer, {
    pending,
    notice: null,
    focusWhen: false,
    onAsk,
  });
}

describe("HelpAssistantComposer", () => {
  it("empties the box as soon as the question is sent, so the user can keep typing", async () => {
    let release!: (started: boolean) => void;
    setup(() => new Promise((resolve) => (release = resolve)));
    await type("How do I connect the faction?");
    await ask();
    expect(box().value).toBe("");

    // Typing while the answer is pending survives the answer arriving.
    await type("and then?");
    release(true);
    await waitFor(() => expect(box().value).toBe("and then?"));
  });

  it("hands back the question if it was never sent, such as after a cancel", async () => {
    setup(async () => false);
    await type("Something I cancelled");
    await ask();
    await waitFor(() => expect(box().value).toBe("Something I cancelled"));
  });

  it("does not overwrite what the user typed in the meantime when handing a question back", async () => {
    let release!: (started: boolean) => void;
    setup(() => new Promise((resolve) => (release = resolve)));
    await type("First");
    await ask();
    await type("Second");
    release(false);
    await waitFor(() => expect(box().value).toBe("Second"));
  });

  it("does not send an empty or whitespace-only question", async () => {
    const onAsk = vi.fn(async () => true);
    setup(onAsk);
    await type("   ");
    await fireEvent.keyDown(box(), { key: "Enter" });
    expect(onAsk).not.toHaveBeenCalled();
  });

  it("does not send again while an answer is pending", async () => {
    const onAsk = vi.fn(async () => true);
    setup(onAsk, true);
    await type("another");
    await fireEvent.keyDown(box(), { key: "Enter" });
    expect(onAsk).not.toHaveBeenCalled();
  });
});
