/** @vitest-environment jsdom */

import { render, screen, fireEvent } from "@testing-library/svelte";
import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("$lib/stores/vault.svelte", () => ({
  vault: {
    selectedEntityId: null,
    entities: {},
  },
}));

vi.mock("$lib/stores/ui/modal-ui.svelte", () => ({
  modalUIStore: {
    closeIntentCreateMenu: vi.fn(),
    openIntentGeneratorWorkflow: vi.fn(),
    openGeneratorWorkflowForEntity: vi.fn(),
    openGeneratorWorkflow: vi.fn(),
  },
}));

import IntentCreateModal from "./IntentCreateModal.svelte";
import { vault } from "$lib/stores/vault.svelte";
import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";

describe("IntentCreateModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (vault as any).selectedEntityId = null;
    (vault as any).entities = {};
  });

  it("shows all six intent categories", () => {
    render(IntentCreateModal);
    expect(screen.getByTestId("intent-character")).toBeTruthy();
    expect(screen.getByTestId("intent-place")).toBeTruthy();
    expect(screen.getByTestId("intent-faction")).toBeTruthy();
    expect(screen.getByTestId("intent-event")).toBeTruthy();
    expect(screen.getByTestId("intent-item")).toBeTruthy();
    expect(screen.getByTestId("intent-custom")).toBeTruthy();
  });

  it("opens the intent generator workflow with no source context when nothing is selected", async () => {
    render(IntentCreateModal);
    await fireEvent.click(screen.getByTestId("intent-character"));

    expect(modalUIStore.openIntentGeneratorWorkflow).toHaveBeenCalledWith(
      "npc",
      null,
    );
    expect(modalUIStore.closeIntentCreateMenu).toHaveBeenCalled();
  });

  it("infers the active entity as context when one is selected", async () => {
    (vault as any).selectedEntityId = "faction-1";
    (vault as any).entities = {
      "faction-1": {
        id: "faction-1",
        title: "Iron Syndicate",
        type: "faction",
      },
    };

    render(IntentCreateModal);
    await fireEvent.click(screen.getByTestId("intent-character"));

    expect(modalUIStore.openIntentGeneratorWorkflow).toHaveBeenCalledWith(
      "npc",
      "faction-1",
    );
  });

  it("opens the full configure form for Custom instead of auto-generating", async () => {
    (vault as any).selectedEntityId = "faction-1";
    (vault as any).entities = {
      "faction-1": {
        id: "faction-1",
        title: "Iron Syndicate",
        type: "faction",
      },
    };

    render(IntentCreateModal);
    await fireEvent.click(screen.getByTestId("intent-custom"));

    expect(modalUIStore.openIntentGeneratorWorkflow).not.toHaveBeenCalled();
    expect(modalUIStore.openGeneratorWorkflowForEntity).toHaveBeenCalledWith(
      "faction-1",
    );
  });
});
