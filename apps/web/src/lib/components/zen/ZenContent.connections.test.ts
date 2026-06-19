/** @vitest-environment jsdom */
import { render, fireEvent } from "@testing-library/svelte";
import { describe, it, expect, vi } from "vitest";
import ZenContent from "./ZenContent.svelte";
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
          type: "located_in",
          label: "Located In",
        },
        {
          target: "entity-2",
          type: "located_in",
          label: "Located In (Duplicate)",
        },
      ],
    },
    "entity-2": {
      id: "entity-2",
      title: "Entity Two",
      labels: [],
      aliases: [],
      connections: [],
    },
  };

  const mockAllEntities = Object.values(mockEntities);

  const mockInbound: Record<string, any[]> = {
    "entity-2": [
      {
        sourceId: "entity-1",
        connection: {
          target: "entity-2",
          type: "located_in",
          label: "Located In",
        },
      },
      {
        sourceId: "entity-1",
        connection: {
          target: "entity-2",
          type: "located_in",
          label: "Located In (Duplicate)",
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
    },
  };
});

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

describe("ZenContent with duplicate/mutual connections", () => {
  it("renders connections successfully without key duplication Svelte errors", () => {
    const mockEntity = vault.entities["entity-1"];

    const { queryAllByText } = render(ZenContent, {
      entity: mockEntity,
      editState: { isEditing: false, aliases: [] },
      scrollContainer: undefined,
      onNavigate: () => {},
    });

    // Connections should render successfully
    const items = queryAllByText("Entity Two");
    expect(items.length).toBeGreaterThan(0);
  });

  it("renders edit button for outbound connections and toggles ConnectionEditor on click", async () => {
    const mockEntity = vault.entities["entity-1"];

    const { getAllByLabelText, getAllByRole, queryAllByRole } = render(
      ZenContent,
      {
        entity: mockEntity,
        editState: { isEditing: false, aliases: [] },
        scrollContainer: undefined,
        onNavigate: () => {},
      },
    );

    // Verify edit buttons are present (for the two outbound connections)
    const editBtns = getAllByLabelText("Edit connection");
    expect(editBtns.length).toBe(2);

    // ConnectionEditor select/input should NOT be in the document initially
    expect(
      queryAllByRole("combobox", { name: /relationship type/i }).length,
    ).toBe(0);

    // Click the first edit button
    await fireEvent.click(editBtns[0]);

    // ConnectionEditor should be rendered
    const selectEl = getAllByRole("combobox", {
      name: /relationship type/i,
    })[0];
    expect(selectEl).toBeTruthy();

    // Click cancel button inside ConnectionEditor
    const cancelBtn = getAllByRole("button", { name: /cancel/i })[0];
    await fireEvent.click(cancelBtn);

    // ConnectionEditor should be removed
    expect(
      queryAllByRole("combobox", { name: /relationship type/i }).length,
    ).toBe(0);
  });
});
