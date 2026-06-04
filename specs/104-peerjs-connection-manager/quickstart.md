# Quickstart: Unified PeerJS Connection Manager

This guide shows developers how to consume the `PeerJSConnectionManager` in UI components or services.

## 1. Importing the Manager

The `PeerJSConnectionManager` is designed as a class utilizing Svelte 5 Runes for local reactivity, alongside standard constructor-based Dependency Injection.

```typescript
import { PeerJSConnectionManager } from "$lib/cloud-bridge/p2p/connection-manager.svelte";
```

## 2. Instantiating / Injecting in Svelte 5

```svelte
<script lang="ts">
  import { PeerJSConnectionManager } from "$lib/cloud-bridge/p2p/connection-manager.svelte";

  // Create or retrieve the manager instance
  const manager = new PeerJSConnectionManager();

  // Register a message listener
  manager.onMessage("chat:message", (msg) => {
    console.log(`Received message from ${msg.senderId}:`, msg.payload);
  });

  // Action handlers
  function handleConnect() {
    manager.connect("target-host-peer-id");
  }

  function handleDisconnect() {
    manager.disconnect();
  }
</script>

<div class="p-4 bg-theme-bg rounded-lg border border-theme-border">
  <h3 class="text-theme-primary">P2P Lobby</h3>

  <!-- Reactive UI Binding -->
  <div class="flex items-center gap-2 mt-2">
    <span>Status:</span>
    <span
      class="badge text-xs uppercase px-2 py-1 rounded"
      class:bg-green-500={manager.state.status === "connected"}
      class:bg-yellow-500={manager.state.status === "connecting" ||
        manager.state.status === "reconnecting"}
      class:bg-red-500={manager.state.status === "failed"}
      class:bg-gray-500={manager.state.status === "idle" ||
        manager.state.status === "disconnected"}
    >
      {manager.state.status}
    </span>
  </div>

  {#if manager.state.status === "connected"}
    <div class="text-xs text-theme-muted mt-1">
      Latency: {manager.state.latencyMs}ms
    </div>
  {/if}

  <div class="flex gap-2 mt-4">
    <button
      class="btn btn-primary"
      onclick={handleConnect}
      disabled={manager.state.status === "connected"}
    >
      Connect
    </button>
    <button
      class="btn btn-secondary"
      onclick={handleDisconnect}
      disabled={manager.state.status === "idle" ||
        manager.state.status === "disconnected"}
    >
      Disconnect
    </button>
  </div>
</div>
```
