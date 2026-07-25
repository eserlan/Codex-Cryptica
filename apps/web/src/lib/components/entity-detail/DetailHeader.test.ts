/** @vitest-environment jsdom */
import { render, fireEvent } from "@testing-library/svelte";
import { describe, it, expect, vi } from "vitest";
import DetailHeader from "./DetailHeader.svelte";
import { vault } from "$lib/stores/vault.svelte";

// Mock stores
vi.mock("$lib/stores/ui/layout-ui.svelte", () => ({
  layoutUIStore: {
    findInGraph: vi.fn(),
  },
}));

vi.mock("$lib/stores/ui/modal-ui.svelte", () => ({
  modalUIStore: {
    openZenMode: vi.fn(),
  },
}));

vi.mock("$lib/stores/vault.svelte", () => ({
  vault: {
    isGuest: false,
    selectedEntityId: "entity-1",
    addLabel: vi.fn(),
    removeLabel: vi.fn(),
    entities: {
      "parent-id": {
        id: "parent-id",
        title: "Mock Parent Entity",
      },
    },
  },
}));

vi.mock("$lib/stores/theme.svelte", () => ({
  themeStore: {
    activeTheme: { id: "fantasy" },
    jargon: {
      entity: "Entity",
    },
  },
}));

vi.mock("$app/state", () => ({
  page: {
    url: { pathname: "/" },
  },
}));

vi.mock("$app/paths", () => ({
  base: "",
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
vi.mock("$lib/components/entity/SidepanelRevisionButton.svelte", () => ({
  default: vi.fn(),
}));

describe("DetailHeader Duplicate Key Reproduction", () => {
  it("renders aliases and labels correctly", () => {
    const mockEntity = {
      id: "entity-1",
      title: "Test Entity",
      aliases: ["alias1", "alias2"],
      labels: ["label1", "label2"],
    } as any;

    const { getByText } = render(DetailHeader, {
      entity: mockEntity,
      isEditing: false,
      editTitle: "",
      editAliases: [],
      onClose: () => {},
    });

    expect(getByText("alias1")).toBeTruthy();
    expect(getByText("alias2")).toBeTruthy();
  });

  it("should NOT fail when duplicate aliases are provided (FIX VERIFIED)", () => {
    const mockEntity = {
      id: "entity-1",
      title: "Test Entity",
      aliases: ["alias1", "alias1"], // DUPLICATE
      labels: ["label1"],
    } as any;

    expect(() => {
      render(DetailHeader, {
        entity: mockEntity,
        isEditing: false,
        editTitle: "",
        editAliases: [],
        onClose: () => {},
      });
    }).not.toThrow();
  });

  it("should NOT fail when duplicate labels are provided (FIX VERIFIED)", () => {
    const mockEntity = {
      id: "entity-1",
      title: "Test Entity",
      aliases: ["alias1"],
      labels: ["label1", "label1"], // DUPLICATE
    } as any;

    expect(() => {
      render(DetailHeader, {
        entity: mockEntity,
        isEditing: false,
        editTitle: "",
        editAliases: [],
        onClose: () => {},
      });
    }).not.toThrow();
  });

  it("renders very long titles without throwing", () => {
    const mockEntity = {
      id: "entity-1",
      title:
        "This is an extremely long entity title that should definitely wrap on mobile devices otherwise it would be cut short and the user would not be able to read the full name of the entity which is very important for the lore",
      aliases: [],
      labels: [],
    } as any;

    expect(() => {
      render(DetailHeader, {
        entity: mockEntity,
        isEditing: false,
        editTitle: "",
        editAliases: [],
        onClose: () => {},
      });
    }).not.toThrow();
  });

  it("renders parent indicator when entity has a parent", () => {
    const mockEntity = {
      id: "entity-1",
      title: "Child Entity",
      parent: "parent-id",
      aliases: [],
      labels: [],
    } as any;

    const { getByTestId, getByText } = render(DetailHeader, {
      entity: mockEntity,
      isEditing: false,
      editTitle: "",
      editAliases: [],
      onClose: () => {},
    });

    const indicator = getByTestId("sidebar-parent-indicator");
    expect(indicator).toBeTruthy();
    expect(getByText("Mock Parent Entity")).toBeTruthy();
  });
});

describe("DetailHeader stature badge", () => {
  const renderEntity = (entity: Record<string, unknown>) =>
    render(DetailHeader, {
      entity: { id: "entity-1", title: "Test Entity", ...entity } as any,
      isEditing: false,
      editTitle: "",
      editAliases: [],
      onClose: () => {},
    });

  const renderWithLabels = (labels: string[]) => renderEntity({ labels });

  it("shows how an entity's images will be drawn when a label sets it", () => {
    const { getByTestId } = renderWithLabels(["elven", "deity"]);
    expect(getByTestId("entity-stature-badge").textContent).toContain("Divine");
  });

  it("stays quiet for ordinary labels", () => {
    // The badge exists so a stature is never inferred invisibly; showing one
    // where none applies would be the same noise in reverse.
    const { queryByTestId } = renderWithLabels(["ancient", "ruined"]);
    expect(queryByTestId("entity-stature-badge")).toBeNull();
  });

  it("shows a stature the Oracle read, which no label records", () => {
    // Without this the ordinary DRAW path infers a stature and shows nothing.
    const { getByTestId } = renderEntity({
      labels: ["elven"],
      imageArtDirection: { statureId: "divine" },
    });

    expect(getByTestId("entity-stature-badge").textContent).toContain("Divine");
    expect(getByTestId("entity-stature-keep")).toBeTruthy();
  });

  it("keeps an inferred stature as a label on request", async () => {
    const { getByTestId } = renderEntity({
      labels: [],
      imageArtDirection: { statureId: "mythic" },
    });

    await fireEvent.click(getByTestId("entity-stature-keep"));

    expect(vault.addLabel).toHaveBeenCalledWith("entity-1", "mythic");
  });

  it("offers nothing to keep when a label already says it", () => {
    const { getByTestId, queryByTestId } = renderEntity({
      labels: ["deity"],
      imageArtDirection: { statureId: "divine" },
    });

    expect(getByTestId("entity-stature-badge")).toBeTruthy();
    expect(queryByTestId("entity-stature-keep")).toBeNull();
  });

  it("never offers to write to a vault the viewer does not own", () => {
    (vault as any).isGuest = true;
    try {
      const { queryByTestId } = renderEntity({
        labels: [],
        imageArtDirection: { statureId: "divine" },
      });
      expect(queryByTestId("entity-stature-keep")).toBeNull();
    } finally {
      (vault as any).isGuest = false;
    }
  });
});
