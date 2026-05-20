# Research: Unified PeerJS Connection Manager

This document outlines the technical research, architectural decisions, and alternatives considered for Spec 104.

## 1. Network Topology for Syncing

- **Decision**: **Star-Topology** (Host as central authority).
- **Rationale**: Keeps bandwidth requirements low for guests, ensures a single source of truth for the tabletop campaign, and minimizes the total WebRTC active connections on low-end client machines.
- **Alternatives Considered**:
  - _Full Mesh_: Rejected because mesh requires $O(N^2)$ connections. Bandwidth and CPU consumption scale poorly with more than 3-4 players.

## 2. Reconnection and Failure Recovery

- **Decision**: **Exponential Backoff with Max Retries (Limit of 3 attempts), followed by State Transition to `failed`**.
- **Rationale**: Safely attempts recovery for temporary internet drops, but terminates gracefully when the network is completely down or the signaling server is unreachable. Prevents infinite looping which degrades system performance.
- **Alternatives Considered**:
  - _Infinite Retry Loops_: Rejected because infinite background retries with no user intervention can cause massive CPU/memory leaks, lock the main browser thread, and spam signaling servers.

## 3. Connection Admittance & Security

- **Decision**: **Shareable Link Open Access** containing the Host's Peer ID.
- **Rationale**: Delivers a zero-friction UX for casual gaming. Guests can simply click a single link and instantly join the session.
- **Alternatives Considered**:
  - _Passcode / Password Token Handshake_: Rejected to prioritize seamless, instant-join tabletop gameplay.
  - _Host Approval Dialog_: Rejected to avoid interrupting the campaign host's focus during game sessions.

## 4. State & Message Propagation

- **Decision**: **Svelte 5 Runes + Registered Callbacks**.
- **Rationale**: Svelte 5 Runes (`$state` / `$derived`) provide reactivity directly integrated into the UI. Callback hooks are perfect for lightweight, decoupled processing of incoming WebRTC message payloads.
- **Alternatives Considered**:
  - _Event Bus / CustomEvent Dispatching_: Rejected because CustomEvents require DOM-context or custom event-target logic, adding unnecessary overhead.
  - _Svelte 4 Store Subscriptions_: Deprecated in Svelte 5.

## 5. Connection Diagnostics & Heartbeat

- **Decision**: **Active Ping-Pong Heartbeat every 10 seconds**.
- **Rationale**: WebRTC connections can silently drop without triggering standard socket event listeners. Periodic tiny payloads keep NAT mappings open, prevent aggressive mobile browser background hibernation, and calculate precise, rolling round-trip times (RTT) for UI latency displays.
- **Alternatives Considered**:
  - _Passive Monitoring only_: Rejected because passive WebRTC state properties are notoriously slow to register dropouts in mobile browser sandboxes.
