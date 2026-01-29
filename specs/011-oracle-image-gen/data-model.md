# Data Model: Oracle Image Generation

## Updated Entities

### `ChatMessage` (Update)
- **`id`**: string (uuid)
- **`role`**: "user" | "assistant" | "system"
- **`content`**: string (Markdown)
- **`type`** (New): "text" | "image"
- **`imageUrl`** (New): string (optional, temporary `blob:` URL for chat, or local path if archived)
- **`entityId`**: string (optional, context linkage)

### `Entity` (Update)
- **`image`**: string (optional, local path to persisted visual in `/images/`)

## New Storage Artifacts

### `Vault Images` (New - Created on Archive)
- **Location**: `/images/` directory in the user's local vault.
- **Naming Convention**: `{entity-id}-{timestamp}-{hash}.png`
- **Format**: PNG or WEBP (lossless or high-quality lossy)
