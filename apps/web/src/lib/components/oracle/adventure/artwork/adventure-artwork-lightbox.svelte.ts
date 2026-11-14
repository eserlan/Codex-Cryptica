import { getContext, hasContext, setContext, untrack } from "svelte";

export interface AdventureLightboxItem {
  key: string;
  src: string;
  alt: string;
  title: string;
  subtitle?: string;
  loadFull?: (
    signal: AbortSignal,
  ) => Promise<{ url: string; release: () => void } | null>;
}

const LIGHTBOX_CONTEXT_KEY = Symbol("adventure-artwork-lightbox");

export class AdventureLightboxController {
  show = $state(false);
  activeIndex = $state(0);
  private registered = $state<
    Array<{ id: symbol; item: AdventureLightboxItem }>
  >([]);

  readonly items = $derived.by(() => {
    const seen = new Set<string>();
    const unique: AdventureLightboxItem[] = [];
    for (const entry of this.registered) {
      const dedupKey = entry.item.alt || entry.item.src || entry.item.key;
      if (seen.has(dedupKey)) continue;
      seen.add(dedupKey);
      unique.push(entry.item);
    }
    return unique;
  });

  readonly current = $derived(this.items[this.activeIndex] ?? null);

  register(item: AdventureLightboxItem): () => void {
    const id = Symbol("lightbox-item");
    untrack(() => {
      this.registered = [...this.registered, { id, item }];
    });
    return () => {
      untrack(() => {
        this.registered = this.registered.filter((entry) => entry.id !== id);
        if (this.activeIndex >= this.items.length) {
          this.activeIndex = Math.max(0, this.items.length - 1);
        }
        if (this.items.length === 0) {
          this.show = false;
        }
      });
    };
  }

  open(item: AdventureLightboxItem): void {
    const targetKey = item.alt || item.src || item.key;
    let idx = this.items.findIndex(
      (existing) =>
        (existing.alt || existing.src || existing.key) === targetKey,
    );
    if (idx === -1) {
      this.registered = [
        ...this.registered,
        { id: Symbol("lightbox-opened"), item },
      ];
      idx = this.items.findIndex(
        (existing) =>
          (existing.alt || existing.src || existing.key) === targetKey,
      );
    }
    this.activeIndex = Math.max(0, idx);
    this.show = true;
  }

  next(): void {
    if (this.items.length <= 1) return;
    this.activeIndex = (this.activeIndex + 1) % this.items.length;
  }

  prev(): void {
    if (this.items.length <= 1) return;
    this.activeIndex =
      (this.activeIndex - 1 + this.items.length) % this.items.length;
  }

  close(): void {
    this.show = false;
  }
}

export function setAdventureLightbox(
  controller: AdventureLightboxController,
): AdventureLightboxController {
  return setContext(LIGHTBOX_CONTEXT_KEY, controller);
}

export function getAdventureLightbox():
  AdventureLightboxController | undefined {
  if (!hasContext(LIGHTBOX_CONTEXT_KEY)) return undefined;
  return getContext<AdventureLightboxController>(LIGHTBOX_CONTEXT_KEY);
}
