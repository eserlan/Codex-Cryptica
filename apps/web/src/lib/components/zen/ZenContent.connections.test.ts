/** @vitest-environment jsdom */
import { render } from "@testing-library/svelte";
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
      entities: mockEntities,
      inboundConnections: mockInbound,
      labelIndex: [],
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

vi.mock("$lib/services/RegenerationService.svelte", () => ({
  regenerationService: {
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
});
