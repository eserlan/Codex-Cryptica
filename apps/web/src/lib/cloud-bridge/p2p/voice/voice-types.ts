/** A single participant in the live voice channel. */
export interface VoiceParticipant {
  peerId: string;
  displayName: string;
  muted: boolean;
  isHost: boolean;
}

/** Host-broadcast summary of the voice channel state. */
export interface VoiceRosterPayload {
  /** Whether the host currently has a voice channel open. */
  active: boolean;
  participants: VoiceParticipant[];
}

/** Data-channel messages used to coordinate the voice channel. */
export type VoiceMessage =
  | { type: "VOICE_SYNC_REQUEST" }
  | { type: "VOICE_STATE"; payload: { muted: boolean } }
  | { type: "VOICE_ROSTER"; payload: VoiceRosterPayload };
