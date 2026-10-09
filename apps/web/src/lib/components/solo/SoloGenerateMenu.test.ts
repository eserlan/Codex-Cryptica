/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";

const env = vi.hoisted(() => ({
  ready: true,
  openGeneratorWorkflow: vi.fn(),
}));
vi.mock("$lib/stores/ui/modal-ui.svelte", () => ({
  modalUIStore: { openGeneratorWorkflow: env.openGeneratorWorkflow },
}));
vi.mock("$lib/stores/vault.svelte", () => ({ vault: {} }));
vi.mock("$lib/stores/vault/readiness", () => ({
  isVaultReadyForGenerators: () => env.ready,
}));

import SoloGenerateMenu from "./SoloGenerateMenu.svelte";

beforeEach(() => {
  env.ready = true;
  env.openGeneratorWorkflow.mockClear();
});

async function openMenu() {
  await fireEvent.click(screen.getByTestId("solo-generate-menu"));
}

describe("SoloGenerateMenu", () => {
  it("opens the NPC, encounter, rumour and complication generators", async () => {
    render(SoloGenerateMenu);
    await openMenu();
    await fireEvent.click(screen.getByTestId("solo-generate-npc"));
    await openMenu();
    await fireEvent.click(screen.getByTestId("solo-generate-encounter"));
    await openMenu();
    await fireEvent.click(screen.getByTestId("solo-generate-rumour"));
    await openMenu();
    await fireEvent.click(screen.getByTestId("solo-generate-complication"));
    expect(env.openGeneratorWorkflow.mock.calls.map((c) => c[0])).toEqual([
      "npc",
      "encounter",
      "rumour",
      "plot-twist",
    ]);
  });

  it("offers All generators, which opens the full picker", async () => {
    render(SoloGenerateMenu);
    await openMenu();
    await fireEvent.click(screen.getByTestId("solo-generate-all"));
    expect(env.openGeneratorWorkflow).toHaveBeenCalledWith(null);
  });

  it("is disabled, with a reason, until the vault has loaded", () => {
    env.ready = false;
    render(SoloGenerateMenu);
    const trigger = screen.getByTestId(
      "solo-generate-menu",
    ) as HTMLButtonElement;
    expect(trigger.disabled).toBe(true);
    expect(trigger.title).toBe("Generators open once your vault has loaded.");
  });

  it("gives every item an accessible name", async () => {
    render(SoloGenerateMenu);
    await openMenu();
    for (const item of screen.getAllByRole("menuitem")) {
      expect(item.textContent?.trim().length ?? 0).toBeGreaterThan(0);
    }
  });
});
