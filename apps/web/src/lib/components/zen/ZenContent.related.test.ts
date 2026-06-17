/** @vitest-environment jsdom */
import { render, fireEvent, screen } from "@testing-library/svelte";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ZenContent from "./ZenContent.svelte";
import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
import { vault } from "$lib/stores/vault.svelte";

vi.mock("$app/paths", () => ({
  base: "",
}));

vi.mock("$lib/stores/vault.svelte", () => ({
  vault: {
    isGuest: false,
    entities: {
      "entity-1": {
        id: "entity-1",
        title: "Zen Source",
        type: "character",
        connections: [],
      },
    },
    inboundConnections: {},
  },
}));

vi.mock("$lib/stores/theme.svelte", () => ({
  themeStore: {
    jargon: {
      chronicle_header: "Chronicle",
      lore_header: "Lore",
    },
  },
}));

vi.mock("$lib/services/RevisionService.svelte", () => ({
  revisionService: {
    pendingDraft: null,
  },
}));

vi.mock("$lib/components/MarkdownEditor.svelte", () => ({
  default: vi.fn(),
}));

vi.mock(
  "$lib/components/entity-detail/proposals/DetailProposals.svelte",
  () => ({
    default: vi.fn(),
  }),
);

vi.mock("$lib/stores/ui/modal-ui.svelte", () => ({
  modalUIStore: {
    openGeneratorWorkflowForEntity: vi.fn(),
  },
}));

describe("ZenContent Related Entity Generation Trigger", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (vault as any).isGuest = false;
  });

  it("renders 'Generate Related' button and triggers dialog when clicked", async () => {
    const mockEntity = {
      id: "entity-1",
      title: "Zen Source",
      type: "character",
      connections: [],
    };

    render(ZenContent, {
      entity: mockEntity as any,
      editState: { isEditing: false } as any,
      scrollContainer: undefined,
    });

    const generateBtn = screen.getByText("Generate Related");
    expect(generateBtn).toBeDefined();

    await fireEvent.click(generateBtn);
    expect(modalUIStore.openGeneratorWorkflowForEntity).toHaveBeenCalledWith(
      "entity-1",
    );
  });

  it("hides 'Generate Related' for guest sessions", async () => {
    (vault as any).isGuest = true;
    const mockEntity = {
      id: "entity-1",
      title: "Zen Source",
      type: "character",
      connections: [],
    };

    render(ZenContent, {
      entity: mockEntity as any,
      editState: { isEditing: false } as any,
      scrollContainer: undefined,
    });

    expect(screen.queryByText("Generate Related")).toBeNull();
    expect(modalUIStore.openGeneratorWorkflowForEntity).not.toHaveBeenCalled();
  });
});
