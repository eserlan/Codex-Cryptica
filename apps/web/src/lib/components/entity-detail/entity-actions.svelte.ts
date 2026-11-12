import type { Entity } from "schema";
import { shelf } from "#lib/features/shelf/index.js";
import { vault } from "#lib/stores/vault.svelte.js";
import { themeStore } from "#lib/stores/theme.svelte.js";
import { guestChatStore } from "#lib/stores/guest-chat.svelte.js";
import { layoutUIStore } from "#lib/stores/ui/layout-ui.svelte.js";
import { modalUIStore } from "#lib/stores/ui/modal-ui.svelte.js";
import { notificationStore } from "#lib/stores/ui/notification.svelte.js";
import { canvasRegistry } from "#lib/stores/canvas-registry.svelte.js";
import { openCanvasFromZen } from "#lib/stores/ui/navigation.js";
import { revisionService } from "#lib/services/RevisionService.svelte.js";
import { copyGuestEntityLink } from "#lib/services/publishing/guest-link.js";
import {
  dungeonDelveService,
  isDelveLocationEntity,
} from "#lib/services/dungeon-delve-service.js";
import {
  isMonsterLabsHandoffEligibleType,
  getMonsterLabsActionLabel,
} from "#lib/services/seo/monsterlabs-handoff.js";
import { getDelveCanvasLabel } from "#lib/utils/delve-terminology.js";
import {
  dispatchSearchEntityFocus,
  DEFAULT_SEARCH_ENTITY_ZOOM,
} from "#lib/components/search/search-focus.js";
import { goto } from "$app/navigation";
import { soundBiteService } from "@codex/audio-engine";

export interface EntityAction {
  id: string;
  /** Plain, sentence-case text shown on the button or menu item. */
  label: string;
  /** Accessible name when it must differ from the visible label. */
  ariaLabel?: string;
  /** An Iconify class, e.g. `icon-[lucide--target]`. */
  icon: string;
  /** Already guarded: a failure is reported to the user, never thrown. */
  run: () => Promise<void>;
  placement: "primary" | "menu";
  tone: "default" | "danger";
  testId: string;
  state?: "busy" | "done";
  disabled?: boolean;
  helpTarget?: string;
}

export interface EntityActionsInput {
  entity: Entity;
  isGuest: boolean;
  isGraphView: boolean;
  canGuestEdit: boolean;
  publishId?: string | null;
  existingCanvas?: { id?: string; slug?: string } | null;
  onStartEdit?: () => void;
  onDelete?: () => void | Promise<void>;
  onExpand?: () => void;
  onMonsterLabs?: () => void;
  monsterLabsOpen?: boolean;
  monsterLabsLoading?: boolean;
}

export interface EntityActionsDeps {
  notify: (message: string, type: "error") => void;
  openZen: (entityId: string) => void;
  openRevision: (entityId: string) => void;
  isRevising: () => boolean;
  findInGraph: (entityId: string) => void;
  shelve: (entityId: string) => Promise<boolean>;
  copyLink: (publishId: string, entityId: string) => Promise<unknown>;
  openGuestChat: (entityId: string, title: string) => void;
  openSoundBite: (entity: Entity) => void;
  openCanvas: (canvas: { id?: string; slug?: string }) => void;
  buildDelveCanvas: (entity: Entity) => Promise<{ slug: string }>;
  delveLabel: () => string;
}

const DONE_MS = 2000;

const defaultDeps: EntityActionsDeps = {
  notify: (message, type) => notificationStore.notify(message, type),
  openZen: (id) => modalUIStore.openZenMode(id),
  openRevision: (id) => modalUIStore.openRevisionDialog(id),
  isRevising: () => revisionService.isRevising,
  findInGraph: (id) => {
    layoutUIStore.findInGraph();
    dispatchSearchEntityFocus(id, DEFAULT_SEARCH_ENTITY_ZOOM);
  },
  shelve: (id) => shelf.shelve([id], vault.vaultName ?? "This vault"),
  copyLink: (publishId, id) => copyGuestEntityLink(publishId, id),
  openGuestChat: (id, title) => guestChatStore.openChat(id, title),
  openSoundBite: (entity) => {
    // Skip loadFromEntity if the modal is already showing this entity —
    // calling it again would reset result/error and interrupt active playback.
    const alreadyOpen =
      modalUIStore.soundBite?.show &&
      modalUIStore.soundBite.entityId === entity.id;
    if (!alreadyOpen) soundBiteService.loadFromEntity(entity);
    modalUIStore.openSoundBite(entity.id);
  },
  openCanvas: (canvas) => {
    openCanvasFromZen(canvas, goto);
  },
  buildDelveCanvas: async (entity) => {
    const doc = dungeonDelveService.buildDelveCanvasFromConcept(entity);
    return { slug: await canvasRegistry.importCanvas(doc) };
  },
  delveLabel: () => getDelveCanvasLabel(themeStore.activeTheme.id),
};

/**
 * The one ordered list of actions an entity offers, shared by every view that
 * shows them. `getInput` is read on every access, so the list follows reactive
 * inputs; the "done" ticks after Shelf and Copy link are state of their own.
 */
export function createEntityActions(
  getInput: () => EntityActionsInput,
  overrides: Partial<EntityActionsDeps> = {},
) {
  const deps: EntityActionsDeps = { ...defaultDeps, ...overrides };
  let doneIds = $state<string[]>([]);

  const markDone = (id: string) => {
    doneIds = [...doneIds, id];
    setTimeout(() => (doneIds = doneIds.filter((d) => d !== id)), DONE_MS);
  };

  const guarded =
    (failure: string, fn: () => void | Promise<void>) => async () => {
      try {
        await fn();
      } catch (err) {
        console.error(`[EntityActions] ${failure}`, err);
        deps.notify(failure, "error");
      }
    };

  type Spec = Omit<EntityAction, "tone" | "run"> & {
    tone?: EntityAction["tone"];
    failure: string;
    run: () => void | Promise<void>;
  };
  type Builder = (input: EntityActionsInput) => Spec | null;

  const editAction: Builder = (input) =>
    input.onStartEdit && (!input.isGuest || input.canGuestEdit)
      ? {
          id: "edit",
          label: "Edit",
          icon: "icon-[lucide--square-pen]",
          placement: "primary",
          testId: "detail-edit-button",
          failure: "Could not start editing.",
          run: () => input.onStartEdit?.(),
        }
      : null;

  const copyLinkAction: Builder = (input) => {
    const publishId = input.publishId;
    if (!input.isGuest || !publishId) return null;
    const done = doneIds.includes("copy-link");
    return {
      id: "copy-link",
      label: "Copy link",
      icon: done ? "icon-[lucide--check]" : "icon-[lucide--link]",
      placement: "primary",
      testId: "copy-guest-link-button",
      state: done ? "done" : undefined,
      failure: "Could not copy the link.",
      run: async () => {
        await deps.copyLink(publishId, input.entity.id);
        markDone("copy-link");
      },
    };
  };

  const findInGraphAction: Builder = (input) =>
    input.isGraphView
      ? {
          id: "find-in-graph",
          label: "Find in graph",
          icon: "icon-[lucide--target]",
          placement: "primary",
          testId: "find-in-graph-button",
          failure: "Could not find this in the graph.",
          run: () => deps.findInGraph(input.entity.id),
        }
      : null;

  const expandAction: Builder = (input) => ({
    id: "expand",
    label: "Expand",
    icon: "icon-[lucide--maximize-2]",
    placement: "primary",
    testId: "enter-zen-mode-button",
    failure: "Could not expand this view.",
    run: () => (input.onExpand ?? (() => deps.openZen(input.entity.id)))(),
  });

  const reviseAction: Builder = (input) => {
    if (input.isGuest) return null;
    const revising = deps.isRevising();
    return {
      id: "revise",
      label: "AI revise description",
      ariaLabel: "AI Revise Description",
      icon: "icon-[lucide--sparkles]",
      placement: "menu",
      testId: "revise-description-button",
      state: revising ? "busy" : undefined,
      disabled: revising,
      failure: "Could not open the revision dialog.",
      run: () => deps.openRevision(input.entity.id),
    };
  };

  const chatAction: Builder = ({ entity, isGuest }) =>
    isGuest &&
    entity.type === "character" &&
    entity.guestChatConfig?.isEnabled &&
    entity.guestChatConfig.extraInstructions?.trim()
      ? {
          id: "chat",
          label: "Chat with character",
          icon: "icon-[lucide--messages-square]",
          placement: "menu",
          testId: "guest-chat-button",
          failure: "Could not open the chat.",
          run: () => deps.openGuestChat(entity.id, entity.title),
        }
      : null;

  const soundBiteAction: Builder = ({ entity, isGuest }) =>
    !isGuest || entity.soundBite
      ? {
          id: "sound-bite",
          label: entity.soundBite ? "Play sound bite" : "Generate sound bite",
          ariaLabel: "Sound bite",
          icon: entity.soundBite
            ? "icon-[lucide--volume-2]"
            : "icon-[lucide--mic]",
          placement: "menu",
          testId: "sound-bite-button",
          failure: "Could not open the sound bite.",
          run: () => deps.openSoundBite(entity),
        }
      : null;

  const delveMapAction: Builder = ({ entity, existingCanvas }) => {
    if (!isDelveLocationEntity(entity)) return null;
    const verb = existingCanvas ? "Open" : "Build";
    return {
      id: "delve-map",
      label: `${verb} ${deps.delveLabel()}`,
      icon: "icon-[lucide--map]",
      placement: "menu",
      testId: "build-delve-canvas-header-button",
      failure: `Could not ${verb.toLowerCase()} the map.`,
      run: async () =>
        deps.openCanvas(
          existingCanvas ?? (await deps.buildDelveCanvas(entity)),
        ),
    };
  };

  const shelfAction: Builder = ({ entity, isGuest }) => {
    if (isGuest) return null;
    const shelved = doneIds.includes("shelf");
    return {
      id: "shelf",
      label: "Send to Shelf",
      icon: shelved ? "icon-[lucide--check]" : "icon-[lucide--library]",
      placement: "menu",
      testId: "send-to-shelf-button",
      state: shelved ? "done" : undefined,
      failure: "Could not send this to the Shelf.",
      run: async () => {
        if (await deps.shelve(entity.id)) markDone("shelf");
      },
    };
  };

  const monsterLabsAction: Builder = (input) => {
    if (!isMonsterLabsHandoffEligibleType(input.entity.type)) return null;
    const loading = !!input.monsterLabsLoading;
    return {
      id: "monsterlabs",
      label: getMonsterLabsActionLabel(input.entity.type),
      icon: loading
        ? "icon-[lucide--loader-2] animate-spin"
        : "icon-[lucide--external-link]",
      placement: "menu",
      testId: "send-to-monsterlabs-button",
      state: loading ? "busy" : undefined,
      disabled: !!input.monsterLabsOpen,
      failure: "Could not start the MonsterLabs handoff.",
      run: () => input.onMonsterLabs?.(),
    };
  };

  const deleteAction: Builder = (input) =>
    !input.isGuest && input.onDelete
      ? {
          id: "delete",
          label: "Delete",
          icon: "icon-[lucide--trash-2]",
          placement: "menu",
          tone: "danger",
          testId: "delete-entity-button",
          failure: "Could not delete this.",
          run: () => input.onDelete?.(),
        }
      : null;

  // One order, used everywhere; Delete stays last.
  const builders: Builder[] = [
    editAction,
    copyLinkAction,
    findInGraphAction,
    expandAction,
    reviseAction,
    chatAction,
    soundBiteAction,
    delveMapAction,
    shelfAction,
    monsterLabsAction,
    deleteAction,
  ];

  const build = (): EntityAction[] => {
    const input = getInput();
    return builders.flatMap((builder) => {
      const spec = builder(input);
      if (!spec) return [];
      const { failure, run, tone, ...rest } = spec;
      return [{ tone: tone ?? "default", run: guarded(failure, run), ...rest }];
    });
  };

  return {
    get actions(): EntityAction[] {
      return build();
    },
  };
}
