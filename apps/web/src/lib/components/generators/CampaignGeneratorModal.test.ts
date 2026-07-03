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

vi.mock("$lib/stores/vault.svelte", () => ({
  vault: {
    isGuest: false,
    createEntity: vi.fn(async () => "new-id"),
    addConnection: vi.fn(),
  },
}));

vi.mock("$lib/stores/categories.svelte", () => ({
  categories: {
    list: [
      { id: "character", label: "Character" },
      { id: "location", label: "Location" },
    ],
  },
}));

vi.mock("generator-engine", async () => {
  const actual =
    await vi.importActual<typeof import("generator-engine")>(
      "generator-engine",
    );
  return actual;
});

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

  // T033: AI unavailable messaging — non-AI generation must remain accessible
  it("configure stage shows a Generate button regardless of AI availability", () => {
    render(CampaignGeneratorModal);
    // The config form must always offer a way to generate (non-AI path).
    expect(screen.getByRole("button", { name: /generate/i })).toBeTruthy();
  });

  it("workspace launch keeps chrome modal styling", () => {
    render(CampaignGeneratorModal);
    const dialog = screen.getByRole("dialog");
    expect(dialog.getAttribute("data-themed")).toBe("chrome");
    expect(dialog.className).toContain("bg-chrome-surface");
    expect(dialog.className).toContain("border-chrome-border");
    const heading = screen.getByRole("heading", { name: /generate/i });
    expect(heading.className).toContain("text-chrome-accent");
  });

  it("contextual launch remaps chrome tokens to the active theme", () => {
    store._workflow.launchMode = "contextual";
    store._workflow.sourceEntityId = "entity-99";

    render(CampaignGeneratorModal);

    const dialog = screen.getByRole("dialog");
    const style = dialog.getAttribute("style") ?? "";
    expect(dialog.getAttribute("data-themed")).toBe("theme");
    expect(style).toContain(
      "--color-chrome-surface: var(--color-theme-surface)",
    );
    expect(style).toContain("--color-chrome-border: var(--color-theme-border)");
    expect(style).toContain(
      "--color-chrome-accent: var(--color-theme-primary)",
    );
    expect(style).toContain("--color-chrome-text: var(--color-theme-text)");
    expect(style).toContain("--color-chrome-muted: var(--color-theme-muted)");
  });
});
