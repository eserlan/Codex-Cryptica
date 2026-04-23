import { browser } from "$app/environment";

export function assertAIEnabled() {
  if (!isAIEnabled()) {
    throw new Error("AI features are disabled.");
  }
}

export function isAIEnabled(): boolean {
  if (browser && typeof localStorage !== "undefined") {
    // Sync check from localStorage as used in UIStore
    const disabled = localStorage.getItem("codex_ai_disabled");
    if (disabled === "true") return false;
    
    // Fallback to old "lite" flag if present
    const lite = localStorage.getItem("codex_ai_lite_mode");
    if (lite === "true") return false;
  }
  
  // In workers or if no localStorage, we default to true.
  // The actual text generation call will still be gated by the UI 
  // which passes aiDisabled down, and the worker can't easily 
  // reactively follow UIStore.
  return true;
}
