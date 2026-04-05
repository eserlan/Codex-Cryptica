import { vaultEventBus } from "./events";

export interface MessengerDependencies {
  activeVaultId: () => string | null;
  loadFiles: () => Promise<void>;
  broadcastCallback: () => void;
}

export class VaultMessenger {
  private channel: BroadcastChannel | null = null;

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

      vaultEventBus.subscribe((event) => {
        if (event.type === "BATCH_CREATED" || event.type === "ENTITY_DELETED") {
          this.deps.broadcastCallback();
        }
      }, "vault-update-broadcaster");
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
    }
  }
}
