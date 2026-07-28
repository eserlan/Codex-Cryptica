import { base } from "$app/paths";
import { layoutUIStore, type LayoutUIStore } from "./layout-ui.svelte";
import { modalUIStore } from "./modal-ui.svelte";
import { UI_STORAGE_KEYS, UIPersistence } from "./persistence";

export const ACTIVE_THEME_STORAGE_KEY = UI_STORAGE_KEYS.ACTIVE_THEME;

export type VaultSelectionPort = {
  selectedEntityId: string | null;
};

export type CanvasRouteRef = {
  id?: string;
  slug?: string;
};

export type ZenModePort = {
  closeZenMode(): void;
};

export type NavigatePort = (href: string) => unknown;

export function openCanvasFromZen(
  canvas: CanvasRouteRef | null | undefined,
  navigate: NavigatePort,
  zenMode: ZenModePort = modalUIStore,
  layout: LayoutUIStore = layoutUIStore,
): boolean {
  const canvasKey = canvas?.slug || canvas?.id;
  if (!canvasKey) return false;

  const href = `/canvas/${canvasKey}`;
  zenMode.closeZenMode();
  layout.clearEntityExplorerWorkspaceFocus();
  focusEntity(layout, null);
  void navigate(href);
  return true;
}

export function openCanvasHref(
  href: string,
  navigate: NavigatePort,
  zenMode: ZenModePort = modalUIStore,
  layout: LayoutUIStore = layoutUIStore,
): boolean {
  const match = href.match(/^\/canvas\/([^/?#]+)(?:[?#].*)?$/);
  if (!match) return false;

  let canvasKey: string;
  try {
    canvasKey = decodeURIComponent(match[1]);
  } catch {
    return false;
  }
  return openCanvasFromZen({ slug: canvasKey }, navigate, zenMode, layout);
}

export function focusEntity(
  entityId: string | null,
  vault?: VaultSelectionPort | null,
): void;
export function focusEntity(
  layout: LayoutUIStore,
  entityId: string | null,
  vault?: VaultSelectionPort | null,
): void;
export function focusEntity(
  layoutOrEntityId: LayoutUIStore | string | null,
  entityIdOrVault?: string | null | VaultSelectionPort,
  maybeVault?: VaultSelectionPort | null,
) {
  const hasInjectedLayout =
    typeof layoutOrEntityId === "object" &&
    layoutOrEntityId !== null &&
    "mainViewMode" in layoutOrEntityId;
  const layout = hasInjectedLayout ? layoutOrEntityId : layoutUIStore;
  const entityId = hasInjectedLayout
    ? (entityIdOrVault as string | null)
    : layoutOrEntityId;
  const vault = hasInjectedLayout
    ? maybeVault
    : (entityIdOrVault as VaultSelectionPort | null | undefined);
  if (entityId) {
    if (layout.isMobile) layout.closeSidebar();
    if (layout.focusedEntityId === entityId && layout.mainViewMode === "focus")
      return;

    layout.focusedEntityId = entityId;
    layout.mainViewMode = "focus";
    if (vault) vault.selectedEntityId = null;
    return;
  }

  if (layout.mainViewMode !== "focus") return;
  const previouslyFocused = layout.focusedEntityId;
  layout.focusedEntityId = null;
  layout.mainViewMode = "visualization";
  if (vault && previouslyFocused) vault.selectedEntityId = previouslyFocused;
}

export function openImportWindow() {
  if (typeof window === "undefined") return;

  const width = 800;
  const height = 900;
  const left = window.screenX + (window.outerWidth - width) / 2;
  const top = window.screenY + (window.outerHeight - height) / 2;

  const url = `${window.location.origin}${base}/import`;
  const features = `width=${width},height=${height},left=${left},top=${top},toolbar=0,location=0,menubar=0,noopener,noreferrer`;

  const newWin = window.open(url, "CodexCrypticaImport", features);
  if (newWin) newWin.opener = null;
}

export function openDiceWindow() {
  if (typeof window === "undefined") return;

  const width = 450;
  const height = 800;
  const left = window.screenX + (window.outerWidth - width) / 2;
  const top = window.screenY + (window.outerHeight - height) / 2;

  const params = new URLSearchParams();
  const persistence = new UIPersistence();
  const activeTheme = persistence.read(
    ACTIVE_THEME_STORAGE_KEY,
    (v: string) => v,
    null,
  );
  if (activeTheme) {
    params.set("theme", activeTheme);
  }

  const query = params.toString();
  const url = `${window.location.origin}${base}/dice${query ? `?${query}` : ""}`;
  const features = `width=${width},height=${height},left=${left},top=${top},toolbar=0,location=0,menubar=0,noopener,noreferrer`;

  const newWin = window.open(url, "CodexCrypticaDice", features);
  if (newWin) newWin.opener = null;
  modalUIStore.showDiceModal = false;
}
