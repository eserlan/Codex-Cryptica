/** @vitest-environment jsdom */
import { render, fireEvent, cleanup } from "@testing-library/svelte";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import ZenHeader from "./ZenHeader.svelte";
import { vault } from "#lib/stores/vault.svelte.js";

vi.mock("#lib/stores/vault.svelte.js", () => ({
  vault: {
    isGuest: false,
    vaultName: "Test Vault",
    deleteEntity: vi.fn(),
    selectedEntityId: "entity-1",
    entities: {
      "entity-1": { id: "entity-1", title: "Test Entity" },
      "parent-id": { id: "parent-id", title: "Mock Parent Entity" },
    },
  },
}));

vi.mock("#lib/stores/ui/modal-ui.svelte.js", () => ({
  modalUIStore: {
    openZenMode: vi.fn(),
    openParentPicker: vi.fn(),
    soundBite: { show: false, entityId: null },
    openSoundBite: vi.fn(),
  },
}));

vi.mock("#lib/stores/ui/layout-ui.svelte.js", () => ({
  layoutUIStore: { findInGraph: vi.fn() },
}));
vi.mock("#lib/stores/guest-chat.svelte.js", () => ({
  guestChatStore: { openChat: vi.fn() },
}));
vi.mock("#lib/stores/guest-vault.svelte.js", () => ({
  guestVault: { publishId: null },
}));
vi.mock("#lib/stores/canvas-registry.svelte.js", () => ({
  canvasRegistry: {
    findCanvasForEntity: () => undefined,
    importCanvas: vi.fn(),
  },
}));
vi.mock("#lib/stores/theme.svelte.js", () => ({
  themeStore: { activeTheme: { id: "fantasy" }, jargon: { entity: "Entity" } },
}));
vi.mock("#lib/features/shelf/index.js", () => ({
  shelf: { shelve: vi.fn(async () => true) },
}));
vi.mock("@codex/audio-engine", () => ({
  soundBiteService: { loadFromEntity: vi.fn() },
}));
vi.mock("$app/state", () => ({ page: { url: { pathname: "/" } } }));
vi.mock("$app/paths", () => ({
  base: "",
  asset: (p: string) => p,
  resolve: (p: string) => p,
}));
vi.mock("$app/navigation", () => ({ goto: vi.fn() }));
vi.mock("#lib/components/labels/AliasInput.svelte", () => ({
  default: vi.fn(),
}));
vi.mock("#lib/components/labels/CategoryRadioGroup.svelte", () => ({
  default: vi.fn(),
}));

const renderHeader = (
  entity: Record<string, unknown>,
  props: Record<string, unknown> = {},
) =>
  render(ZenHeader, {
    entity: {
      id: "entity-1",
      title: "Test Entity",
      type: "note",
      aliases: [],
      labels: [],
      ...entity,
    } as any,
    editState: { type: "note", aliases: [], isEditing: false },
    isSaving: false,
    isCopied: false,
    onCopy: () => {},
    onStartEdit: () => {},
    onCancelEdit: () => {},
    onSave: async () => {},
    onClose: () => {},
    ...props,
  });

beforeEach(() => {
  vi.clearAllMocks();
  (vault as any).isGuest = false;
});
afterEach(cleanup);

describe("ZenHeader delete action", () => {
  it("offers Delete inside the More menu, last, and runs onDelete", async () => {
    const onDelete = vi.fn(async () => {});
    const { getByTestId } = renderHeader({}, { onDelete });
    const item = getByTestId("delete-entity-button");
    expect(item.closest('[role="menu"]')).toBeTruthy();
    expect(item.className).toContain("text-theme-danger");
    const items = item
      .closest('[role="menu"]')!
      .querySelectorAll("[role=menuitem]");
    expect(items[items.length - 1]).toBe(item);

    await fireEvent.click(item);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it("offers no Delete to a guest", () => {
    (vault as any).isGuest = true;
    const { queryByTestId } = renderHeader({}, { onDelete: vi.fn() });
    expect(queryByTestId("delete-entity-button")).toBeNull();
  });

  it("offers no Delete without a handler, or while editing", () => {
    expect(renderHeader({}).queryByTestId("delete-entity-button")).toBeNull();
    cleanup();
    const editing = renderHeader(
      {},
      {
        onDelete: vi.fn(),
        editState: { type: "note", aliases: [], isEditing: true },
      },
    );
    expect(editing.queryByTestId("delete-entity-button")).toBeNull();
  });

  it("offers Zen-only copy and pop-out actions in the More menu", async () => {
    const onCopy = vi.fn();
    const onPopOut = vi.fn();
    const onDelete = vi.fn();
    const { getByTestId } = renderHeader({}, { onCopy, onPopOut, onDelete });

    await fireEvent.click(getByTestId("entity-actions-more-button"));

    const copyBtn = getByTestId("zen-copy-content-button");
    const popOutBtn = getByTestId("zen-pop-out-button");
    const deleteBtn = getByTestId("delete-entity-button");
    const menu = deleteBtn.closest('[role="menu"]')!;
    expect(copyBtn.closest('[role="menu"]')).toBe(menu);
    expect(popOutBtn.closest('[role="menu"]')).toBe(menu);
    const items = menu.querySelectorAll("[role=menuitem]");
    expect(items[items.length - 1]).toBe(deleteBtn);

    await fireEvent.click(copyBtn);
    expect(onCopy).toHaveBeenCalledTimes(1);
    await fireEvent.click(getByTestId("entity-actions-more-button"));
    await fireEvent.click(getByTestId("zen-pop-out-button"));
    expect(onPopOut).toHaveBeenCalledTimes(1);
  });
});
