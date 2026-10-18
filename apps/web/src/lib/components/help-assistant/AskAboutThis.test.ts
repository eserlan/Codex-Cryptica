/** @vitest-environment jsdom */
import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import { discoveryPolicyStore } from "$lib/stores/ui/discovery-policy.svelte";
import { helpAssistant } from "$lib/stores/help-assistant/help-runtime";
import AskAboutThis from "./AskAboutThis.svelte";

vi.mock("$app/navigation", () => ({ goto: vi.fn(), afterNavigate: vi.fn() }));
vi.mock("$app/state", () => ({ page: { route: { id: "/(app)" } } }));

afterEach(() => {
  vi.unstubAllEnvs();
  discoveryPolicyStore.aiDisabled = false;
  helpAssistant.reset();
  helpAssistant.close();
});

describe("AskAboutThis", () => {
  it("renders nothing when the flag is off", () => {
    vi.stubEnv("VITE_HELP_ASSISTANT", "");
    render(AskAboutThis);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("renders nothing when the user has turned AI off", () => {
    vi.stubEnv("VITE_HELP_ASSISTANT", "true");
    discoveryPolicyStore.aiDisabled = true;
    render(AskAboutThis);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("opens the shared help panel", async () => {
    vi.stubEnv("VITE_HELP_ASSISTANT", "true");
    render(AskAboutThis);
    await fireEvent.click(
      screen.getByRole("button", { name: /ask about this/i }),
    );
    await waitFor(() => expect(helpAssistant.isOpen).toBe(true));
  });
});
