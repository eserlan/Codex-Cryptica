/** @vitest-environment jsdom */
import { render, screen, fireEvent } from "@testing-library/svelte";
import { describe, it, expect, vi, beforeEach } from "vitest";
import DetailStatusTab from "./DetailStatusTab.svelte";
import { vault } from "$lib/stores/vault.svelte";

// Mock Svelte client runtime
vi.mock("svelte", async () => {
  // @ts-expect-error - force the client Svelte runtime so testing-library can mount
  return await import("../../../../../../node_modules/svelte/src/index-client.js");
});

// Mock stores
vi.mock("$lib/stores/vault.svelte", () => ({
  vault: {
    isGuest: false,
    defaultVisibility: "public",
    entities: {
      "target-1": { id: "target-1", title: "Target 1" },
      "source-1": { id: "source-1", title: "Source 1" },
    },
    inboundConnections: {
      "entity-1": [
        {
          sourceId: "source-1",
          connection: { target: "entity-1", type: "enemy", label: "Enemy of" },
        },
      ],
    },
    removeConnection: vi.fn(),
  },
}));

vi.mock("$lib/stores/theme.svelte", () => ({
  themeStore: {
    activeTheme: { id: "fantasy" },
    jargon: {
      connections_header: "Connections",
    },
  },
}));

// Mock sub-components to simplify testing
vi.mock("$lib/components/MarkdownEditor.svelte", () => ({
  default: vi.fn(),
}));
vi.mock("$lib/components/timeline/TemporalEditor.svelte", () => ({
  default: vi.fn(),
}));
vi.mock("$lib/components/connections/ConnectionEditor.svelte", () => ({
  default: vi.fn(),
}));
vi.mock("./proposals/DetailProposals.svelte", () => ({
  default: vi.fn(),
}));

describe("DetailStatusTab", () => {
  const mockEntity = {
    id: "entity-1",
    title: "Entity 1",
    connections: [{ target: "target-1", type: "friendly", label: "Friend of" }],
    content: "",
    lore: "",
    type: "npc",
    tags: [],
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    (vault as any).isGuest = false;
  });

  it("renders outbound and inbound connections with delete buttons", () => {
    render(DetailStatusTab, {
      entity: mockEntity,
      isEditing: false,
      editType: "npc",
      editContent: "",
      editStartDate: undefined as any,
      editEndDate: undefined as any,
    });

    expect(screen.getByText("Target 1")).toBeTruthy();
    expect(screen.getByText("Source 1")).toBeTruthy();

    const deleteButtons = screen.getAllByLabelText("Delete connection");
    expect(deleteButtons).toHaveLength(2);
  });

  it("calls vault.removeConnection when deleting an outbound connection", async () => {
    render(DetailStatusTab, {
      entity: mockEntity,
      isEditing: false,
      editType: "npc",
      editContent: "",
      editStartDate: undefined as any,
      editEndDate: undefined as any,
    });

    const deleteButtons = screen.getAllByLabelText("Delete connection");
    // Outbound is typically first in the list as per code: [...outbound, ...inbound]
    await fireEvent.click(deleteButtons[0]);

    expect(vault.removeConnection).toHaveBeenCalledWith(
      "entity-1",
      "target-1",
      "friendly",
    );
  });

  it("calls vault.removeConnection when deleting an inbound connection", async () => {
    render(DetailStatusTab, {
      entity: mockEntity,
      isEditing: false,
      editType: "npc",
      editContent: "",
      editStartDate: undefined as any,
      editEndDate: undefined as any,
    });

    const deleteButtons = screen.getAllByLabelText("Delete connection");
    // Inbound is second
    await fireEvent.click(deleteButtons[1]);

    expect(vault.removeConnection).toHaveBeenCalledWith(
      "source-1",
      "entity-1",
      "enemy",
    );
  });

  it("hides delete buttons when in guest mode", () => {
    (vault as any).isGuest = true;

    render(DetailStatusTab, {
      entity: mockEntity,
      isEditing: false,
      editType: "npc",
      editContent: "",
      editStartDate: undefined as any,
      editEndDate: undefined as any,
    });

    expect(screen.queryByLabelText("Delete connection")).toBeNull();
  });
});
