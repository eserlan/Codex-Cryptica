## 2024-05-18 - Replacing Object.values in reactive blocks
 **Learning:** Replacing `Object.values(vault.entities)` with `vault.allEntities` in `$derived` blocks avoids recreating large arrays on every reactive update, significantly reducing memory allocations and garbage collection overhead.
 **Action:** Always look for `Object.values(vault.entities)` inside `$derived` blocks or hot loops and replace it with the pre-cached `vault.allEntities` array, ensuring corresponding `.test.ts` files are updated to mock `allEntities`.
