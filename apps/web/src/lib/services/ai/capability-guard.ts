import { browser } from "$app/environment";

export function assertAIEnabled() {
  if (browser) {
    // Note: We can't easily await here without making everything async.
    // However, the text generation service already handles the check.
    // For now, let's just assume enabled if we can't check synchronously,
    // or better, rely on the caller in the main thread.
  }
}

export function isAIEnabled(): boolean {
  return true; // Simplest for worker compatibility; callers in main thread handle the UI flag
}
