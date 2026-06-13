/** @vitest-environment jsdom */

import { render, screen, fireEvent } from "@testing-library/svelte";
import { describe, expect, it, vi, beforeEach } from "vitest";

(global as any).$state = (v: any) => v;
(global as any).$derived = (fn: () => any) => fn();
(global as any).$effect = (_fn: () => any) => {};

// jsdom lacks Web Animations API — stub it so Svelte transitions don't throw
(global as any).Element.prototype.animate ??= () => ({
  finished: Promise.resolve(),
  cancel: () => {},
});

vi.mock("$lib/stores/ui/modal-ui.svelte", () => {
  const workflow = {
    open: true,
    launchMode: "workspace" as "workspace" | "contextual",
    sourceEntityId: null as string | null,
    generatorId: null as string | null,
  };
  return {
    modalUIStore: {
      get generatorWorkflow() {
        return workflow;
      },
      closeGeneratorWorkflow: vi.fn(),
      _workflow: workflow,
    },
  };
});

vi.mock("$lib/actions/focusTrap", () => ({
  focusTrap: () => ({ destroy: () => {} }),
}));

import CampaignGeneratorModal from "./CampaignGeneratorModal.svelte";
import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";

const store = modalUIStore as typeof modalUIStore & {
  _workflow: {
    launchMode: "workspace" | "contextual";
    sourceEntityId: string | null;
  };
};

describe("CampaignGeneratorModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    store._workflow.launchMode = "workspace";
    store._workflow.sourceEntityId = null;
  });

  // T018: generator selection / config form rendering
  it("renders a dialog with heading and close button", () => {
    render(CampaignGeneratorModal);
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByRole("heading", { name: /generate/i })).toBeTruthy();
    expect(screen.getByLabelText("Close generator")).toBeTruthy();
  });

  // T019: cancel/close leaves campaign data unchanged
  it("calls closeGeneratorWorkflow when close button is clicked", async () => {
    render(CampaignGeneratorModal);
    await fireEvent.click(screen.getByLabelText("Close generator"));
    expect(modalUIStore.closeGeneratorWorkflow).toHaveBeenCalledOnce();
  });

  // T020: contextual launch shows source entity hint
  it("shows contextual hint when launched from an entity", () => {
    store._workflow.launchMode = "contextual";
    store._workflow.sourceEntityId = "entity-99";
    render(CampaignGeneratorModal);
    expect(screen.getByTestId("contextual-hint")).toBeTruthy();
    expect(screen.getByText("entity-99")).toBeTruthy();
  });

  it("does not show contextual hint in workspace mode", () => {
    render(CampaignGeneratorModal);
    expect(screen.queryByTestId("contextual-hint")).toBeNull();
  });
});
