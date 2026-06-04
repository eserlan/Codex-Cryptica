/** @vitest-environment jsdom */
import { render } from "@testing-library/svelte";
import { describe, it, expect, vi } from "vitest";
import DetailHeader from "./DetailHeader.svelte";

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
