const SAVE_DELAY_MS = 600;

export interface DebouncedTextSave {
  /** Record new text and restart the pause timer. */
  change: (text: string) => void;
  /** Save any pending text now (blur, or the panel closing). */
  flush: () => void;
}

/**
 * Saves typed text after a short pause, so each keystroke does not write the
 * vault. Text equal to what is already committed is never written.
 */
export function createDebouncedTextSave(options: {
  save: (text: string) => void;
  committed: () => string;
}): DebouncedTextSave {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: string | null = null;

  const flush = () => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
    if (pending === null) return;
    const text = pending;
    pending = null;
    if (text !== options.committed()) options.save(text);
  };

  return {
    change(text) {
      pending = text;
      if (timer !== null) clearTimeout(timer);
      timer = setTimeout(flush, SAVE_DELAY_MS);
    },
    flush,
  };
}
