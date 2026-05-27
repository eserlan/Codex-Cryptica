/** @vitest-environment jsdom */
import { render, fireEvent } from "@testing-library/svelte";
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
  };

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
      entities: mockEntities,
      inboundConnections: mockInbound,
      labelIndex: [],
      updateConnection: vi.fn(),
    },
  };
});

vi.mock("$lib/stores/oracle.svelte", () => ({
  oracle: {
    tier: "advanced",
    isVisualizingEntity: vi.fn().mockReturnValue(false),
  },
}));

vi.mock("$lib/services/RegenerationService.svelte", () => ({
  regenerationService: {
    isGenerating: false,
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
});
