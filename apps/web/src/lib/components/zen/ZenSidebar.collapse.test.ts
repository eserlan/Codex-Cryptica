/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, it, expect, vi } from "vitest";
import ZenSidebar from "./ZenSidebar.svelte";
import { vault } from "$lib/stores/vault.svelte";

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
  revisionService: { isRevising: false },
}));

vi.mock("$lib/stores/ui/discovery-policy.svelte", () => ({
  discoveryPolicyStore: { aiDisabled: false },
}));

vi.mock("$lib/components/labels/LabelBadge.svelte", () => ({
  default: vi.fn(),
}));

vi.mock("$lib/components/labels/AliasInput.svelte", () => ({
  default: vi.fn(),
}));

const baseProps = {
  entity: { id: "e", title: "E", labels: [], aliases: [] } as any,
  editState: { isEditing: false, aliases: [] },
  resolvedImageUrl: "",
  onShowLightbox: () => {},
  onNavigate: () => {},
  onDelete: async () => {},
};

describe("ZenSidebar collapse button", () => {
  it("shows a labelled Hide panel button that calls onCollapse", async () => {
    (vault as any).isGuest = false;
    const onCollapse = vi.fn();
    render(ZenSidebar, { ...baseProps, onCollapse });
    const button = screen.getByRole("button", { name: "Hide sidebar" });
    expect(button.textContent).toContain("Hide panel");
    await fireEvent.click(button);
    expect(onCollapse).toHaveBeenCalledTimes(1);
  });

  it("has no collapse button when the parent does not support it", () => {
    (vault as any).isGuest = false;
    render(ZenSidebar, baseProps);
    expect(screen.queryByRole("button", { name: "Hide sidebar" })).toBeNull();
  });
});
