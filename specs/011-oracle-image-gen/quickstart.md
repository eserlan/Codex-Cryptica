# Quickstart: Oracle Image Generation

## Implementation Checklist

1.  **AI Service**: Add `generateImage(prompt)` to `AIService` using the REST API for Imagen 3.
2.  **Vault Store**: Implement `saveImageToVault(blob, entityId)` to write to `/images/` in OPFS and update entity frontmatter.
3.  **Oracle Store**: Update `ask()` logic to detect "/draw" or visual intent and trigger `generateImage`.
4.  **UI - Chat**: Update `ChatMessage.svelte` to render images with `draggable="true"`.
5.  **UI - Detail**: Add a drop zone to `EntityDetailPanel.svelte` to accept images.
6.  **UI - Lightbox**: Ensure the existing lightbox works with local blob URLs.

## Sample Query
> "/draw a portrait of Eldrin as a wise old elf with stars in his robes"
