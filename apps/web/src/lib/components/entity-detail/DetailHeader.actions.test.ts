/** @vitest-environment jsdom */
import { render, fireEvent, cleanup } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import DetailHeader from "./DetailHeader.svelte";
import { vault } from "#lib/stores/vault.svelte.js";
import { modalUIStore } from "#lib/stores/ui/modal-ui.svelte.js";

vi.mock("#lib/stores/ui/layout-ui.svelte.js", () => ({
  layoutUIStore: { findInGraph: vi.fn() },
}));
vi.mock("#lib/stores/ui/modal-ui.svelte.js", () => ({
  modalUIStore: {
    openZenMode: vi.fn(),
    openParentPicker: vi.fn(),
    openSilhouettePicker: vi.fn(),
    openLightbox: vi.fn(),
  },
}));
vi.mock("#lib/stores/vault.svelte.js", () => ({
  vault: {
    isGuest: false,
    selectedEntityId: "entity-1",
    entities: {},
    allEntities: [],
    resolveImageUrl: vi.fn().mockResolvedValue(""),
  },
}));
vi.mock("#lib/stores/theme.svelte.js", () => ({
  themeStore: { activeTheme: { id: "fantasy" }, jargon: { entity: "Entity" } },
}));
vi.mock("$app/state", () => ({ page: { url: { pathname: "/" } } }));
vi.mock("$app/navigation", () => ({ goto: vi.fn() }));
vi.mock("$app/paths", () => ({
  base: "",
  asset: (p: string) => p,
  resolve: (p: string) => p,
}));
vi.mock("#lib/components/labels/LabelBadge.svelte", () => ({
  default: vi.fn(),
}));
vi.mock("#lib/components/labels/LabelInput.svelte", () => ({
  default: vi.fn(),
}));
vi.mock("#lib/components/labels/AliasInput.svelte", () => ({
  default: vi.fn(),
}));

if (typeof Element !== "undefined" && !Element.prototype.animate) {
  Element.prototype.animate = () => ({ cancel() {}, finish() {} }) as any;
}

const entity = { id: "entity-1", title: "Test Entity", type: "note" } as any;

const renderHeader = (props: Record<string, unknown> = {}) =>
  render(DetailHeader, {
    entity,
    isEditing: false,
    editTitle: "",
    editAliases: [],
    onClose: () => {},
    ...props,
  });

afterEach(() => {
  cleanup();
  (vault as any).isGuest = false;
});

describe("DetailHeader actions", () => {
  it("shows Edit, Find in graph and Expand, and Expand opens Zen mode", async () => {
    const onStartEdit = vi.fn();
    const { getAllByTestId } = renderHeader({ onStartEdit });
    expect(getAllByTestId("detail-edit-button").length).toBeGreaterThan(0);
    expect(getAllByTestId("find-in-graph-button").length).toBeGreaterThan(0);

    await fireEvent.click(getAllByTestId("detail-edit-button")[0]);
    expect(onStartEdit).toHaveBeenCalledTimes(1);

    await fireEvent.click(getAllByTestId("enter-zen-mode-button")[0]);
    expect(modalUIStore.openZenMode).toHaveBeenCalledWith("entity-1");
  });

  it("keeps Delete inside the menu and calls onDelete", async () => {
    const onDelete = vi.fn();
    const { getAllByTestId } = renderHeader({ onDelete });
    const item = getAllByTestId("delete-entity-button")[0];
    expect(item.closest('[role="menu"]')).toBeTruthy();

    await fireEvent.click(item);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it("lists Change image and Choose silhouette in the menu, and Choose silhouette opens the picker", async () => {
    const { getAllByTestId } = renderHeader();
    const change = getAllByTestId("change-image-button")[0];
    expect(change.closest('[role="menu"]')).toBeTruthy();
    const pick = getAllByTestId("choose-silhouette-button")[0];
    expect(pick.closest('[role="menu"]')).toBeTruthy();

    await fireEvent.click(pick);
    expect(modalUIStore.openSilhouettePicker).toHaveBeenCalledWith(entity);
  });

  it("offers a guest neither image action", () => {
    (vault as any).isGuest = true;
    const { queryByTestId } = renderHeader();
    expect(queryByTestId("change-image-button")).toBeNull();
    expect(queryByTestId("choose-silhouette-button")).toBeNull();
  });

  it("offers no Edit or Delete without the callbacks", () => {
    const { queryByTestId } = renderHeader();
    expect(queryByTestId("detail-edit-button")).toBeNull();
    expect(queryByTestId("delete-entity-button")).toBeNull();
  });

  it("offers no Edit or Delete to a guest", () => {
    (vault as any).isGuest = true;
    const { queryByTestId } = renderHeader({
      onStartEdit: vi.fn(),
      onDelete: vi.fn(),
    });
    expect(queryByTestId("detail-edit-button")).toBeNull();
    expect(queryByTestId("delete-entity-button")).toBeNull();
    expect(queryByTestId("send-to-shelf-button")).toBeNull();
  });

  it("shows no actions while editing", () => {
    const { queryByTestId } = renderHeader({
      isEditing: true,
      onStartEdit: vi.fn(),
    });
    expect(queryByTestId("enter-zen-mode-button")).toBeNull();
  });
});
