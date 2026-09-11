## 2024-10-24 - Extracting Canvas Sub-Systems

**Learning:** Svelte 5 components mapping complex UI interactions (like `CanvasWorkspace.svelte`) frequently grow into god-files when they handle multiple distinct interaction domains (drawing, rotation, panning, connections). The `use-*` hook pattern with `$state` is the preferred way to extract and isolate these distinct responsibilities while preserving reactivity.

**Action:** When working with large Svelte 5 component files handling complex pointer/gesture state, extract distinct interaction domains into custom hooks (e.g., `use-canvas-node-rotation.svelte.ts`) rather than breaking the component down into poorly-encapsulated sub-components. Ensure you instantiate the hook *before* relying on it in `$derived` expressions in the main component to avoid TDZ/initialization errors.
