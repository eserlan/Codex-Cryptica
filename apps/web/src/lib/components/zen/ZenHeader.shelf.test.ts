/** @vitest-environment jsdom */
import { render, fireEvent, cleanup } from "@testing-library/svelte";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import ZenHeader from "./ZenHeader.svelte";
import { vault } from "#lib/stores/vault.svelte.js";
import { shelf } from "#lib/features/shelf/index.js";

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

describe("ZenHeader send to shelf action", () => {
  it("shelves the entity from the More menu and shows a check", async () => {
    const { getByTestId } = renderHeader({});
    const item = getByTestId("zen-send-to-shelf-button");
    expect(item.closest('[role="menu"]')).toBeTruthy();

    await fireEvent.click(item);

    expect(shelf.shelve).toHaveBeenCalledWith(["entity-1"], "Test Vault");
    await vi.waitFor(() =>
      expect(
        getByTestId("zen-send-to-shelf-button").querySelector(
          ".icon-\\[lucide--check\\]",
        ),
      ).toBeTruthy(),
    );
  });

  it("shows no check when the shelf refuses", async () => {
    vi.mocked(shelf.shelve).mockResolvedValueOnce(false);
    const { getByTestId } = renderHeader({});
    await fireEvent.click(getByTestId("zen-send-to-shelf-button"));
    expect(
      getByTestId("zen-send-to-shelf-button").querySelector(
        ".icon-\\[lucide--check\\]",
      ),
    ).toBeNull();
  });

  it("is not offered to a guest", () => {
    (vault as any).isGuest = true;
    expect(
      renderHeader({}).queryByTestId("zen-send-to-shelf-button"),
    ).toBeNull();
  });
});
