/** @vitest-environment jsdom */
import { render } from "@testing-library/svelte";
import { describe, it, expect, vi } from "vitest";
import ZenSidebar from "./ZenSidebar.svelte";
import { vault } from "$lib/stores/vault.svelte";

// Mock stores
vi.mock("$lib/stores/vault.svelte", () => ({
  vault: {
    isGuest: false,
    allEntities: [],
    entities: {},
    inboundConnections: {},
    labelIndex: [],
  },
}));

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

// Mock sub-components except LabelInput (to render it for real and assert robustly)
vi.mock("$lib/components/labels/LabelBadge.svelte", () => ({
  default: vi.fn(),
}));

vi.mock("$lib/components/labels/AliasInput.svelte", () => ({
  default: vi.fn(),
}));

describe("ZenSidebar labels addition when not editing", () => {
  it("does not render a duplicate alias editor while editing", () => {
    (vault as any).isGuest = false;

    const { queryByText } = render(ZenSidebar, {
      entity: {
        id: "entity-1",
        title: "Test Entity",
        labels: [],
        aliases: ["Existing Alias"],
      } as any,
      editState: { isEditing: true, aliases: ["Existing Alias"] },
      resolvedImageUrl: "",
      onShowLightbox: () => {},
      onNavigate: () => {},
      onDelete: async () => {},
    });

    expect(queryByText("Aliases")).toBeNull();
  });

  it("renders LabelInput when not editing, user is not a guest, and entity has labels", () => {
    (vault as any).isGuest = false;

    const mockEntity = {
      id: "entity-1",
      title: "Test Entity",
      labels: ["label1"],
      aliases: [],
    } as any;

    const { queryByRole } = render(ZenSidebar, {
      entity: mockEntity,
      editState: { isEditing: false, aliases: [] },
      resolvedImageUrl: "",
      onShowLightbox: () => {},
      onNavigate: () => {},
      onDelete: async () => {},
    });

    const combobox = queryByRole("combobox", { name: "Quick add label" });
    expect(combobox).toBeTruthy();
  });

  it("renders LabelInput when not editing, user is not a guest, and entity has NO labels", () => {
    (vault as any).isGuest = false;

    const mockEntity = {
      id: "entity-1",
      title: "Test Entity",
      labels: [], // EMPTY LABELS
      aliases: [],
    } as any;

    const { queryByRole } = render(ZenSidebar, {
      entity: mockEntity,
      editState: { isEditing: false, aliases: [] },
      resolvedImageUrl: "",
      onShowLightbox: () => {},
      onNavigate: () => {},
      onDelete: async () => {},
    });

    const combobox = queryByRole("combobox", { name: "Quick add label" });
    expect(combobox).toBeTruthy();
  });

  it("does NOT render LabelInput when user is a guest", () => {
    (vault as any).isGuest = true; // GUEST

    const mockEntity = {
      id: "entity-1",
      title: "Test Entity",
      labels: [],
      aliases: [],
    } as any;

    const { queryByRole } = render(ZenSidebar, {
      entity: mockEntity,
      editState: { isEditing: false, aliases: [] },
      resolvedImageUrl: "",
      onShowLightbox: () => {},
      onNavigate: () => {},
      onDelete: async () => {},
    });

    const combobox = queryByRole("combobox", { name: "Quick add label" });
    expect(combobox).toBeFalsy();
  });
});
