## 2024-06-27 - Extract static data from large components

**Learning:** Large Svelte component files (like `SEOGeneratorLayout.svelte` or `DetailStatusTab.svelte`) often contain large blocks of static configuration arrays or `Set`s that clutter the `<script>` block and make the component's actual logic harder to read.
**Action:** When acting as Curator, look for large arrays or configuration objects declared statically inside component `<script>` tags and move them to a dedicated `constants/` directory alongside the component. This reduces the component's line count, improves readability, and safely separates static data from reactive state.
