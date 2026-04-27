export function assertAIEnabled() {
  if (!isAIEnabled()) {
    throw new Error("AI features are disabled.");
  }
}

export function isAIEnabled(): boolean {
  // Manual check for browser environment to avoid $app/environment in workers
  const isBrowser =
    typeof window !== "undefined" && typeof localStorage !== "undefined";

  if (isBrowser) {
    // Sync check from localStorage as used in UIStore
    const disabled = localStorage.getItem("codex_ai_disabled");
    if (disabled === "true") return false;

    // Fallback to old "lite" flag if present
    const lite = localStorage.getItem("codex_ai_lite_mode");
    if (lite === "true") return false;
  }

  // In workers or if no localStorage, we return true to avoid blocking
  // background processing. The actual text generation call is gated
  // by the main-thread OracleStore which passes aiDisabled down.
  return true;
}
