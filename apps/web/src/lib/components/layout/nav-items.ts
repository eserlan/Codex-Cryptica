import { base } from "$app/paths";
import { vault } from "$lib/stores/vault.svelte";
import { quickNoteStore } from "$lib/stores/quicknote.svelte";
import { layoutUIStore } from "$lib/stores/ui/layout-ui.svelte";
import { sessionModeStore } from "$lib/stores/ui/session-mode.svelte";
import { guestVault } from "$lib/stores/guest-vault.svelte";
import { discoveryPolicyStore } from "$lib/stores/ui/discovery-policy.svelte";
import { guestChatStore } from "$lib/stores/guest-chat.svelte";

/**
 * The one list of application navigation, shared by the Activity Bar and the
 * mobile menu drawer (#2247).
 *
 * These were two hand-maintained copies and the drawer had already fallen
 * behind — it was missing Timeline entirely and carried a different Graph
 * icon. One source means a feature is added once and appears in both, and the
 * active-state rule is written once rather than re-derived per link.
 */

/** `view` items navigate; `tool` items toggle something in place. */
export type NavGroup = "view" | "tool";

/**
 * Where an item appears on a phone. `overflow` items are left out of the
 * Activity Bar and reached through the menu drawer instead; the desktop rail
 * is vertical and full-height, so it shows everything regardless.
 */
export type NavPlacement = "bar" | "overflow";

export interface NavItem {
  id: string;
  icon: string;
  label: string;
  /** Optional richer hover tooltip; falls back to `label` when unset. */
  title?: string;
  href?: string;
  /**
   * Extra paths that should light this item up. Used where one entry fronts
   * more than one route, rather than spending a second slot in the bar.
   */
  alsoActiveFor?: string[];
  action?: () => void;
  group: NavGroup;
  placement: NavPlacement;
}

const stripSlash = (path: string) => path.replace(/\/+$/, "");

/**
 * Matched per path segment, not by bare prefix: `/tables` starts with
 * `/table`, so a prefix test lit up the Entity Table alongside it.
 */
export function matchesPath(href: string, pathname: string): boolean {
  const target = stripSlash(href);
  const current = stripSlash(pathname);
  // The app root has no segment of its own to anchor on, so a prefix test
  // would match every route beneath it. Compared against `base` rather than
  // "" so this still holds if the app is ever served from a subpath.
  if (target === stripSlash(base)) return current === target;
  return current === target || current.startsWith(`${target}/`);
}

export function isViewActive(item: NavItem, pathname: string): boolean {
  if (!item.href) return false;
  return [item.href, ...(item.alsoActiveFor ?? [])].some((href) =>
    matchesPath(href, pathname),
  );
}

export function isToolActive(item: NavItem): boolean {
  if (item.id === "guest-chat") {
    return sessionModeStore.isGuestMode
      ? guestChatStore.showChatModal
      : layoutUIStore.mainViewMode === "guest-chat";
  }
  return layoutUIStore.activeSidebarTool === item.id;
}

/**
 * Reads stores, so call it inside a `$derived` to keep the list reactive.
 */
export function navItems(): NavItem[] {
  const items: NavItem[] = [
    {
      id: "graph",
      icon: "icon-[lucide--network]",
      label: "Graph",
      title: "Knowledge Graph",
      href:
        sessionModeStore.isGuestMode && guestVault.publishId
          ? `${base}/guest/${guestVault.publishId}`
          : `${base}/`,
      group: "view",
      placement: "bar",
    },
    {
      id: "map",
      icon: "icon-[lucide--compass]",
      label: "Map",
      title: "World Map",
      href: `${base}/map`,
      group: "view",
      placement: "bar",
    },
    {
      id: "canvas",
      icon: "icon-[lucide--layout]",
      label: "Canvas",
      title: "Spatial Canvas",
      href: `${base}/canvas`,
      group: "view",
      placement: "bar",
    },
    {
      id: "timeline",
      icon: "icon-[lucide--calendar-days]",
      label: "Timeline",
      title: "World Chronology",
      href: `${base}/timeline`,
      group: "view",
      placement: "bar",
    },
    {
      id: "table",
      icon: "icon-[lucide--table]",
      label: "Table",
      title: "Entity Table — overview, filter, and sort all entities",
      href: `${base}/table`,
      group: "view",
      placement: "bar",
    },
    {
      id: "adventure",
      icon: "icon-[lucide--swords]",
      label: "Play",
      title: "Solo Adventure — play a session guided by your campaign world",
      href: `${base}/adventure`,
      group: "view",
      // The desktop rail has room for a first-class Play workspace. On a
      // phone it remains in the navigation drawer, where its label can stay
      // clear without crowding the fixed-size bottom bar.
      placement: "overflow",
    },
    {
      // Tables and decks are two modes of one workspace, so they share one
      // slot and switch inside it.
      id: "random",
      icon: "icon-[lucide--dices]",
      // Not "Random": the drawer renders these labels as visible text, where
      // a bare modifier would sit next to "Table" (the entity table) and read
      // as the less table-ish of the two.
      label: "Rolls & Decks",
      title: "Random Tables & Card Decks — roll and draw from your own",
      href: `${base}/tables`,
      alsoActiveFor: [`${base}/decks`],
      group: "view",
      placement: "overflow",
    },
    {
      id: "explorer",
      icon: "icon-[lucide--database]",
      label: "Entities",
      title: "Entity Explorer",
      action: () => layoutUIStore.toggleSidebarTool("explorer"),
      group: "tool",
      placement: "bar",
    },
    {
      id: "oracle",
      icon: "icon-[lucide--sparkles]",
      label: "Oracle",
      title: vault.isGuest
        ? "Lore Oracle — ask about the world lore you can see. AI is an assistive layer, never required."
        : "Lore Oracle — optional AI assist. Ask for summaries, plot hooks, and connections when you choose. AI is an assistive layer, never required.",
      action: () => layoutUIStore.toggleSidebarTool("oracle"),
      group: "tool",
      placement: "bar",
    },
  ];

  if (!sessionModeStore.isGuestMode) {
    items.push({
      id: "shelf",
      icon: "icon-[lucide--library]",
      label: "Shelf",
      title:
        "The Shelf — carry entities between your vaults. Held in this browser; not a backup.",
      action: () => layoutUIStore.toggleSidebarTool("shelf"),
      group: "tool",
      placement: "overflow",
    });

    items.push({
      id: "quicknote",
      icon: "icon-[lucide--zap]",
      label: "Notes",
      title: "QuickNote Scratchpad",
      action: () => quickNoteStore.toggle(),
      group: "tool",
      placement: "overflow",
    });
  }

  if (vault.isGuest || !discoveryPolicyStore.aiDisabled) {
    items.push({
      id: "guest-chat",
      icon: "icon-[lucide--messages-square]",
      label: "Chat",
      title: "Guest Chat — speak with enabled characters in-character.",
      action: () => {
        if (sessionModeStore.isGuestMode) {
          guestChatStore.showChatModal = !guestChatStore.showChatModal;
          if (guestChatStore.showChatModal) {
            layoutUIStore.leftSidebarOpen = false;
          }
          return;
        }

        if (layoutUIStore.mainViewMode === "guest-chat") {
          layoutUIStore.mainViewMode = "visualization";
        } else {
          layoutUIStore.mainViewMode = "guest-chat";
          layoutUIStore.leftSidebarOpen = false;
        }
      },
      group: "tool",
      placement: "overflow",
    });
  }

  return items;
}
