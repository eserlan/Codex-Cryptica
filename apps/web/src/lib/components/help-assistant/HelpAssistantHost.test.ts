/** @vitest-environment jsdom */
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { discoveryPolicyStore } from "$lib/stores/ui/discovery-policy.svelte";
import {
  cifPopout,
  helpAssistant,
  helpActionRunner,
  toggleCif,
} from "$lib/stores/help-assistant/help-runtime";
import { helpHighlight } from "$lib/services/help-assistant/help-highlight.svelte";
import HelpAssistantHost from "./HelpAssistantHost.svelte";

vi.mock("$app/navigation", () => ({ goto: vi.fn(), afterNavigate: vi.fn() }));
vi.mock("$app/state", () => ({ page: { route: { id: "/(app)" } } }));
vi.mock("$lib/stores/help.svelte", () => ({
  helpStore: { openHelpToArticle: vi.fn(), openHelpWindow: vi.fn() },
}));

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

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  discoveryPolicyStore.aiDisabled = false;
  helpAssistant.reset();
  helpAssistant.close();
});

describe("HelpAssistantHost", () => {
  it("shows nothing while the flag is off, so users get static help only", () => {
    vi.stubEnv("VITE_HELP_ASSISTANT", "");
    render(HelpAssistantHost);
    expect(screen.queryByTestId("help-assistant-panel")).toBeNull();
  });

  it("shows nothing when the user has turned AI off", () => {
    vi.stubEnv("VITE_HELP_ASSISTANT", "true");
    discoveryPolicyStore.aiDisabled = true;
    render(HelpAssistantHost);
    expect(screen.queryByTestId("help-assistant-panel")).toBeNull();
  });

  it("opens and closes the panel via the assistant store", async () => {
    vi.stubEnv("VITE_HELP_ASSISTANT", "true");
    render(HelpAssistantHost);
    helpAssistant.open();
    const dialog = await waitFor(() =>
      screen.getByRole("dialog", { name: "Cif, the Codex guide" }),
    );
    expect(dialog.getAttribute("tabindex")).toBe("-1");
    await fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Close Cif",
      }),
    );
    await waitFor(() => expect(helpAssistant.isOpen).toBe(false));
  });

  it("closes, resets and clears a highlight when AI is turned off while help is open", async () => {
    vi.stubEnv("VITE_HELP_ASSISTANT", "true");
    const clear = vi.spyOn(helpHighlight, "clear");
    render(HelpAssistantHost);
    helpAssistant.open();
    await waitFor(() => screen.getByRole("dialog"));
    discoveryPolicyStore.aiDisabled = true;
    await waitFor(() => expect(helpAssistant.isOpen).toBe(false));
    expect(helpAssistant.messages).toEqual([]);
    expect(clear).toHaveBeenCalled();
  });

  it("steps out of the way after a guide runs, so the control is visible, and stays open if it could not run", async () => {
    vi.stubEnv("VITE_HELP_ASSISTANT", "true");
    const run = vi.spyOn(helpActionRunner, "run");
    render(HelpAssistantHost);
    helpAssistant.offer = {
      type: "openPanel",
      panel: "status-tab",
      label: "Open the Status tab",
    };
    helpAssistant.open();
    await waitFor(() => screen.getByRole("button", { name: "Show me" }));

    run.mockResolvedValueOnce(false);
    await fireEvent.click(screen.getByRole("button", { name: "Show me" }));
    await waitFor(() => expect(run).toHaveBeenCalledTimes(1));
    expect(helpAssistant.isOpen).toBe(true);

    helpAssistant.offer = {
      type: "openPanel",
      panel: "status-tab",
      label: "Open the Status tab",
    };
    run.mockResolvedValueOnce(true);
    await waitFor(() => screen.getByRole("button", { name: "Show me" }));
    await fireEvent.click(screen.getByRole("button", { name: "Show me" }));
    await waitFor(() => expect(helpAssistant.isOpen).toBe(false));
  });

  it("brings an open pop-out forward instead of docking a second Cif", () => {
    const open = vi.spyOn(cifPopout, "open").mockImplementation(() => {});
    cifPopout.connected = true;

    toggleCif();

    expect(open).toHaveBeenCalled();
    expect(helpAssistant.isOpen).toBe(false);
    cifPopout.connected = false;
  });

  it("docks Cif when there is no pop-out", () => {
    toggleCif();
    expect(helpAssistant.isOpen).toBe(true);
    toggleCif();
    expect(helpAssistant.isOpen).toBe(false);
  });

  it("offers a pop-out button that opens the window", async () => {
    vi.stubEnv("VITE_HELP_ASSISTANT", "true");
    const open = vi.spyOn(cifPopout, "open").mockImplementation(() => {});
    render(HelpAssistantHost);
    helpAssistant.open();
    await waitFor(() => screen.getByRole("dialog"));

    await fireEvent.click(await screen.findByTestId("help-assistant-popout"));
    expect(open).toHaveBeenCalled();
  });

  it("offers no pop-out in a browser that cannot link two windows", async () => {
    vi.stubEnv("VITE_HELP_ASSISTANT", "true");
    cifPopout.stop();
    vi.stubGlobal("BroadcastChannel", undefined);
    render(HelpAssistantHost);
    helpAssistant.open();
    await waitFor(() => screen.getByRole("dialog"));

    expect(cifPopout.supported).toBe(false);
    expect(screen.queryByTestId("help-assistant-popout")).toBeNull();
    vi.unstubAllGlobals();
  });
});
