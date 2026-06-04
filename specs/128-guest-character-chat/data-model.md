# Data Model: Guest Character Chat

This document defines the schema extensions and storage models for the Guest Character Chat feature.

## 1. Entity Schema Extensions (Frontmatter / Zod)

The character's guest-chat configuration is nested in the `Entity` schema inside `packages/schema/src/entity.ts` as an optional `guestChatConfig` field.

```typescript
export const GuestChatConfigSchema = z.object({
  isEnabled: z.boolean().default(false),
  contextScope: z.enum(["public", "hybrid"]).default("public"), // public-only vs public + private context
  extraInstructions: z.string().optional(), // auto-synced cache of "## Personality & Voice" from lore
  isHostReviewable: z.boolean().default(true),
  keepMemory: z.boolean().default(true), // persist conversation memory locally
});

export type GuestChatConfig = z.infer<typeof GuestChatConfigSchema>;
```

> **Note on `extraInstructions`**: this field is no longer a GM-editable textarea. Instead it is
> automatically populated on every host save by extracting the `## Personality & Voice` section
> from the character's private lore. Guests receive this field via P2P (they never see raw lore),
> so the executor uses it as a fallback when the full lore is not available on the guest side.
> The authoritative source of personality is always the `## Personality & Voice` lore section.

### Frontmatter Example (YAML)

For a Character entity markdown file, the host controls map to YAML frontmatter:

```yaml
---
title: "Mira the Innkeeper"
type: "character"
guestChatConfig:
  isEnabled: true
  contextScope: "hybrid"
  extraInstructions: "Speaks with a soft rustic drawl and likes to gossip." # auto-populated from lore
  isHostReviewable: true
  keepMemory: true
---
# Mira the Innkeeper
Public character description...

## Personality & Voice
- Soft rustic drawl, likes to gossip.

## Knowledge & Expertise
- Deep knowledge: inn regulars, local rumours, room availability.
- Broad knowledge: village roads, nearby farms and their owners.
- Knows nothing of: kingdom politics, magic, or events beyond the valley.
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
