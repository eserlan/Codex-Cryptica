/** @vitest-environment jsdom */
import { render, fireEvent, within } from "@testing-library/svelte";
import { describe, it, expect, vi } from "vitest";
import ZenSidebar from "./ZenSidebar.svelte";
import { vault } from "$lib/stores/vault.svelte";

// Mock SvelteKit base path
vi.mock("$app/paths", () => ({
  base: "",
}));

// Mock stores
vi.mock("$lib/stores/vault.svelte", () => {
  const mockEntities: Record<string, any> = {
    "entity-1": {
      id: "entity-1",
      title: "Entity One",
      labels: [],
      aliases: [],
      parent: "entity-2",
      connections: [
        {
          target: "entity-2",
          type: "ALLY",
          label: "Ally Of",
        },
      ],
    },
    "entity-2": {
      id: "entity-2",
      title: "Entity Two",
      labels: [],
      aliases: [],
      connections: [
        {
          target: "entity-1",
          type: "ALLY",
          label: "Ally Of",
        },
      ],
    },
    "entity-child": {
      id: "entity-child",
      title: "Entity Child",
      labels: [],
      aliases: [],
      parent: "entity-1",
      connections: [],
    },
  };

  const mockAllEntities = Object.values(mockEntities);

  const mockInbound: Record<string, any[]> = {
    "entity-1": [
      {
        sourceId: "entity-2",
        connection: {
          target: "entity-1",
          type: "ALLY",
          label: "Ally Of",
        },
      },
    ],
    "entity-2": [
      {
        sourceId: "entity-1",
        connection: {
          target: "entity-2",
          type: "ALLY",
          label: "Ally Of",
        },
      },
    ],
  };

  return {
    vault: {
      isGuest: false,
      allEntities: mockAllEntities,
      entities: mockEntities,
      inboundConnections: mockInbound,
      labelIndex: [],
      updateConnection: vi.fn(),
      addConnection: vi.fn().mockResolvedValue(true),
      updateEntity: vi.fn().mockResolvedValue(true),
    },
  };
});

vi.mock("$lib/stores/oracle.svelte", () => ({
  oracle: {
    tier: "advanced",
    isVisualizingEntity: vi.fn().mockReturnValue(false),
  },
}));

vi.mock("$lib/services/RevisionService.svelte", () => ({
  revisionService: {
    isRevising: false,
  },
}));

vi.mock("$lib/stores/ui/discovery-policy.svelte", () => ({
  discoveryPolicyStore: {
    aiDisabled: false,
  },
}));

vi.mock("$lib/components/labels/LabelInput.svelte", () => ({
  default: vi.fn(),
}));

vi.mock("$lib/components/labels/AliasInput.svelte", () => ({
  default: vi.fn(),
}));

describe("ZenSidebar with duplicate/mutual connections", () => {
  it("renders connections successfully without key duplication Svelte errors", () => {
    const mockEntity = vault.entities["entity-1"];

    const { queryAllByText } = render(ZenSidebar, {
      entity: mockEntity,
      editState: { isEditing: false, aliases: [] },
      resolvedImageUrl: "",
      onShowLightbox: () => {},
      onNavigate: () => {},
      onDelete: async () => {},
    });

    // The connections header and elements should be rendered correctly
    const items = queryAllByText("Entity Two");
    expect(items.length).toBeGreaterThan(0);
  });

  it("renders edit button for outbound connections and toggles ConnectionEditor on click", async () => {
    const mockEntity = vault.entities["entity-1"];

    const { getByLabelText, getByRole, queryByRole } = render(ZenSidebar, {
      entity: mockEntity,
      editState: { isEditing: false, aliases: [] },
      resolvedImageUrl: "",
      onShowLightbox: () => {},
      onNavigate: () => {},
      onDelete: async () => {},
    });

    // Verify edit button is present
    const editBtn = getByLabelText("Edit connection");
    expect(editBtn).toBeTruthy();

    // ConnectionEditor select/input should NOT be in the document initially
    expect(queryByRole("combobox", { name: /relationship type/i })).toBeNull();

    // Click edit button
    await fireEvent.click(editBtn);

    // ConnectionEditor should be rendered
    const selectEl = getByRole("combobox", { name: /relationship type/i });
    expect(selectEl).toBeTruthy();

    // Click cancel button inside ConnectionEditor
    const cancelBtn = getByRole("button", { name: /cancel/i });
    await fireEvent.click(cancelBtn);

    // ConnectionEditor should be removed
    expect(queryByRole("combobox", { name: /relationship type/i })).toBeNull();
  });

  it("renders child connections but not parent in connection list", () => {
    const mockEntity = vault.entities["entity-1"];

    const { getByText, queryByText, getAllByText } = render(ZenSidebar, {
      entity: mockEntity,
      editState: { isEditing: false, aliases: [] },
      resolvedImageUrl: "",
      onShowLightbox: () => {},
      onNavigate: () => {},
      onDelete: async () => {},
    });

    // Check that Parent label is not rendered, but Child and Entity Child are
    expect(queryByText("Parent")).toBeNull();
    expect(getAllByText("Entity Two").length).toBeGreaterThan(0); // rendered as direct ALLY connection
    expect(getByText("Child")).toBeTruthy();
    expect(getByText("Entity Child")).toBeTruthy();
  });

  it("supports deleting a child connection and clearing child's parent", async () => {
    const mockEntity = vault.entities["entity-1"];
    const { getByText } = render(ZenSidebar, {
      entity: mockEntity,
      editState: { isEditing: false, aliases: [] },
      resolvedImageUrl: "",
      onShowLightbox: () => {},
      onNavigate: () => {},
      onDelete: async () => {},
    });

    // Scope search using within()
    const childEl = getByText("Entity Child");
    const container = childEl.closest("div.w-full");
    if (!container) throw new Error("Could not find connection container");

    const deleteBtn = within(container as HTMLElement).getByLabelText(
      "Delete connection",
    );
    await fireEvent.click(deleteBtn);

    expect(vault.updateEntity).toHaveBeenCalledWith("entity-child", {
      parent: undefined,
    });
  });

  it("toggles the inline connection form and can trigger connection creation", async () => {
    const mockEntity = vault.entities["entity-1"];

    const { getByLabelText, getByRole } = render(ZenSidebar, {
      entity: mockEntity,
      editState: { isEditing: false, aliases: [] },
      resolvedImageUrl: "",
      onShowLightbox: () => {},
      onNavigate: () => {},
      onDelete: async () => {},
    });

    // Verify ADD button is present
    const addBtn = getByLabelText("Add new connection");
    expect(addBtn).toBeTruthy();

    // Click ADD to open the form
    await fireEvent.click(addBtn);

    // Verify form fields
    expect(getByRole("button", { name: /^connect$/i })).toBeTruthy();
    expect(getByRole("button", { name: /^cancel$/i })).toBeTruthy();
  });
});
