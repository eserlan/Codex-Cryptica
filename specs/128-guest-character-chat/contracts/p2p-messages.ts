// P2P Message Contract for Guest Character Chat
// Added to the P2P message protocol definition

export interface GuestChatTranscriptSyncMessage {
  type: "GUEST_CHAT_TRANSCRIPT_SYNC";
  payload: {
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
