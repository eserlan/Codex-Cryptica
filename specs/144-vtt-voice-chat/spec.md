# Feature Specification: Voice Chat for Live VTT Sessions

**Feature Branch**: `feat/vtt-voice-chat`
**Created**: 2026-07-19
**Status**: Implemented (retroactive specification — PR #1755, issue #1757)
**Input**: User description: "Best-effort implementation of a voice mode in VTT mode"

> This spec was written retroactively to document the feature as shipped.
> Prior feasibility work: `specs/p2p_audio_video_analysis.md`.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Talk during a live session (Priority: P1)

A Game Master hosting a live P2P session opens a voice channel from the app
header. Connected players join the channel from their own header and everyone
can hear everyone — GM and all players — without leaving the app or setting up
a third-party voice tool.

**Why this priority**: This is the feature. A session where participants can
speak and be heard is the minimum viable voice mode.

**Independent Test**: Host a session in one browser, join it as a guest from a
second browser, start voice on the host, join voice on the guest, and speak in
both directions.

**Acceptance Scenarios**:

1. **Given** an active hosted session, **When** the GM presses the Voice
   button, **Then** the browser requests microphone permission and, once
   granted, the voice channel opens and guests are notified it is available.
2. **Given** an open voice channel, **When** a connected guest presses Join
   Voice, **Then** after granting microphone permission the guest hears the
   GM and all other joined guests, and they hear the guest.
3. **Given** the GM has not started voice, **When** a guest looks at the
   header, **Then** the Join Voice control is disabled with an explanation.
4. **Given** a guest is in the channel, **When** the GM ends voice, **Then**
   the guest's voice session ends cleanly and their microphone is released.

---

### User Story 2 - Mute yourself (Priority: P2)

Any participant (GM or player) can mute and unmute their own microphone, and
the change is visible to everyone in the channel.

**Why this priority**: Table noise management is essential for a usable group
call, but the channel is functional without it.

**Independent Test**: With two participants in voice, toggle mute on one and
verify silence plus the roster indicator updating on the other.

**Acceptance Scenarios**:

1. **Given** a participant in the channel, **When** they press the mute
   button, **Then** their microphone track is disabled locally (no audio
   reaches other participants) and the roster shows them as muted.
2. **Given** a muted participant, **When** they press unmute, **Then** audio
   flows again and the roster updates.

---

### User Story 3 - See who is in the channel (Priority: P3)

Participants can see who is currently connected to voice and each person's
mute state, including participants who joined before them.

**Why this priority**: Awareness/trust feature ("who can hear me?") layered on
top of the working channel.

**Acceptance Scenarios**:

1. **Given** an open channel with participants, **When** anyone hovers the
   voice pill, **Then** a list shows every participant's display name (guests
   by their session display name, the host as "Game Master") and mute state.
2. **Given** a guest joins the session after voice was started, **When**
   their client requests a roster sync, **Then** they learn the channel is
   active and can join.

---

### Edge Cases

- **Mic permission denied / no mic**: the control shows a friendly error
  ("Microphone permission was denied…", "No microphone was found…"); no
  channel state is corrupted and the user can retry.
- **Cancellation during the permission prompt**: pressing End/Leave while the
  browser permission dialog is open aborts the attempt; if permission is
  granted afterwards, the acquired tracks are stopped immediately.
- **Host never answers a guest call**: the guest attempt times out (15 s)
  with an error instead of hanging.
- **Guest rejoin**: a new call from the same peer replaces the previous one;
  late events from the stale call are ignored.
- **Session teardown**: stopping hosting or disconnecting as a guest tears
  down voice (calls closed, microphone released, roster cleared).
- **Guest browsing a published world (no live session)**: voice controls are
  not shown — voice requires a live P2P session.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: A hosting GM MUST be able to open and close a voice channel
  scoped to the current live session.
- **FR-002**: A connected guest MUST be able to join and leave an open voice
  channel, and MUST NOT be offered a join action while no channel is open.
- **FR-003**: All channel participants MUST hear every other participant
  (full-group audio), with no participant hearing their own audio echoed
  back.
- **FR-004**: Every participant MUST be able to mute/unmute their own
  microphone; mute state MUST propagate to all participants' rosters.
- **FR-005**: The channel roster (participants + mute state + active flag)
  MUST be available to all session members, including late joiners on
  request.
- **FR-006**: Microphone access MUST be requested only on explicit user
  action, and released whenever the participant leaves the channel or the
  session ends.
- **FR-007**: Voice MUST reuse the existing P2P session infrastructure (no
  additional servers or accounts).
- **FR-008**: All failure modes (permission denied, no device, unreachable
  host, timeout) MUST surface clear, non-technical error messages.

### Key Entities

- **VoiceParticipant**: `peerId`, `displayName`, `muted`, `isHost` — one row
  in the channel roster.
- **VoiceRosterPayload**: `active` flag + participant list; the host is the
  single source of truth and broadcasts it on every change.
- **Voice coordination messages** (data channel): `VOICE_SYNC_REQUEST`
  (guest → host), `VOICE_STATE` (guest → host mute update), `VOICE_ROSTER`
  (host → all).

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A GM and up to 10 guests (existing session cap) can hold a
  group conversation without any third-party tool or server.
- **SC-002**: Joining voice takes one click plus the browser permission
  prompt; no configuration screens.
- **SC-003**: Leaving/ending voice releases the microphone (browser mic
  indicator turns off) in 100% of teardown paths.
- **SC-004**: Participants joining or leaving does not interrupt audio
  between the remaining participants (no renegotiation of existing calls).
