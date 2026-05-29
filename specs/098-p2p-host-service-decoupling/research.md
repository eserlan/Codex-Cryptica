# Research: P2P Host Service Decoupling

## Research Tasks

1.  **Research PeerJS abstraction for P2P Host Service context**
2.  **Find best practices for PeerJS in P2P Bridge domain**
3.  **Research binary ArrayBuffer streaming for P2P Host Service context**
4.  **Find best practices for ArrayBuffer streaming in VTT domain**

## Consolidated Findings

### Decision: P2PTransport Interface

- **Decision**: Define a high-level `P2PTransport` interface that emits typed events.
- **Rationale**: Decouples the `HostService` from PeerJS-specific events (`open`, `connection`, `data`), allowing for easier mocking and potential future transport swaps.
- **Alternatives considered**: Direct PeerJS wrapping (rejected: too tightly coupled to PeerJS event strings).

### Decision: Binary File Chunking

- **Decision**: Use a simplified chunking mechanism for `ArrayBuffer` data if exceeds 16KB (standard RTC limit for some browsers), though modern PeerJS handles large blobs; we will explicitly stream from OPFS to avoid memory spikes.
- **Rationale**: Ensures the host remains responsive during large file transfers (e.g., high-res maps).
- **Alternatives considered**: Base64 encoding (rejected: 33% overhead and memory heavy).

### Decision: Message Dispatcher Pattern

- **Decision**: Implement a registry-based dispatcher mapping message types to Action Handlers.
- **Rationale**: Eliminates the giant `if/else` block and allows handlers to be unit-tested in isolation.
- **Alternatives considered**: Event Bus for all internal routing (rejected: overkill for a single host-to-guest protocol flow).
