# Quickstart: UI Store Decoupling

## Overview

This refactor decomposes `UIStore` into eight focused stores under `apps/web/src/lib/stores/ui/`, with a temporary delegating facade so consumers can be migrated incrementally. Persistence is centralized in `UIPersistence`, which is injectable for tests.

## Key Files

- `apps/web/src/lib/stores/ui.svelte.ts` — during migration: thin facade delegating to the new stores. **Deleted at end of Phase 8.**
- `apps/web/src/lib/stores/ui/persistence.ts` — typed `localStorage` helper, injectable for tests.
- `apps/web/src/lib/stores/ui/notification.svelte.ts` — toasts, global error, confirm dialog.
- `apps/web/src/lib/stores/ui/layout-ui.svelte.ts` — sidebars, widths, mobile detection.
- `apps/web/src/lib/stores/ui/modal-ui.svelte.ts` — every dialog and modal.
- (plus the remaining 4 stores listed in `data-model.md`)

## How to add a new piece of UI state

1. **Pick the right store** based on the concern (layout, modal, notification, etc.). If your state doesn't fit any existing store, that's a signal — either it belongs in a feature module outside `stores/ui/`, or you've found a genuine new slice (rare; flag in PR).
2. **Add the `$state` field** + any methods to that store.
3. **Persist (if needed)** by calling `UIPersistence.write(...)` with a new key prefixed `codex_*`. Add the key to `data-model.md`.
4. **Write a unit test** for the new field/method using an in-memory persistence:
   ```ts
   const persistence = new UIPersistence({ storage: new InMemoryStorage() });
   const store = new ModalUIStore(persistence);
   ```
5. **No facade edits needed** — facade is auto-generated from the union of store APIs (or hand-rolled; see Phase 1 setup).

## Testing a store in isolation

```ts
import { NotificationStore } from "./notification.svelte";
import { UIPersistence } from "./persistence";

const store = new NotificationStore();
store.notify("hello");
expect(store.notification?.message).toBe("hello");
```

For stores that persist:

```ts
import { LayoutUIStore } from "./layout-ui.svelte";
import { UIPersistence } from "./persistence";

const storage = new Map<string, string>();
const persistence = new UIPersistence({
  storage: {
    getItem: (k) => storage.get(k) ?? null,
    setItem: (k, v) => storage.set(k, v),
    removeItem: (k) => storage.delete(k),
  },
});
const store = new LayoutUIStore(persistence);

store.setLeftSidebarWidth(320);
expect(storage.get("codex_left_sidebar_width")).toBe("320");
```

## Migrating a consumer (after Phase 8 codemod)

Before:

```ts
import { uiStore } from "$lib/stores/ui.svelte";
uiStore.notify("Saved");
uiStore.setLeftSidebarWidth(320);
```

After:

```ts
import { notificationStore } from "$lib/stores/ui/notification.svelte";
import { layoutUIStore } from "$lib/stores/ui/layout-ui.svelte";

notificationStore.notify("Saved");
layoutUIStore.setLeftSidebarWidth(320);
```

The codemod handles this mechanically — manual migration only needed for genuinely cross-cutting usages (rare).

## DevTools

Until Phase 8, `window.uiStore` continues to exist. After Phase 8, debug access is via:

```js
window.codexUI.layout; // LayoutUIStore
window.codexUI.modal; // ModalUIStore
window.codexUI.notification; // NotificationStore
// …
```
