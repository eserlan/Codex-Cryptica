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

const { vaultMock, saveDraftMock, notifyMock } = vi.hoisted(() => {
  const vaultMock = {
    isGuest: false,
    entities: {} as Record<string, unknown>,
    createEntity: vi.fn(async () => "new-id"),
    addConnection: vi.fn(),
    throwOnSelect: false,
    _selectedEntityId: null as string | null,
    get selectedEntityId() {
      return this._selectedEntityId;
    },
    set selectedEntityId(id: string | null) {
      if (this.throwOnSelect) {
        throw new Error("editor pane unavailable");
      }
      this._selectedEntityId = id;
    },
  };
  const saveDraftMock = vi.fn(async () => ({
    entityId: "new-id",
    relationshipCreated: false,
  }));
  const notifyMock = vi.fn();
  return { vaultMock, saveDraftMock, notifyMock };
});

vi.mock("$lib/stores/vault.svelte", () => ({
  vault: vaultMock,
}));

vi.mock("$lib/stores/categories.svelte", () => ({
  categories: {
    list: [
      { id: "character", label: "Character" },
      { id: "location", label: "Location" },
    ],
  },
}));

vi.mock("$lib/stores/ui/notification.svelte", () => ({
  notificationStore: {
    notify: notifyMock,
  },
}));

vi.mock("generator-engine", async () => {
  const actual =
    await vi.importActual<typeof import("generator-engine")>(
      "generator-engine",
    );
  const draft: import("generator-engine").GeneratedDraft = {
    title: "The Observatory of Weeping Veins",
    entityType: "location",
    summary: "A contested subterranean sanctuary.",
    content: "",
    lore: "",
    labels: ["dungeon", "location"],
    sourceGeneratorId: "dungeon",
    templateApplied: false,
  };
  class FakeCampaignGeneratorService extends actual.CampaignGeneratorService {
    async *generateDraftStream() {
      yield { type: "draft" as const, draft };
    }
    saveDraft = saveDraftMock;
  }
  return { ...actual, CampaignGeneratorService: FakeCampaignGeneratorService };
});

import CampaignGeneratorModal from "./CampaignGeneratorModal.svelte";
import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
import { notificationStore } from "$lib/stores/ui/notification.svelte";

const store = modalUIStore as typeof modalUIStore & {
  _workflow: {
    launchMode: "workspace" | "contextual";
    sourceEntityId: string | null;
    generatorId: string | null;
  };
};

describe("CampaignGeneratorModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    store._workflow.launchMode = "workspace";
    store._workflow.sourceEntityId = null;
    store._workflow.generatorId = null;
    vaultMock.throwOnSelect = false;
    vaultMock._selectedEntityId = null;
    saveDraftMock.mockClear();
    saveDraftMock.mockResolvedValue({
      entityId: "new-id",
      relationshipCreated: false,
    });
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

  // Regression for #2742: with a vault open, generating a result and
  // clicking "Open in Editor" must create the entity and select it.
  it("saves the generated draft and opens it in the editor", async () => {
    store._workflow.generatorId = "dungeon";
    render(CampaignGeneratorModal);

    await fireEvent.click(screen.getByRole("button", { name: "Generate" }));
    await screen.findByRole("button", { name: "Open in Editor" });

    await fireEvent.click(
      screen.getByRole("button", { name: "Open in Editor" }),
    );

    await vi.waitFor(() => {
      expect(saveDraftMock).toHaveBeenCalledOnce();
      expect(vaultMock._selectedEntityId).toBe("new-id");
    });
    expect(modalUIStore.closeGeneratorWorkflow).toHaveBeenCalledOnce();
    expect(notificationStore.notify).not.toHaveBeenCalled();
  });

  // Regression for #2742: the entity must already be saved and the modal
  // must still close (with a visible error) even if opening it in the
  // editor fails — the draft must never silently vanish.
  it("still closes and surfaces an error if opening the saved entity fails", async () => {
    store._workflow.generatorId = "dungeon";
    vaultMock.throwOnSelect = true;
    render(CampaignGeneratorModal);

    await fireEvent.click(screen.getByRole("button", { name: "Generate" }));
    await screen.findByRole("button", { name: "Open in Editor" });

    await fireEvent.click(
      screen.getByRole("button", { name: "Open in Editor" }),
    );

    await vi.waitFor(() => {
      expect(saveDraftMock).toHaveBeenCalledOnce();
      expect(modalUIStore.closeGeneratorWorkflow).toHaveBeenCalledOnce();
    });
    expect(notificationStore.notify).toHaveBeenCalledWith(
      expect.stringContaining("couldn't be opened automatically"),
      "error",
      true,
    );
  });
});
