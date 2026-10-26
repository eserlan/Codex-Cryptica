/** @vitest-environment jsdom */
import { render, screen, waitFor } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CIF_CHANNEL } from "$lib/services/help-assistant/cif-popout-protocol";
import Page from "./+page.svelte";

beforeEach(() => {
  if (!Element.prototype.animate) {
    Element.prototype.animate = vi.fn(
      () =>
        ({
          finished: Promise.resolve(),
          cancel: vi.fn(),
          play: vi.fn(),
        }) as unknown as Animation,
    );
  }
});

afterEach(() => vi.unstubAllGlobals());

describe("Cif pop-out page", () => {
  it("waits for the main window, then shows its conversation", async () => {
    render(Page);
    expect(
      await screen.findByText(/Waiting for the Codex Cryptica window/),
    ).toBeTruthy();

    const main = new BroadcastChannel(CIF_CHANNEL);
    main.postMessage({
      type: "snapshot",
      snapshot: {
        status: "answered",
        messages: [{ id: 1, role: "user", text: "Where is the ruler?" }],
        offer: null,
        notice: null,
        quickPrompts: [],
        isPending: false,
      },
    });

    await waitFor(() => screen.getByText("Where is the ruler?"));
    expect(
      screen.queryByText(/Waiting for the Codex Cryptica window/),
    ).toBeNull();
    main.close();
  });

  it("explains itself when the browser cannot link windows", async () => {
    vi.stubGlobal("BroadcastChannel", undefined);
    render(Page);

    expect(
      await screen.findByText(/cannot link Cif to the main window/),
    ).toBeTruthy();
    expect(screen.queryByTestId("help-assistant-panel")).toBeNull();
  });
});
