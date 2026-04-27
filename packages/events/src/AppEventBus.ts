import type { AppEvent, AppEventListener } from "./types";

export class AppEventBus {
  private globalListeners = new Set<AppEventListener>();
  private namedListeners = new Map<string, AppEventListener>();
  private domainListeners = new Map<string, Set<AppEventListener>>();
  private typeListeners = new Map<string, Set<AppEventListener>>();

  subscribe(
    filter: string | string[],
    listener: AppEventListener,
    name?: string,
  ): () => void {
    if (name && this.namedListeners.has(name)) {
      const oldListener = this.namedListeners.get(name)!;
      this.namedListeners.delete(name);
      this.globalListeners.delete(oldListener);
      for (const set of this.domainListeners.values()) set.delete(oldListener);
      for (const set of this.typeListeners.values()) set.delete(oldListener);
    }

    const filters = (Array.isArray(filter) ? filter : [filter]).map((f) =>
      f.toLowerCase(),
    );
    const registeredSets: Set<AppEventListener>[] = [];

    for (const f of filters) {
      if (f === "*") {
        this.globalListeners.add(listener);
        registeredSets.push(this.globalListeners);
      } else if (f.endsWith(":*")) {
        const domain = f.split(":")[0];
        if (!this.domainListeners.has(domain)) {
          this.domainListeners.set(domain, new Set());
        }
        const set = this.domainListeners.get(domain)!;
        set.add(listener);
        registeredSets.push(set);
      } else {
        if (!this.typeListeners.has(f)) {
          this.typeListeners.set(f, new Set());
        }
        const set = this.typeListeners.get(f)!;
        set.add(listener);
        registeredSets.push(set);
      }
    }

    if (name) {
      this.namedListeners.set(name, listener);
    }

    return () => {
      for (const set of registeredSets) {
        set.delete(listener);
      }
      if (name && this.namedListeners.get(name) === listener) {
        this.namedListeners.delete(name);
      }
    };
  }

  emit(event: AppEvent): void {
    const domain = event.domain.toLowerCase();
    const type = event.type.toLowerCase();
    const targets = new Set<AppEventListener>();

    // 1. Global listeners
    for (const l of this.globalListeners) targets.add(l);

    // 2. Domain listeners
    const domainTargets = this.domainListeners.get(domain);
    if (domainTargets) {
      for (const l of domainTargets) targets.add(l);
    }

    // 3. Specific type listeners
    const typeTargets = this.typeListeners.get(type);
    if (typeTargets) {
      for (const l of typeTargets) targets.add(l);
    }

    // Synchronous execution
    for (const listener of targets) {
      try {
        const result = listener(event);
        if (result instanceof Promise) {
          result.catch((err) =>
            console.error(
              `[AppEventBus] Async listener error for ${event.type}:`,
              err,
            ),
          );
        }
      } catch (err) {
        console.error(`[AppEventBus] Listener error for ${event.type}:`, err);
      }
    }
  }

  reset(): void {
    this.globalListeners.clear();
    this.domainListeners.clear();
    this.typeListeners.clear();
    // Named listeners are intentionally preserved — they belong to long-lived
    // services (SearchService, CrossTabBroadcaster) that survive vault switches.
  }
}

export const appEventBus = new AppEventBus();
