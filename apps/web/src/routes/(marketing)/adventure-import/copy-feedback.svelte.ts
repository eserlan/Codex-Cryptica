import { onDestroy } from "svelte";
import { copyTextToClipboard } from "#lib/utils/share-link.js";

export type CopyState = "idle" | "copied" | "error";

export interface Copier {
  copy: () => Promise<void>;
  readonly state: CopyState;
  /** Button text for the current state. */
  label: (idle: string, copied?: string, failed?: string) => string;
}

/**
 * One copy action with its own feedback state and a stale-result guard.
 * Call during component initialisation: it clears its timer on destroy.
 */
export function createCopier(text: string): Copier {
  let state = $state<CopyState>("idle");
  let generation = 0;
  let isDestroyed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  onDestroy(() => {
    isDestroyed = true;
    if (timer) clearTimeout(timer);
  });

  async function copy() {
    const current = ++generation;
    if (timer) {
      clearTimeout(timer);
      timer = undefined;
    }
    const ok = await copyTextToClipboard(
      text,
      typeof navigator === "undefined" ? undefined : navigator.clipboard,
    );
    if (isDestroyed || current !== generation) return;

    state = ok ? "copied" : "error";
    // ui-check-ignore: stored in `timer` and cleared in onDestroy
    timer = setTimeout(() => {
      if (isDestroyed || current !== generation) return;
      state = "idle";
      timer = undefined;
    }, 2200);
  }

  return {
    copy,
    get state() {
      return state;
    },
    label(
      idle,
      copied = "Copied",
      failed = "Copy failed — select the text manually",
    ) {
      if (state === "copied") return copied;
      if (state === "error") return failed;
      return idle;
    },
  };
}
