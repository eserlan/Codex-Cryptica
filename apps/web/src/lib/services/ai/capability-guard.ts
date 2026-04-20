import { uiStore } from "../../stores/ui.svelte";

export function assertAIEnabled() {
  if (uiStore.aiDisabled) {
    throw new Error("AI features are disabled.");
  }
}

export function isAIEnabled(): boolean {
  return !uiStore.aiDisabled;
}
