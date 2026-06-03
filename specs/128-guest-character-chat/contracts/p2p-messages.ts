// P2P Message Contract for Guest Character Chat
// Added to the P2P message protocol definition

export interface GuestChatTranscriptSyncMessage {
  type: "GUEST_CHAT_TRANSCRIPT_SYNC";
  payload: {
    id: string;
    guestId: string;
    guestName: string;
    characterId: string;
    characterTitle: string;
    // Sent incrementally or as full history updates
    messages: Array<{
      id: string;
      role: "user" | "assistant";
      content: string;
      timestamp: number;
    }>;
    lastUpdated: number;
  };
}

// ── Host-Routed Character Chat ────────────────────────────────────────────────
//
// Guest character chat runs on the HOST (GM's machine) rather than locally on
// the guest, so the executor has access to the full private vault and lore.
// The guest sends a request, the host streams chunks back, then signals done.

/** Guest → Host: initiate an in-character chat turn */
export interface GuestCharChatRequestMessage {
  type: "GUEST_CHAR_CHAT_REQUEST";
  requestId: string; // UUID; matches CHUNK/DONE responses
  characterId: string; // entity ID of the NPC being chatted with
  guestUsername: string; // guest's login name (used to resolve their PC)
  query: string; // the message the guest sent
  history: Array<{
    id: string;
    role: string;
    content: string;
  }>; // conversation history snapshot at time of request
}

/** Host → Guest: streaming partial response chunk */
export interface GuestCharChatChunkMessage {
  type: "GUEST_CHAR_CHAT_CHUNK";
  requestId: string;
  partial: string; // accumulated response text so far (not a delta)
}

/** Host → Guest: signals completion (or failure) of a chat turn */
export interface GuestCharChatDoneMessage {
  type: "GUEST_CHAR_CHAT_DONE";
  requestId: string;
  error?: string; // present only when execution failed
}
