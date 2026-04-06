export interface IVaultServices {
  search: {
    index(entry: any): Promise<void>;
    remove(id: string): Promise<void>;
    clear(): Promise<void>;
    search(query: string, options?: any): Promise<any[]>;
  };
  ai: {
    clearStyleCache(): void;
    expandQuery(apiKey: string, query: string, history: any[]): Promise<string>;
  };
}

export class ServiceRegistry {
  private _services: IVaultServices | null = null;

  async ensureInitialized(): Promise<IVaultServices> {
    if (this._services) return this._services;

    try {
      const { searchService } = await import("../../services/search");
      const aiModule = await import("../../services/ai");

      this._services = {
        search: searchService,
        ai: {
          clearStyleCache: () =>
            aiModule.contextRetrievalService.clearStyleCache(),
          expandQuery: (k, q, h) =>
            aiModule.textGenerationService.expandQuery(k, q, h),
        },
      };

      return this._services;
    } catch (err) {
      console.warn(
        "[ServiceRegistry] Failed to lazy-load services, operating in degraded mode",
        err,
      );
      // Return a minimal services object so features not requiring AI/search can proceed
      this._services = {
        search: {
          index: async () => {},
          remove: async () => {},
          clear: async () => {},
          search: async () => [],
        },
        ai: {
          clearStyleCache: () => {},
          expandQuery: async () => "",
        },
      };
      return this._services;
    }
  }

  get services(): IVaultServices | null {
    return this._services;
  }

  clear() {
    this._services = null;
  }
}
