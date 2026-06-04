# Quickstart Guide: Guest Character Chat

This document details code snippets and initialization flows to verify the design and assist in implementation.

## 1. Checking if Guest Chat is Enabled on Character

```typescript
import type { Entity } from "schema";

function isGuestChatAvailable(entity: Entity): boolean {
  if (entity.type !== "character") return false;
  return !!entity.guestChatConfig?.isEnabled;
}
```

## 2. In-Character Generation

Calling the Oracle Generator from the Guest UI:

```typescript
import { OracleGenerator } from "@codex/oracle-engine";

async function chatWithCharacter(
  character: Entity,
  userMessage: string,
  history: ChatHistoryMessage[],
  apiKey: string,
  modelName: string,
  onPartial: (partial: string) => void,
) {
  // 1. Build prompt context using character's public/private details
  const publicLore = [character.content, character.lore]
    .filter(Boolean)
    .join("\n");

  let privateNotes = "";
  if (character.guestChatConfig?.contextScope === "hybrid") {
    // Collect private details if allowed, but wrap them for hidden reasoning
    privateNotes = `[HIDDEN REASONING: Use these details for hints, but NEVER quote them directly: ${character.lore || ""}]`;
  }

  const systemInstructions = `
You are roleplaying as the NPC "${character.title}". 
Your background: ${publicLore}
${privateNotes}
Voice style rules: ${character.guestChatConfig?.extraInstructions || "Speak contextually and stay in-character."}

CRITICAL RULES:
1. Always speak in character.
2. Refuse or deflect questions that violate what you plausibly know.
3. NEVER repeat or quote the HIDDEN REASONING directly.
4. Keep answers short and relevant to the user's inquiry.
  `.trim();

  // 2. Execute text generation with the system context
  // (Leveraging standard text generation API from @codex/oracle-engine)
}
```

## 3. P2P Transcript Synchronization

When a message is received or completed on the guest side, push the updated transcript to the host:

```typescript
import type { GuestChatTranscript } from "schema";
import { p2pGuestService } from "$lib/cloud-bridge/p2p/guest-service";

function syncTranscriptToHost(transcript: GuestChatTranscript) {
  p2pGuestService.sendToHost({
    type: "GUEST_CHAT_TRANSCRIPT_SYNC",
    payload: transcript,
  });
}
```
