/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import { discoveryPolicyStore } from "$lib/stores/ui/discovery-policy.svelte";
import { helpAssistant } from "$lib/stores/help-assistant/help-runtime";
import MapCifButton from "./MapCifButton.svelte";

vi.mock("$app/navigation", () => ({ goto: vi.fn(), afterNavigate: vi.fn() }));
vi.mock("$app/state", () => ({ page: { route: { id: "/(app)/map" } } }));
vi.mock("$lib/stores/help.svelte", () => ({
  helpStore: { openHelpToArticle: vi.fn(), openHelpWindow: vi.fn() },
}));

afterEach(() => {
  vi.unstubAllEnvs();
  discoveryPolicyStore.aiDisabled = false;
  helpAssistant.close();
});

describe("MapCifButton", () => {
  it("opens and closes Cif from the map controls", async () => {
    vi.stubEnv("VITE_HELP_ASSISTANT", "true");
    render(MapCifButton);

    await fireEvent.click(screen.getByTestId("map-cif-button"));
    expect(helpAssistant.isOpen).toBe(true);
    expect(screen.getByRole("button", { name: "Close Cif" })).toBeTruthy();

    await fireEvent.click(screen.getByTestId("map-cif-button"));
    expect(helpAssistant.isOpen).toBe(false);
  });

  it("is not shown while Cif is switched off", () => {
    vi.stubEnv("VITE_HELP_ASSISTANT", "");
    render(MapCifButton);
    expect(screen.queryByTestId("map-cif-button")).toBeNull();
  });

  it("is not shown when the user has turned AI off", () => {
    vi.stubEnv("VITE_HELP_ASSISTANT", "true");
    discoveryPolicyStore.aiDisabled = true;
    render(MapCifButton);
    expect(screen.queryByTestId("map-cif-button")).toBeNull();
  });
});
