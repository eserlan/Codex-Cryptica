import type {
  AppEvent,
  AppEventDomain,
  AppEventForDomain,
  AppEventListener,
  AppEventOf,
  AppEventsOf,
  AppEventType,
  EventWildcard,
  RegisteredAppEvent,
  RuntimeAppEvent,
} from "./types";

export class AppEventBus {
  private globalListeners = new Set<AppEventListener<RuntimeAppEvent>>();
  private namedListeners = new Map<string, AppEventListener<RuntimeAppEvent>>();
  private domainListeners = new Map<
    string,
    Set<AppEventListener<RuntimeAppEvent>>
  >();
  private typeListeners = new Map<
    string,
    Set<AppEventListener<RuntimeAppEvent>>
  >();

  subscribe<Type extends AppEventType>(
    filter: Type,
    listener: AppEventListener<AppEventOf<Type>>,
    name?: string,
  ): () => void;
  subscribe<Type extends AppEventType>(
    filter: readonly Type[],
    listener: AppEventListener<AppEventsOf<Type>>,
    name?: string,
  ): () => void;
  subscribe<Domain extends AppEventDomain>(
    filter: `${Domain}:*` | `${Uppercase<Domain>}:*`,
    listener: AppEventListener<AppEventForDomain<Domain>>,
    name?: string,
  ): () => void;
  subscribe<Domain extends AppEventDomain>(
    filter: readonly (`${Domain}:*` | `${Uppercase<Domain>}:*`)[],
    listener: AppEventListener<AppEventForDomain<Domain>>,
    name?: string,
  ): () => void;
  subscribe(
    filter: "*",
    listener: AppEventListener<RegisteredAppEvent>,
    name?: string,
  ): () => void;
  subscribe(
    filter: readonly EventWildcard[],
    listener: AppEventListener<RegisteredAppEvent>,
    name?: string,
  ): () => void;
  subscribe(
    filter: any,
    listener: AppEventListener<any>,
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
    const registeredSets: Set<AppEventListener<RuntimeAppEvent>>[] = [];

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

  emit<Type extends AppEventType>(event: AppEventOf<Type>): void;
  emit(event: AppEvent): void;
  emit(event: RuntimeAppEvent): void;
  emit(event: RuntimeAppEvent): void {
    const domain = event.domain.toLowerCase();
    const type = event.type.toLowerCase();
    const targets = new Set<AppEventListener<RuntimeAppEvent>>();

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
    const namedListeners = new Set(this.namedListeners.values());

    for (const listener of Array.from(this.globalListeners)) {
      if (!namedListeners.has(listener)) {
        this.globalListeners.delete(listener);
      }
    }

    for (const [domain, listeners] of this.domainListeners) {
      for (const listener of Array.from(listeners)) {
        if (!namedListeners.has(listener)) {
          listeners.delete(listener);
        }
      }
      if (listeners.size === 0) {
        this.domainListeners.delete(domain);
      }
    }

    for (const [type, listeners] of this.typeListeners) {
      for (const listener of Array.from(listeners)) {
        if (!namedListeners.has(listener)) {
          listeners.delete(listener);
        }
      }
      if (listeners.size === 0) {
        this.typeListeners.delete(type);
      }
    }
    // Named listeners are intentionally preserved — they belong to long-lived
    // services (SearchService, CrossTabBroadcaster) that survive vault switches.
  }
}

export const appEventBus = new AppEventBus();
