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

if (typeof Element !== "undefined" && !Element.prototype.animate) {
  Element.prototype.animate = () => ({ cancel() {}, finish() {} }) as any;
}

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

describe("ZenHeader MonsterLabs handoff action", () => {
  it("offers the handoff for eligible types, in the More menu", () => {
    const { getByTestId } = renderHeader({ type: "creature" });
    const item = getByTestId("zen-send-to-monsterlabs-button");
    expect(item.closest('[role="menu"]')).toBeTruthy();
    expect(item.getAttribute("aria-label")).toBe(
      "Create D&D monster in MonsterLabs",
    );
  });

  it("does not offer it for other types", () => {
    const { queryByTestId } = renderHeader({ type: "location" });
    expect(queryByTestId("zen-send-to-monsterlabs-button")).toBeNull();
  });

  it("only opens the confirm modal; nothing is sent until confirmed", async () => {
    const openSpy = vi.spyOn(window, "open").mockReturnValue({} as Window);
    const { getByTestId, findByTestId } = renderHeader({
      type: "creature",
      title: "Ash-Eater",
      content: "A soot-caked horror.",
    });

    await fireEvent.click(getByTestId("zen-send-to-monsterlabs-button"));
    expect(openSpy).not.toHaveBeenCalled();

    await fireEvent.click(await findByTestId("monsterlabs-confirm-button"));
    expect(openSpy).toHaveBeenCalledTimes(1);
    const parsed = new URL(openSpy.mock.calls[0][0] as string);
    expect(parsed.searchParams.get("prompt")).toBe(
      "Name: Ash-Eater\nType: Creature\n\nA soot-caked horror.",
    );
    openSpy.mockRestore();
  });
});
