/**
 * Share flow state machine similar to MonsterLabs handoff.
 * Handles confirm → loading → ready states for safe async share creation.
 */
import { notificationStore } from "$lib/stores/ui/notification.svelte";

export type GeneratorShareFlowState = "confirm" | "loading" | "ready";

export interface ShareFlowInput {
  title: string;
  prepareShare: () => Promise<{
    url: string;
    title?: string;
    text?: string;
  }>;
}

export function createGeneratorShareFlow() {
  let state = $state<GeneratorShareFlowState>("confirm");
  let open = $state(false);
  let subject = $state<string | undefined>(undefined);
  let shareData = $state<
    | {
        url: string;
        title?: string;
        text?: string;
      }
    | undefined
  >(undefined);
  let pendingInput: ShareFlowInput | null = null;

  function start(input: ShareFlowInput) {
    pendingInput = input;
    subject = input.title;
    shareData = undefined;
    state = "confirm";
    open = true;
  }

  function close() {
    open = false;
    pendingInput = null;
    shareData = undefined;
  }

  async function confirm() {
    if (!pendingInput || state !== "confirm") return;
    state = "loading";
    try {
      const data = await pendingInput.prepareShare();
      shareData = data;
      state = "ready";
      // Try to call navigator.share if available, but don't fail if it doesn't work
      if (typeof navigator !== "undefined" && navigator.share) {
        try {
          await navigator.share({
            title: data.title,
            text: data.text,
            url: data.url,
          });
          close();
          return;
        } catch (err) {
          // User cancelled or navigator.share failed, but the ready state
          // modal with copy/link buttons is still available as fallback
          if ((err as { name?: string })?.name !== "AbortError") {
            console.warn("[ShareFlow] navigator.share failed", err);
          }
        }
      }
    } catch (_err) {
      notificationStore.notify("Could not create a share link.", "error");
      close();
    }
  }

  function copyLink(link: string) {
    void navigator.clipboard
      .writeText(link)
      .then(() => {
        notificationStore.notify("Link copied to clipboard", "success");
      })
      .catch(() => {
        notificationStore.notify("Failed to copy link", "error");
      });
  }

  return {
    get state() {
      return state;
    },
    get open() {
      return open;
    },
    get subject() {
      return subject;
    },
    get shareData() {
      return shareData;
    },
    start,
    confirm,
    close,
    copyLink,
  };
}

export type GeneratorShareFlow = ReturnType<typeof createGeneratorShareFlow>;
