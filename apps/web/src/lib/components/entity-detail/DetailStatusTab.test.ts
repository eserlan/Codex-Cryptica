/** @vitest-environment jsdom */
import { render, screen, fireEvent } from "@testing-library/svelte";
import { describe, it, expect, vi, beforeEach } from "vitest";
import DetailStatusTab from "./DetailStatusTab.svelte";
import { vault } from "$lib/stores/vault.svelte";

// Mock Svelte client runtime

// Mock stores
vi.mock("$lib/stores/vault.svelte", () => ({
  vault: {
    isGuest: false,
    defaultVisibility: "public",
    entities: {
      "target-1": { id: "target-1", title: "Target 1" },
      "source-1": { id: "source-1", title: "Source 1" },
      "parent-entity": { id: "parent-entity", title: "Parent Entity" },
      "child-entity": {
        id: "child-entity",
        title: "Child Entity",
        parent: "entity-1",
      },
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
    addConnection: vi.fn().mockResolvedValue(true),
    updateEntity: vi.fn().mockResolvedValue(true),
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
    expect(deleteButtons).toHaveLength(3);
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

  it("renders child and parent connections successfully", () => {
    const testEntity = {
      ...mockEntity,
      parent: "parent-entity",
    };

    render(DetailStatusTab, {
      entity: testEntity,
      isEditing: false,
      editType: "npc",
      editContent: "",
      editStartDate: undefined as any,
      editEndDate: undefined as any,
    });

    expect(screen.getByText("Parent Entity")).toBeTruthy();
    expect(screen.getByText("Child Entity")).toBeTruthy();
    expect(screen.getByText("Parent")).toBeTruthy();
    expect(screen.getByText("Child")).toBeTruthy();
  });

  it("toggles inline connection form and can cancel or connect", async () => {
    render(DetailStatusTab, {
      entity: mockEntity,
      isEditing: false,
      editType: "npc",
      editContent: "",
      editStartDate: undefined as any,
      editEndDate: undefined as any,
    });

    // Toggle form on
    const addBtn = screen.getByLabelText("Add new connection");
    await fireEvent.click(addBtn);

    // Verify form fields
    expect(screen.getByRole("button", { name: /^connect$/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^cancel$/i })).toBeTruthy();
  });
});
