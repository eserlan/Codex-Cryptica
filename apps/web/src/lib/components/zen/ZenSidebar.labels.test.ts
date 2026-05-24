/** @vitest-environment jsdom */
import { render } from "@testing-library/svelte";
import { describe, it, expect, vi } from "vitest";
import ZenSidebar from "./ZenSidebar.svelte";
import { vault } from "$lib/stores/vault.svelte";
import LabelInput from "$lib/components/labels/LabelInput.svelte";

// Mock stores
vi.mock("$lib/stores/vault.svelte", () => ({
  vault: {
    isGuest: false,
    entities: {},
    inboundConnections: {},
  },
}));

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

// Mock sub-components
vi.mock("$lib/components/labels/LabelBadge.svelte", () => ({
  default: vi.fn(),
}));

vi.mock("$lib/components/labels/LabelInput.svelte", () => ({
  default: vi.fn(),
}));

vi.mock("$lib/components/labels/AliasInput.svelte", () => ({
  default: vi.fn(),
}));

describe("ZenSidebar labels addition when not editing", () => {
  it("renders LabelInput when not editing and user is not a guest", () => {
    vault.isGuest = false;

    const mockEntity = {
      id: "entity-1",
      title: "Test Entity",
      labels: ["label1"],
      aliases: [],
    } as any;

    render(ZenSidebar, {
      entity: mockEntity,
      editState: { isEditing: false, aliases: [] },
      resolvedImageUrl: "",
      onShowLightbox: () => {},
      onNavigate: () => {},
      onDelete: async () => {},
    });

    expect(LabelInput).toHaveBeenCalled();
  });
});
