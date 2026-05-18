# Quickstart: P2P Host Service

## Initialization

The new `P2PHostService` uses dependency injection.

```typescript
import { P2PHostService } from "$lib/cloud-bridge/p2p/host-service.svelte";
import { PeerJSTransport } from "$lib/cloud-bridge/p2p/transport/peerjs-transport";

const transport = new PeerJSTransport();
const host = new P2PHostService({ transport });

// Start hosting
await host.startHosting((peerId) => {
  console.log("Hosting on:", peerId);
});
```

## Manual Broadcasting

Direct broadcast via the service:

```typescript
host.broadcastVttMessage({
  type: "PING",
  x: 100,
  y: 100,
  color: "#ff0000",
  timestamp: Date.now(),
});
```

## Adding Custom Handlers

To extend the P2P protocol, add a new handler to the `P2PDispatcher`:

1.  Implement `P2PMessageHandler`.
2.  Register in `P2PDispatcher` registry.
