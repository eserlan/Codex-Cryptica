---
id: performance-optimization
title: Performance Optimization
tags: [technical, scaling, performance]
rank: 12
---

## Scaling Your Archives

Codex Cryptica is designed to handle massive world-building projects. To keep your experience smooth even with thousands of entities, we employ several advanced background technologies.

### The Background Engine (Web Workers)

The app uses "Web Workers" to offload heavy computations from the main interface thread. This prevents the UI from stuttering during:

- **Search Indexing**: Your vault is indexed in the background.
- **Graph Layouts**: Complex relationship maps are calculated off-thread.
- **Markdown Parsing**: Large chronicles are parsed efficiently in parallel.

### Data Sovereignty & Performance

By processing everything in your browser using local workers, we ensure:

1. **Privacy**: Your data never leaves your device for processing.
2. **Responsiveness**: The UI remains at 60fps even during complex operations.
3. **Efficiency**: We use "Transferables" to move data between threads without the overhead of copying.

### Tips for Large Vaults

- **Use Keywords**: Add specific tags to your entities to help the search engine filter results faster.
- **Granular Chronicles**: While the system can handle large files, breaking your lore into smaller, linked entities improves graph readability and AI grounding.
