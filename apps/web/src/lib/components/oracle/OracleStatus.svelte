<script lang="ts">
  import { oracle } from "../../stores/oracle.svelte";

  /**
   * OracleStatus - Displays the current Oracle connection mode
   *
   * Shows either:
   * - "System Proxy" when using the shared Cloudflare Worker
   * - "Direct Connection: Custom Key" when using user's own API key
   */

  // Keep the connection badge reactive as the oracle settings change.
  const connectionMode = $derived(oracle.connectionMode);
  const statusText = $derived(
    connectionMode === "custom-key"
      ? "Direct Connection: Custom Key"
      : "System Proxy",
  );
  const statusIcon = $derived(connectionMode === "custom-key" ? "🔐" : "☁️");
  const accessibleDescription = $derived(
    connectionMode === "custom-key"
      ? "Using your personal API key for direct connection"
      : "Using free system proxy",
  );
</script>

<div class="oracle-status" aria-live="polite" role="status">
  <span class="status-indicator" aria-hidden="true">{statusIcon}</span>
  <span class="status-text">{statusText}</span>
  <span class="sr-only">{accessibleDescription}</span>
</div>

<style>
  .oracle-status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.375rem 0.75rem;
    background: rgba(22, 78, 58, 0.15);
    border: 1px solid rgba(22, 78, 58, 0.3);
    border-radius: 0.375rem;
    font-size: 0.75rem;
    font-weight: 500;
    color: rgb(110, 231, 183);
    white-space: nowrap;
  }

  .status-indicator {
    font-size: 0.875rem;
    line-height: 1;
  }

  .status-text {
    letter-spacing: 0.025em;
    text-transform: uppercase;
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
</style>
