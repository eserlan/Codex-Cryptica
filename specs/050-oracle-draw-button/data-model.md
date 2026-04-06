# Data Model: Advanced Oracle Draw Button

## Entities

### ChatMessage (Updated)

**Updated Fields**:

- `isDrawing`: (Boolean) Indicates if this message is currently triggering an image generation.
- `hasDrawAction`: (Boolean) Whether this message provides a "Draw" button.

### OracleStore (Updated)

**New Methods**:

- `drawEntity(entityId: string)`: Triggers generation for an existing vault entity.
- `drawMessage(messageId: string)`: Triggers generation using a chat message as context.

### Vault Entity (Existing)

**Fields impacted**:

- `image`: Path to the generated image in the vault.
- `thumbnail`: Path to the generated thumbnail.

## State Transitions

### Image Generation Lifecycle (Entity)

1. **Trigger**: User clicks "Draw" in Sidepanel/Zen mode.
2. **Retrieval**: System fetches lore + global art style.
3. **Generation**: `AIService` calls Gemini Imagen.
4. **Persist**: `VaultStore` saves image to OPFS and updates entity metadata.
5. **UI Update**: Sidepanel/Zen mode reactively shows the new image.

### Image Generation Lifecycle (Chat)

1. **Trigger**: User clicks "Draw" on an assistant message.
2. **Context**: System uses message text + global art style.
3. **Generation**: `AIService` calls Gemini Imagen.
4. **UI Update**: Message displays the image inline.
