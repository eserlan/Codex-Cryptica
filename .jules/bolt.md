## 2024-05-18 - Avoid `.indexOf()` in Array Transformations in Svelte Reactive Blocks
**Learning:** In highly reactive Svelte blocks (e.g., `$derived.by`), using `.indexOf()` inside array transformation callbacks like `.map()` degrades performance to O(N²).
**Action:** Replace `.map().filter()` with an imperative `for` loop and use the loop index directly instead of calling `.indexOf()` on the parent array to achieve O(N) performance.
