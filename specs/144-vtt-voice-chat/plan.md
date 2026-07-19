# Implementation Plan: Voice Chat for Live VTT Sessions

**Branch**: `feat/vtt-voice-chat` | **Date**: 2026-07-19 | **Spec**: [spec.md](./spec.md)
**Status**: Implemented (retroactive documentation — PR #1755, issue #1757)

## Summary

Group voice rides the PeerJS layer the live session already uses. The
topology is **hub-and-spoke with host-side mixing**: each guest places one
WebRTC media call to the host; the host answers with a per-guest WebAudio mix
containing the host microphone plus every _other_ guest. Coordination
(roster, mute state, channel availability) travels over the existing data
channel through the established dispatcher/handler pattern.

## Technical Context

**Language/Version**: TypeScript / Svelte 5 (runes)
**Primary Dependencies**: PeerJS (media calls), Web Audio API (mixing) — no new packages
**Testing**: Vitest (jsdom) with injected fakes for AudioContext, Peer, and getUserMedia
**Target Platform**: Browsers with WebRTC + Web Audio (Chrome/Firefox/Safari)
**Constraints**: zero server cost, local-first; session cap of 10 guests bounds mixer fan-out

### Key decision: why host-mixing hub-and-spoke

| Option                                           | Verdict                                                                                                                                                                                                                          |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Full mesh (every peer calls every peer)          | Rejected: N² connections and N-1 upstream audio encodes per guest; fragile on typical home upload bandwidth.                                                                                                                     |
| SFU/MCU server                                   | Rejected: violates the zero-server, local-first constraint.                                                                                                                                                                      |
| Hub-and-spoke, host forwards raw streams         | Rejected: renegotiation churn as guests join/leave.                                                                                                                                                                              |
| **Hub-and-spoke, host mixes per guest (chosen)** | One call per guest. `MediaStreamAudioDestinationNode` streams are answered once; later sources connect _into_ the live graph, so join/leave never renegotiates existing calls (SC-004). Cost: all audio routes through the host. |

Each guest's outbound mix deliberately excludes their own source (no
self-echo, FR-003). The host hears guests via `ctx.destination`; the host mic
is never routed to `ctx.destination` (no self-echo for the host either).

### Message flow

```
Guest                        Host
  │ ── VOICE_SYNC_REQUEST ──▶ │   (on session join; reply: VOICE_ROSTER to sender)
  │ ── media call (mic) ────▶ │   peer.call(hostId, micStream)
  │ ◀── answer(per-guest mix) │   mixer.addGuest(peerId)
  │ ◀── VOICE_ROSTER ──────── │   broadcast on every roster change
  │ ── VOICE_STATE {muted} ─▶ │   host updates roster + rebroadcasts
```

Presence is implicit: an open media call _is_ membership. Closing the call
(guest leave, host end, disconnect) removes the participant.

## Constitution Check

- **I. Library-First**: Kept inside `apps/web`'s existing `cloud-bridge/p2p`
  domain rather than a new package — voice is inseparable from the app's
  session services (transports, stores, dispatcher). Extraction is deferred
  alongside the wider VTT-domain extraction (#1661).
- **IV. Dependency Injection (ADR 007)**: `VoiceChatService` and
  `HostVoiceMixer` take constructor deps (mic getter, mixer factory,
  AudioContext factory) with production defaults; both export class +
  singleton.
- **V. Help Content**: `voice-chat` entry added to `FEATURE_HINTS` in
  `help-content.ts`.
- **VII. Test Coverage**: 31 unit tests across mixer graph, service
  lifecycle, and both handlers.

## Project Structure

### Documentation (this feature)

```
specs/144-vtt-voice-chat/
├── spec.md        # Retroactive feature specification
├── plan.md        # This file
└── quickstart.md  # Manual two-browser smoke test
```

### Source Code (as implemented)

```
apps/web/src/lib/
├── cloud-bridge/p2p/
│   ├── voice/
│   │   ├── voice-types.ts            # VoiceParticipant, VoiceRosterPayload, VoiceMessage
│   │   ├── voice-mixer.ts            # HostVoiceMixer — pure WebAudio graph bookkeeping
│   │   ├── voice-chat.svelte.ts      # VoiceChatService — host/guest lifecycle, runes state
│   │   ├── voice-mixer.test.ts
│   │   └── voice-chat.svelte.test.ts
│   ├── handlers/
│   │   ├── voice-handler.ts          # Host: VOICE_STATE, VOICE_SYNC_REQUEST
│   │   ├── guest-voice-handler.ts    # Guest: VOICE_ROSTER
│   │   └── *.test.ts
│   ├── p2p-protocol.ts               # P2PMessage union extended with VoiceMessage
│   ├── transport/                    # optional readonly rawPeer on both transport interfaces
│   ├── host-service.svelte.ts        # registers VoiceHandler; voiceChat.reset() on stopHosting
│   ├── guest-service.ts              # hostId/rawPeer getters; voiceChat.reset() on disconnect
│   └── connection-manager.svelte.ts  # rawPeer getter
├── components/vtt/VoiceChatControls.svelte  # header pill (both roles) + guest <audio> sink
├── components/layout/AppHeader.svelte       # mounts the pill in guest + host header branches
└── config/help-content.ts                   # feature hint
```

## Design notes & gotchas

- **`rawPeer` accessor**: media calls need the underlying PeerJS `Peer`,
  which both transports encapsulate. Exposed as an _optional readonly_
  member on the transport interfaces so test fakes and future transports
  are unaffected; the voice service treats `null` as "voice unavailable".
- **No circular imports**: `voice-chat.svelte.ts` imports only stores and
  voice modules. Handlers import the voice singleton; services import both.
  UI wires services to the voice service via small `VoiceHostAccess` /
  `VoiceGuestAccess` adapter objects.
- **Chrome WebAudio quirk**: a remote MediaStream yields silence in WebAudio
  unless also attached to a media element — the mixer keeps a muted `Audio`
  element per guest stream.
- **Cancellation races**: both `startHostVoice` and `joinVoice` re-check
  state after the `getUserMedia` await (permission prompt is modal and
  slow); a cancelled attempt stops the acquired tracks. Stale media-call
  `stream` events (guest rejoin replacement, abandoned join) are ignored by
  identity-checking the call object.
- **Mute** is `track.enabled = false` at the source (silence propagates
  through the mix); roster state is cosmetic and synced via `VOICE_STATE` /
  `VOICE_ROSTER`.

## Complexity Tracking

No constitution deviations requiring justification. Known accepted
trade-off: host bandwidth/CPU is the bottleneck (one encoded stream per
guest); acceptable within the 10-guest session cap.
