# Implementation Tasks: P2P Guest Service Decoupling

## Dependencies

- **US1** (Guest Transport Abstraction) -> **None**
- **US2** (Protocol Dispatcher) -> **US1**
- **US3** (Inbound Handler Isolation) -> **US2**
- **US4** (File Request Channel Extraction) -> **US1** (Can be parallel to US2/US3)
- **US5** (Outbound Coordination Facade) -> **US3**, **US4**

## Implementation Strategy

Start by defining the generic contracts and base implementations. Then build out the transport and dispatcher. Handler implementations (US3) are highly parallelizable. Finally, refactor the main service to act as a thin orchestrator over the new components.

## Phase 1: Setup

Goal: Initialize new modular structure for the guest service.

- [x] T001 Create `apps/web/src/lib/cloud-bridge/p2p/transport`, `dispatcher`, and `handlers` directories

## Phase 2: Foundational

Goal: Establish the base contracts and generalized models.

- [x] T002 [P] Create `P2PClientTransport` interface in `apps/web/src/lib/cloud-bridge/p2p/transport/client-transport.ts`
- [x] T003 [P] Create `GuestHandlerContext` interface and generalize `BaseHandler` in `apps/web/src/lib/cloud-bridge/p2p/handlers/base-handler.ts`
- [x] T004 Generalize `P2PDispatcher` in `apps/web/src/lib/cloud-bridge/p2p/dispatcher/p2p-dispatcher.ts` to accept generic context

## Phase 3: Guest Transport Abstraction [US1]

Goal: Implement and test the PeerJS client transport, abstracting away direct PeerJS callbacks.
Independent Test: Guest can complete a join handshake and receive inbound data using a mock transport.

- [x] T005 [P] [US1] Implement `MockClientTransport` for testing in `apps/web/src/lib/cloud-bridge/p2p/transport/mock-client-transport.ts`
- [x] T006 [US1] Implement `PeerJsClientTransport` (with epoch staleness filtering) in `apps/web/src/lib/cloud-bridge/p2p/transport/peerjs-client-transport.ts`
- [x] T007 [P] [US1] Write unit tests for `PeerJsClientTransport` in `apps/web/src/lib/cloud-bridge/p2p/transport/peerjs-client-transport.test.ts`

## Phase 4: Protocol Dispatcher [US2]

Goal: Route inbound P2P messages to dedicated handlers, removing the massive `if/else` block.
Independent Test: Send known and unknown message types to dispatcher with mock handlers and assert correct routing.

- [x] T008 [US2] Create unit tests for generalized `P2PDispatcher` with guest context in `apps/web/src/lib/cloud-bridge/p2p/dispatcher/p2p-dispatcher.test.ts`

## Phase 5: Inbound Handler Isolation [US3]

Goal: Create focused handlers for each domain (Vault, VTT, Map Asset, Presence, Chat, Session).
Independent Test: Test each handler by feeding it a mock message and asserting correct context interactions.

- [x] T009 [P] [US3] Implement `MapAssetUrlCache` in `apps/web/src/lib/cloud-bridge/p2p/handlers/map-asset-url-cache.ts`
- [x] T010 [P] [US3] Write unit tests for `MapAssetUrlCache` in `apps/web/src/lib/cloud-bridge/p2p/handlers/map-asset-url-cache.test.ts`
- [x] T011 [P] [US3] Implement `GuestVaultHandler` for `GRAPH_SYNC`, `ENTITY_UPDATE`, etc. in `apps/web/src/lib/cloud-bridge/p2p/handlers/guest-vault-handler.ts`
- [x] T012 [P] [US3] Write unit tests for `GuestVaultHandler` in `apps/web/src/lib/cloud-bridge/p2p/handlers/guest-vault-handler.test.ts`
- [x] T013 [P] [US3] Implement `GuestMapAssetHandler` for `MAP_SYNC`, `MAP_FOG_SYNC` in `apps/web/src/lib/cloud-bridge/p2p/handlers/guest-map-asset-handler.ts`
- [x] T014 [P] [US3] Write unit tests for `GuestMapAssetHandler` in `apps/web/src/lib/cloud-bridge/p2p/handlers/guest-map-asset-handler.test.ts`
- [x] T015 [P] [US3] Implement `GuestSessionHandler` for snapshots and session ends in `apps/web/src/lib/cloud-bridge/p2p/handlers/guest-session-handler.ts`
- [x] T016 [P] [US3] Write unit tests for `GuestSessionHandler` in `apps/web/src/lib/cloud-bridge/p2p/handlers/guest-session-handler.test.ts`
- [x] T017 [P] [US3] Implement `GuestVttHandler` for real-time tokens/turns in `apps/web/src/lib/cloud-bridge/p2p/handlers/guest-vtt-handler.ts`
- [x] T018 [P] [US3] Write unit tests for `GuestVttHandler` in `apps/web/src/lib/cloud-bridge/p2p/handlers/guest-vtt-handler.test.ts`
- [x] T019 [P] [US3] Implement `GuestChatHandler` in `apps/web/src/lib/cloud-bridge/p2p/handlers/guest-chat-handler.ts`
- [x] T020 [P] [US3] Write unit tests for `GuestChatHandler` in `apps/web/src/lib/cloud-bridge/p2p/handlers/guest-chat-handler.test.ts`
- [x] T021 [P] [US3] Implement `GuestPresenceHandler` in `apps/web/src/lib/cloud-bridge/p2p/handlers/guest-presence-handler.ts`
- [x] T022 [P] [US3] Write unit tests for `GuestPresenceHandler` in `apps/web/src/lib/cloud-bridge/p2p/handlers/guest-presence-handler.test.ts`

## Phase 6: File Request Channel Extraction [US4]

Goal: Dedicated request/response component for chunked guest file requests.
Independent Test: Drive a mock transport with a multi-chunk `FILE_RESPONSE` and verify resulting Blob.

- [x] T023 [P] [US4] Implement `GuestFileClient` in `apps/web/src/lib/cloud-bridge/p2p/guest-file-client.ts`
- [x] T024 [P] [US4] Write unit tests for `GuestFileClient` in `apps/web/src/lib/cloud-bridge/p2p/guest-file-client.test.ts`

## Phase 7: Outbound Coordination Facade [US5]

Goal: Reduce `guest-service.ts` to a thin orchestration and outbound API facade.
Independent Test: Verify `P2PGuestService` exposes required API and delegates correctly without regressions.

- [x] T025 [US5] Refactor `P2PGuestService` in `apps/web/src/lib/cloud-bridge/p2p/guest-service.ts` using DI for transport, dispatcher, and handlers
- [x] T026 [US5] Update `guest-service.test.ts` to reflect the new modular architecture in `apps/web/src/lib/cloud-bridge/p2p/guest-service.test.ts`

## Phase 8: Polish

Goal: Verify integration and ensure code size reduction and memory leak elimination.

- [x] T027 Run P2P E2E tests and ensure no regressions
- [x] T028 Validate `guest-service.ts` is under 200 lines
- [x] T029 Perform final memory leak verification for Object URLs
- [x] T030 Verify inbound message dispatch completes in <= 1 ms per message (FR-004 performance target)
