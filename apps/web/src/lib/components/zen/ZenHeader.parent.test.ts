/** @vitest-environment jsdom */
import { render, fireEvent } from "@testing-library/svelte";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ZenHeader from "./ZenHeader.svelte";
import { vault } from "$lib/stores/vault.svelte";
import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";

vi.mock("$lib/stores/vault.svelte", () => ({
  vault: {
    isGuest: false,
    selectedEntityId: "entity-1",
    entities: {
      "entity-1": { id: "entity-1", title: "Test Entity" },
      "parent-id": { id: "parent-id", title: "Mock Parent Entity" },
    },
  },
}));

vi.mock("$lib/stores/ui/modal-ui.svelte", () => ({
  modalUIStore: {
    openZenMode: vi.fn(),
    openParentPicker: vi.fn(),
    soundBite: { show: false, entityId: null },
    openSoundBite: vi.fn(),
  },
}));

vi.mock("$lib/stores/ui/layout-ui.svelte", () => ({
  layoutUIStore: { findInGraph: vi.fn() },
}));
vi.mock("$lib/stores/guest-chat.svelte", () => ({
  guestChatStore: { openChat: vi.fn() },
}));
vi.mock("$lib/stores/guest-vault.svelte", () => ({
  guestVault: { publishId: null },
}));
vi.mock("$lib/stores/canvas-registry.svelte", () => ({
  canvasRegistry: {
    findCanvasForEntity: () => undefined,
    importCanvas: vi.fn(),
  },
}));
vi.mock("$lib/stores/theme.svelte", () => ({
  themeStore: { activeTheme: { id: "fantasy" }, jargon: { entity: "Entity" } },
}));
vi.mock("$lib/features/shelf", () => ({ shelf: { shelve: vi.fn() } }));
vi.mock("@codex/audio-engine", () => ({
  soundBiteService: { loadFromEntity: vi.fn() },
}));
vi.mock("$app/state", () => ({ page: { url: { pathname: "/" } } }));
vi.mock("$app/paths", () => ({ base: "" }));
vi.mock("$app/navigation", () => ({ goto: vi.fn() }));
vi.mock("$lib/components/labels/AliasInput.svelte", () => ({
  default: vi.fn(),
}));
vi.mock("$lib/components/labels/CategoryRadioGroup.svelte", () => ({
  default: vi.fn(),
}));

const renderHeader = (entity: Record<string, unknown>) =>
  render(ZenHeader, {
    entity: {
      id: "entity-1",
      title: "Test Entity",
      type: "note",
      aliases: [],
      labels: [],
      ...entity,
    } as any,
    editState: { type: "note", aliases: [] },
    isSaving: false,
    isCopied: false,
    onCopy: () => {},
    onStartEdit: () => {},
    onCancelEdit: () => {},
    onSave: async () => {},
    onClose: () => {},
  });

describe("ZenHeader parent selection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (vault as any).isGuest = false;
  });

  it("offers to set a parent where the indicator would otherwise sit", () => {
    // Zen mode is a full working surface, not a preview — nesting has to be
    // reachable here too, not only from the side panel.
    const { getByTestId, queryByTestId } = renderHeader({});

    expect(getByTestId("zen-set-parent-button")).toBeTruthy();
    expect(queryByTestId("zen-parent-indicator")).toBeNull();
  });

  it("opens the shared picker on the entity in view", async () => {
    const { getByTestId } = renderHeader({});

    await fireEvent.click(getByTestId("zen-set-parent-button"));

    expect(modalUIStore.openParentPicker).toHaveBeenCalledWith("entity-1");
  });

  it("offers to change a parent the entity already has", async () => {
    const { getByTestId, queryByTestId } = renderHeader({
      parent: "parent-id",
    });

    expect(queryByTestId("zen-set-parent-button")).toBeNull();
    await fireEvent.click(getByTestId("zen-change-parent-button"));

    expect(modalUIStore.openParentPicker).toHaveBeenCalledWith("entity-1");
  });

  it("still navigates to the parent from its name", async () => {
    const { getByText } = renderHeader({ parent: "parent-id" });

    await fireEvent.click(getByText("Mock Parent Entity"));

    expect(modalUIStore.openZenMode).toHaveBeenCalledWith("parent-id");
  });

  it("never offers to rearrange a vault the viewer does not own", () => {
    (vault as any).isGuest = true;
    const { queryByTestId } = renderHeader({ parent: "parent-id" });

    expect(queryByTestId("zen-set-parent-button")).toBeNull();
    expect(queryByTestId("zen-change-parent-button")).toBeNull();
    // The parent still reads; guests just cannot move it.
    expect(queryByTestId("zen-parent-indicator")).toBeTruthy();
  });
});
