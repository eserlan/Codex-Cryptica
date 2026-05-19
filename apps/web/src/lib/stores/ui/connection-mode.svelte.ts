import type { UIPersistence } from "./persistence";
import {
  UIPersistence as DefaultPersistence,
  UI_STORAGE_KEYS,
} from "./persistence";

export class ConnectionModeStore {
  private persistence: UIPersistence;

  isModifierPressed = $state(false);
  isConnecting = $state(false);
  connectingNodeId = $state<string | null>(null);
  lastConnectionLabel = $state("");
  recentConnectionLabels = $state<string[]>([]);
  showSelectionConnector = $state(false);

  private _abortController: AbortController | null = null;

  constructor(persistence: UIPersistence = new DefaultPersistence()) {
    this.persistence = persistence;
    this.loadFromPersistence();
  }

  private loadFromPersistence() {
    this.lastConnectionLabel = this.persistence.read(
      UI_STORAGE_KEYS.LAST_CONNECTION_LABEL,
      (v) => v,
      "",
    );
    this.recentConnectionLabels = this.persistence.read(
      UI_STORAGE_KEYS.RECENT_CONNECTION_LABELS,
      (v) => {
        const parsed = JSON.parse(v);
        if (
          Array.isArray(parsed) &&
          parsed.every((item) => typeof item === "string")
        ) {
          return parsed;
        }
        throw new Error("Invalid recent connection labels");
      },
      [],
    );
  }

  get abortSignal(): AbortSignal {
    if (!this._abortController || this._abortController.signal.aborted) {
      this._abortController = new AbortController();
    }
    return this._abortController.signal;
  }

  toggleConnectMode() {
    this.isConnecting = !this.isConnecting;
    if (!this.isConnecting) {
      this.connectingNodeId = null;
    }
  }

  startSelectionConnection() {
    this.showSelectionConnector = true;
  }

  setLastConnectionLabel(label: string) {
    this.lastConnectionLabel = label;
    this.persistence.write(
      UI_STORAGE_KEYS.LAST_CONNECTION_LABEL,
      label,
      String,
    );

    const updated: string[] = [label];
    for (const recentLabel of this.recentConnectionLabels) {
      if (recentLabel !== label) {
        updated.push(recentLabel);
        if (updated.length === 5) break;
      }
    }
    this.recentConnectionLabels = updated;
    this.persistence.write(UI_STORAGE_KEYS.RECENT_CONNECTION_LABELS, updated);
  }

  abortActiveOperations() {
    if (this._abortController) {
      this._abortController.abort();
      this._abortController = null;
    }
  }
}

const KEY = "__codex_connection_mode_store__";
export const connectionModeStore: ConnectionModeStore =
  (globalThis as any)[KEY] ??
  ((globalThis as any)[KEY] = new ConnectionModeStore());
