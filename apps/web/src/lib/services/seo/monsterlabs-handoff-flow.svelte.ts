/**
 * Shared confirm-first MonsterLabs sending flow (#2887 follow-up): the user
 * confirms in a modal before anything happens, then sees that an Oracle call
 * is in flight, then gets a link to open MonsterLabs once the (possibly
 * compressed) prompt is ready. Used identically by DetailHeader, ZenHeader,
 * and SEOGeneratorLayout, so the state machine lives here once instead of
 * three times.
 */
import {
  buildMonsterLabsHandoffUrl,
  type MonsterLabsHandoffSource,
} from "./monsterlabs-handoff";
import { openExternalGeneratorUrl } from "$lib/utils/external-generator-handoff";
import { notificationStore } from "$lib/stores/ui/notification.svelte";

export type MonsterLabsHandoffState = "confirm" | "loading" | "ready";

export function createMonsterLabsHandoffFlow() {
  let state = $state<MonsterLabsHandoffState>("confirm");
  let open = $state(false);
  let entityLabel = $state<string | undefined>(undefined);
  let url = $state<string | undefined>(undefined);
  let pendingSource: MonsterLabsHandoffSource | null = null;

  function start(source: MonsterLabsHandoffSource) {
    pendingSource = source;
    entityLabel = source.name;
    url = undefined;
    state = "confirm";
    open = true;
  }

  function close() {
    open = false;
    pendingSource = null;
    url = undefined;
  }

  async function confirm() {
    if (!pendingSource || state !== "confirm") return;
    state = "loading";
    const result = await buildMonsterLabsHandoffUrl(pendingSource);
    if (!result.ok) {
      notificationStore.notify(
        result.reason === "url-too-long"
          ? "This entity is too long to send to MonsterLabs."
          : "Add some content before sending to MonsterLabs.",
        "error",
      );
      close();
      return;
    }
    url = result.url;
    state = "ready";
    // Try to open immediately — this still runs across the `await` above, so
    // it is not guaranteed in every browser. The "ready" state's own link is
    // the reliable fallback for that case, not an error state.
    openExternalGeneratorUrl(result.url);
  }

  function openManually() {
    if (url) openExternalGeneratorUrl(url);
  }

  return {
    get state() {
      return state;
    },
    get open() {
      return open;
    },
    get entityLabel() {
      return entityLabel;
    },
    get url() {
      return url;
    },
    start,
    confirm,
    openManually,
    close,
  };
}

export type MonsterLabsHandoffFlow = ReturnType<
  typeof createMonsterLabsHandoffFlow
>;
