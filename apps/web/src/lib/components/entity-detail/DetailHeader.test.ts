/** @vitest-environment jsdom */
import { render, fireEvent } from "@testing-library/svelte";
import { describe, it, expect, vi } from "vitest";
import DetailHeader from "./DetailHeader.svelte";
import { vault } from "$lib/stores/vault.svelte";
import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";

// Mock stores
vi.mock("$lib/stores/ui/layout-ui.svelte", () => ({
  layoutUIStore: {
    findInGraph: vi.fn(),
  },
}));

vi.mock("$lib/stores/ui/modal-ui.svelte", () => ({
  modalUIStore: {
    openZenMode: vi.fn(),
    openParentPicker: vi.fn(),
  },
}));

vi.mock("$lib/stores/vault.svelte", () => ({
  vault: {
    isGuest: false,
    selectedEntityId: "entity-1",
    addLabel: vi.fn(),
    removeLabel: vi.fn(),
    updateEntity: vi.fn(),
    entities: {
      "entity-1": {
        id: "entity-1",
        title: "Test Entity",
      },
      "parent-id": {
        id: "parent-id",
        title: "Mock Parent Entity",
      },
    },
    allEntities: [
      { id: "entity-1", title: "Test Entity", type: "note" },
      { id: "parent-id", title: "Mock Parent Entity", type: "location" },
    ],
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

describe("DetailHeader parent selection", () => {
  const renderEntity = (entity: Record<string, unknown>) =>
    render(DetailHeader, {
      entity: {
        id: "entity-1",
        title: "Test Entity",
        aliases: [],
        labels: [],
        ...entity,
      } as any,
      isEditing: false,
      editTitle: "",
      editAliases: [],
      onClose: () => {},
    });

  it("offers to set a parent where the indicator would otherwise sit", () => {
    // Without an entry point here, nesting is reachable only by dragging in the
    // explorer — invisible to anyone working from the detail panel.
    const { getByTestId, queryByTestId } = renderEntity({});

    expect(getByTestId("set-parent-button")).toBeTruthy();
    expect(queryByTestId("sidebar-parent-indicator")).toBeNull();
  });

  it("offers to change the parent an entity already has", () => {
    const { getByTestId, queryByTestId } = renderEntity({
      parent: "parent-id",
    });

    expect(getByTestId("change-parent-button")).toBeTruthy();
    expect(queryByTestId("set-parent-button")).toBeNull();
  });

  it("asks the global modal host to open the picker", async () => {
    // Hosting it here instead would trap the dialog in the detail panel's
    // stacking context, and leave isAnyModalOpen blind to it.
    const { getByTestId } = renderEntity({});

    await fireEvent.click(getByTestId("set-parent-button"));

    expect(modalUIStore.openParentPicker).toHaveBeenCalledWith("entity-1");
  });

  it("opens the picker on the same entity when changing an existing parent", async () => {
    const { getByTestId } = renderEntity({ parent: "parent-id" });

    await fireEvent.click(getByTestId("change-parent-button"));

    expect(modalUIStore.openParentPicker).toHaveBeenCalledWith("entity-1");
  });

  it("never offers to rearrange a vault the viewer does not own", () => {
    (vault as any).isGuest = true;
    try {
      const { queryByTestId } = renderEntity({ parent: "parent-id" });
      expect(queryByTestId("set-parent-button")).toBeNull();
      expect(queryByTestId("change-parent-button")).toBeNull();
      // The parent itself still reads, guests just cannot move it.
      expect(queryByTestId("sidebar-parent-indicator")).toBeTruthy();
    } finally {
      (vault as any).isGuest = false;
    }
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

  it("surfaces save state indicator when vault is saving", () => {
    (vault as any).status = "saving";
    try {
      const { getByTestId } = renderEntity({
        labels: [],
      });
      expect(getByTestId("save-indicator-saving")).toBeTruthy();
    } finally {
      (vault as any).status = "idle";
    }
  });
});
