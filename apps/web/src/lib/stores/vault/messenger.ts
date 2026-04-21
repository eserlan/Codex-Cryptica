import { vaultEventBus } from "./events";

export interface MessengerDependencies {
  activeVaultId: () => string | null;
  loadFiles: () => Promise<void>;
  broadcastCallback: () => void;
}

export class VaultMessenger {
  private channel: BroadcastChannel | null = null;
  private unsubscribe: (() => void) | null = null;

  constructor(private deps: MessengerDependencies) {
    if (typeof window !== "undefined") {
      this.channel = new BroadcastChannel("codex-vault-sync");
      this.channel.onmessage = (event) => {
        if (
          event.data.type === "RELOAD_VAULT" &&
          event.data.vaultId === this.deps.activeVaultId()
        ) {
          this.deps.loadFiles();
        }
      };

      if (vaultEventBus) {
        this.unsubscribe = vaultEventBus.subscribe((event) => {
          if (
            event.type === "BATCH_CREATED" ||
            event.type === "ENTITY_DELETED"
          ) {
            this.deps.broadcastCallback();
          }
        }, "vault-update-broadcaster");
      } else {
        // Fallback for circular dependency during module init
        void import("./events").then(({ vaultEventBus: bus }) => {
          if (bus) {
            this.unsubscribe = bus.subscribe((event) => {
              if (
                event.type === "BATCH_CREATED" ||
                event.type === "ENTITY_DELETED"
              ) {
                this.deps.broadcastCallback();
              }
            }, "vault-update-broadcaster");
          }
        });
      }
    }
  }

  broadcastVaultUpdate() {
    const activeId = this.deps.activeVaultId();
    if (this.channel && activeId) {
      this.channel.postMessage({
        type: "RELOAD_VAULT",
        vaultId: activeId,
      });
    }
  }

  destroy() {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }
}
