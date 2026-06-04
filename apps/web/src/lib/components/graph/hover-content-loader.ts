export const HOVER_CONTENT_LOAD_DELAY_MS = 150;

export interface HoverContentLoader {
  schedule(entityId: string | null | undefined): void;
  cancel(): void;
}

export function createHoverContentLoader(
  loadEntityContent: (entityId: string) => void | Promise<void>,
  delayMs = HOVER_CONTENT_LOAD_DELAY_MS,
): HoverContentLoader {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  function cancel() {
    if (timeout !== undefined) {
      clearTimeout(timeout);
      timeout = undefined;
    }
  }

  return {
    schedule(entityId) {
      cancel();
      if (!entityId) return;

      timeout = setTimeout(() => {
        timeout = undefined;
        void loadEntityContent(entityId);
      }, delayMs);
    },
    cancel,
  };
}
