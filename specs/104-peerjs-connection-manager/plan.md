# Implementation Plan: Unified PeerJS Connection Manager

**Branch**: `104-peerjs-connection-manager` | **Date**: 2026-05-20 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `./spec.md`

---

## Summary

The goal of Spec 104 is to design and implement a single, unified, state-reactive class named `PeerJSConnectionManager` that handles peer-to-peer connection lifecycles, heartbeats, and re-establishments.

By centralizing connection states and diagnostics, we lay the reactive foundation for multi-peer syncing and future direct audio/video calling channels.

---

## Technical Context

- **Language/Version**: TypeScript 6.0.3, Svelte 5 Runes.
- **Primary Dependencies**: PeerJS, Svelte, and `@codex/events`.
- **Storage**: Transient/In-memory for connection state, active streams, and packet buffers.
- **Testing**: Vitest for unit testing.
- **Target Platform**: Modern Browsers (WebRTC & Web Crypto API support).
- **Project Type**: Web Application Utility Service.
- **Performance Goals**: State changes propagate and reflect in VTT views in under 200ms from socket events.
- **Constraints**: 100% client-side, zero server-side state storage.

---

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle            | Status  | Alignment & Design Choice                                                                                                                           |
| -------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **I. Library-First** | Aligned | Encapsulated utility that will be placed under the cloud-bridge package structure, designed to easily transition to a standalone package if needed. |
| **II. TDD**          | Aligned | Fully mockable signaling/peer instances will be provided via DI to test handshake transitions, retry loops, and teardown states with 100% coverage. |
| **III. Simplicity**  | Aligned | Uses standard PeerJS events and standard timing/backoff utilities.                                                                                  |
| **V. Privacy**       | Aligned | WebRTC connection metadata is processed purely on-client; credentials/tokens are ephemeral.                                                         |
| **VI. Clean Imp.**   | Aligned | Full type definitions, `pnpm test` verified, zero compilation warnings, unused variables prefixed with `_`.                                         |
| **VIII. DI**         | Aligned | Constructor-based dependency injection for `Peer` creation, timer/heartbeat schedules, and retry mechanisms.                                        |

---

## Project Structure

### Documentation (this feature)

```text
specs/104-peerjs-connection-manager/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Research findings
├── data-model.md        # Data machine & types
├── quickstart.md        # Developer usage instructions
├── contracts/
│   └── api.md           # API signature & payload contract
└── checklists/
    └── requirements.md  # Core requirements list
```

### Source Code

```text
apps/web/src/lib/
└── cloud-bridge/
    └── p2p/
        ├── connection-manager.svelte.ts     # [NEW] Main connection manager class
        └── tests/
            └── connection-manager.test.ts   # [NEW] Vitest unit test suite
```

**Structure Decision**: The class will be integrated into the existing `apps/web/src/lib/cloud-bridge/p2p/` directory alongside the transport services.

---

## Complexity Tracking

No constitution violations detected.

---

## Verification Plan

### Automated Tests

- Execute unit tests covering all lifecycle transitions (`idle` ➔ `connecting` ➔ `handshaking` ➔ `connected` ➔ `reconnecting` ➔ `failed`):
  ```bash
  pnpm --filter web test -- src/lib/cloud-bridge/p2p/tests/connection-manager.test.ts
  ```

### Manual Verification

- Deploying the app locally, copying the guest invite link, and opening in an incognito window.
- Manually toggling network offline in Developer Tools to verify the 15-second visual reconnect and exponential retry loop state propagation.
