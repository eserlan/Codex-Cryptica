/** @vitest-environment jsdom */

import { cleanup, render, screen, waitFor } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The Oracle's pending prompt is what a solo shortcut leaves behind (FR-019).
const env = vi.hoisted(() => {
  const ui = {
    pendingPrompt: null as string | null,
    takePendingPrompt() {
      const prompt = this.pendingPrompt;
      this.pendingPrompt = null;
      return prompt;
    },
  };
  return {
    ui,
    oracle: {
      ui,
      messages: [] as unknown[],
      isEnabled: true,
      isLoading: false,
      isThinking: false,
      ask: vi.fn(),
    },
  };
});

vi.mock("$lib/stores/oracle.svelte", () => ({ oracle: env.oracle }));

import OracleChat from "./OracleChat.svelte";

describe("OracleChat solo prefill", () => {
  beforeEach(() => {
    env.ui.pendingPrompt = null;
    env.oracle.ask.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it("fills the input with a waiting shortcut prompt, clears it, and sends nothing", async () => {
    env.ui.pendingPrompt = "How does this NPC react? Scene: Arrival.";
    render(OracleChat);

    const input = screen.getByTestId("oracle-input") as HTMLTextAreaElement;
    await waitFor(() =>
      expect(input.value).toBe("How does this NPC react? Scene: Arrival."),
    );
    expect(env.ui.pendingPrompt).toBeNull();
    expect(env.oracle.ask).not.toHaveBeenCalled();
  });

  it("leaves the input empty when no prompt is waiting", () => {
    render(OracleChat);

    const input = screen.getByTestId("oracle-input") as HTMLTextAreaElement;
    expect(input.value).toBe("");
    expect(env.oracle.ask).not.toHaveBeenCalled();
  });
});
