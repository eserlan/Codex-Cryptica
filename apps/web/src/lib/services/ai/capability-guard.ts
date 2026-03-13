import { uiStore } from "../../stores/ui.svelte";

export function assertAIEnabled() {
  if (uiStore.liteMode) {
    throw new Error("AI features are disabled in Lite Mode.");
  }
}

export function isAIEnabled(): boolean {
  return !uiStore.liteMode;
}
