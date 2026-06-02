# Data Model: Guest Character Chat

This document defines the schema extensions and storage models for the Guest Character Chat feature.

## 1. Entity Schema Extensions (Frontmatter / Zod)

The character's guest-chat configuration is nested in the `Entity` schema inside `packages/schema/src/entity.ts` as an optional `guestChatConfig` field.

```typescript
export const GuestChatConfigSchema = z.object({
  isEnabled: z.boolean().default(false),
  contextScope: z.enum(["public", "hybrid"]).default("public"), // public-only vs public + private context
  extraInstructions: z.string().optional(), // GM character voice customization
  isHostReviewable: z.boolean().default(true),
  keepMemory: z.boolean().default(true), // persist conversation memory locally
});

export type GuestChatConfig = z.infer<typeof GuestChatConfigSchema>;
```

### Frontmatter Example (YAML)

For a Character entity markdown file, the host controls map to YAML frontmatter:

```yaml
---
title: "Mira the Innkeeper"
type: "character"
guestChatConfig:
  isEnabled: true
  contextScope: "hybrid"
  extraInstructions: "Speaks with a soft rustic drawl and likes to gossip."
  isHostReviewable: true
  keepMemory: true
---
# Mira the Innkeeper
Public character description...
```

## 2. Transcript Schema

Transcripts are stored locally on the host's machine inside the vault structure as JSON files, and locally on the guest's device in IndexedDB.

### JSON Serialization Format (`GuestChatTranscript`)

```typescript
export const GuestChatMessageSchema = z.object({
  id: z.string(), // UUID
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  timestamp: z.number(), // Unix timestamp ms
});

export const GuestChatTranscriptSchema = z.object({
  id: z.string(), // UUID matching guestId + characterId
  guestId: z.string(), // unique guest device/connection ID
  guestName: z.string(), // guest display name
  characterId: z.string(), // UUID of the character
  characterTitle: z.string(), // character name for ease of viewing
  messages: z.array(GuestChatMessageSchema),
  lastUpdated: z.number(),
});

export type GuestChatMessage = z.infer<typeof GuestChatMessageSchema>;
export type GuestChatTranscript = z.infer<typeof GuestChatTranscriptSchema>;
```

## 3. Storage Hierarchy

- **Host Vault File Storage**:
  - Path: `{vault-root}/.codex/transcripts/{guestId}_{characterId}.json`
  - This file is synced like any other file inside the vault, but hosts/GMs only read it via the management dashboard.
- **Guest Browser Storage (IndexedDB)**:
  - Table name: `guest_chat_transcripts`
  - Keys: `id` (combination of `guestId + "_" + characterId`)
  - Stores the local conversation history for the guest so they can retrieve it on page refresh.
