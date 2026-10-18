import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  popout: { connected: false, open: vi.fn() },
  assistant: { open: vi.fn(), ask: vi.fn(async () => true) },
}));

vi.mock("./help-runtime", () => ({
  cifPopout: mocks.popout,
  helpAssistant: mocks.assistant,
}));

import { askCifPrompt } from "./ask-cif";

describe("askCifPrompt", () => {
  it("opens the docked panel and asks the prompt when the pop-out is closed", () => {
    mocks.popout.connected = false;
    askCifPrompt("How do I drop a pin on the map?");
    expect(mocks.assistant.open).toHaveBeenCalledTimes(1);
    expect(mocks.popout.open).not.toHaveBeenCalled();
    expect(mocks.assistant.ask).toHaveBeenCalledWith(
      "How do I drop a pin on the map?",
    );
  });

  it("brings the pop-out forward when it is connected, and asks there (negative: not the docked panel)", () => {
    mocks.popout.connected = true;
    askCifPrompt("What is the graph for?");
    expect(mocks.popout.open).toHaveBeenCalledTimes(1);
    expect(mocks.assistant.open).not.toHaveBeenCalled();
    expect(mocks.assistant.ask).toHaveBeenLastCalledWith(
      "What is the graph for?",
    );
  });
});
