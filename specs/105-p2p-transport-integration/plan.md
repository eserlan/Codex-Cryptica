# Implementation Plan: SPEC-105: P2P Transport Integration

**Branch**: `105-p2p-transport-integration` | **Date**: 2026-05-20 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `./spec.md`

---

## Summary

The goal of SPEC-105 is to refactor `P2PHostService` and `P2PGuestService` to consume the newly created `PeerJSConnectionManager` for unified WebRTC session and channel lifecycles. We will also design and build a premium-quality `P2PStatus.svelte` reactive connection badge inside the header.

---

## Technical Context

- **Language/Version**: TypeScript 6.0.3, Svelte 5 Runes.
- **Primary Dependencies**: PeerJS, Svelte 5.
- **Testing**: Vitest for unit and integration testing.
- **Styling**: Tailwind CSS 4.x with custom theme variables.

---

## Constitution Check

| Principle            | Status  | Alignment & Design Choice                                                                                                                       |
| -------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **I. Library-First** | Aligned | Reuses the modular connection manager to avoid custom socket handling and keep domain services clean.                                           |
| **II. TDD**          | Aligned | Services will be updated to accept connection managers via dependency injection, making them fully mockable and unit-testable.                  |
| **III. Simplicity**  | Aligned | Leveraging a simple catch-all wildcard subscription (`*`) on the connection manager to pass message structures straight to dispatcher handlers. |
| **V. Privacy**       | Aligned | WebRTC connection metadata and state remain strictly client-side.                                                                               |
| **VIII. DI**         | Aligned | Uses constructor dependency injection to instantiate and inject the Connection Manager.                                                         |

---

## Project Structure

### Documentation

```text
specs/105-p2p-transport-integration/
├── spec.md              # Feature specification
├── plan.md              # This file
└── tasks.md             # Detailed task list
```

### Source Code

We will modify or create the following files:

```text
apps/web/src/lib/
├── cloud-bridge/p2p/
│   ├── connection-manager.svelte.ts     # [MODIFY] Add wildcard listener support
│   ├── host-service.svelte.ts           # [MODIFY] Refactor to use connection manager
│   ├── guest-service.ts                 # [MODIFY] Refactor to use connection manager
│   └── tests/
│       ├── host-service.test.ts         # [NEW/MODIFY] Update vitest coverage
│       └── guest-service.test.ts        # [NEW/MODIFY] Update vitest coverage
└── components/layout/
    ├── P2PStatus.svelte                 # [NEW] Beautiful, animated, reactive P2P connection badge
    └── AppHeader.svelte                 # [MODIFY] Embed P2PStatus in the header next to DriveStatus
```

---

## Detailed Architectural Integration

### 1. Extending `PeerJSConnectionManager`

We will add support for wildcard (`*`) callbacks inside `PeerJSConnectionManager` to easily listen to all incoming custom messages.

```typescript
// Inside handleMessage:
const wildcards = this.messageCallbacks.get("*");
if (wildcards) {
  wildcards.forEach((cb) => cb(msg));
}
```

### 2. Refactoring `P2PHostService`

- Expose the connection manager's reactive state to the UI.
- Use constructor injection of the connection manager.
- Map the low-level connection event and data stream via connection manager listeners.

### 3. Refactoring `P2PGuestService`

- Replace legacy transport setup with `PeerJSConnectionManager`.
- Bind to the connection manager's reactive state.
- Wire data dispatches from the `*` wildcard listener to the dispatcher.

### 4. Creating `P2PStatus.svelte`

A stunning status badge utilizing:

- Tailwind 4 semantic tokens (e.g., `text-theme-primary`, `bg-theme-surface`).
- Beautiful glassmorphism, hover tooltips, and micro-animations.
- Latency (RTT) reporting, showing actual connection speed.

---

## Verification Plan

### Automated Tests

Run Vitest to verify host/guest service layers work correctly with mocked connection managers:

```bash
pnpm test
```

### Manual Verification

- Launch local development server.
- Start a host session via the share button, copy the live link.
- Join from an incognito window, observe beautiful transition states.
- Simulate disconnections and verify reconnection backoff visual updates.
