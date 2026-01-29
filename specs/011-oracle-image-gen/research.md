# Research: Oracle Image Generation

## Decision: Image Generation Provider
- **Choice**: Nano Banana (Google Gemini 2.5 Flash Image)
- **Rationale**: Optimal balance of speed and quality for world-building visuals. Directly accessible via the Generative Language API.
- **Implementation**: Use the Gemini 2.5 Flash Image endpoint. This model is optimized for fast rendering and high consistency, making it ideal for real-time creative workflows.

## Decision: Image Storage & Persistence
- **Choice**: Manual OPFS Storage (On-Archive)
- **Rationale**: Keeps the vault clean of unused/ephemeral visuals. Adheres to "Local-First" for permanent records while allowing ephemeral chat visuals.
- **Implementation**: 
    1. Receive image data as blob from API.
    2. Display in chat using a temporary `URL.createObjectURL(blob)`.
    3. ONLY when the user clicks "Save" or drops the image onto an entity:
        a. Write the blob to the `/images` directory in OPFS.
        b. Update the entity metadata with the resulting local path.

## Decision: Drag and Drop Interaction
- **Choice**: Standard HTML5 Drag and Drop API
- **Rationale**: Built-in browser support, highly performant, and intuitive for users.
- **Implementation**: 
    - Oracle Chat images will have `draggable="true"` and a `data-image-path` attribute.
    - `EntityDetailPanel` will have a drop zone that listens for `drop` events, extracts the path, and updates the active entity via `vault.updateEntity`.

## Decision: Performance Optimization (Thumbnails)
- **Choice**: Canvas-based 128px Thumbnails
- **Rationale**: Keeps the Knowledge Graph responsive even with many images. Cytoscape nodes load much faster with small thumbnails than full-resolution generated images.
- **Implementation**: Generated on-the-fly during the archive process and stored as a separate file.

## Decision: Visual Consistency (Style-Awareness)
- **Choice**: Invalidation-aware Style Caching
- **Rationale**: Automates "Art Style" grounding without the overhead of repeated full-vault searches.
- **Implementation**: Performs a semantic lookup for "art style" guides on first request and caches the result until the vault state changes.

## Alternatives Considered
- **OpenAI DALL-E 3**: Rejected due to additional API key requirements and fragmentation of AI providers.
- **Cloudinary/External CDN Storage**: Rejected as it violates the "Local-First" principle and requires internet access for visualization.
