export type ArtworkBackupConsent =
  | { enabled: true; remoteRemovalPending: false }
  | { enabled: false; remoteRemovalPending: false }
  | { enabled: false; remoteRemovalPending: true; removalId: string };

interface Dependencies {
  read(vaultId: string): Promise<unknown>;
  write(vaultId: string, state: ArtworkBackupConsent): Promise<void>;
  requireFullPush(vaultId: string): Promise<void>;
  /** Shared with backup build, upload and consent changes for this Vault. */
  lock<T>(key: string, action: () => Promise<T>): Promise<T>;
  newRemovalId(): string;
}

const off: ArtworkBackupConsent = {
  enabled: false,
  remoteRemovalPending: false,
};

const REMOVAL_ID_RE = /^[a-zA-Z0-9_-]{1,160}$/;

function isValidRemovalId(value: unknown): value is string {
  return typeof value === "string" && REMOVAL_ID_RE.test(value);
}

function isConsentRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseSteadyConsent(
  state: Record<string, unknown>,
): ArtworkBackupConsent | null {
  if (state.remoteRemovalPending !== false) return null;
  if (state.enabled === true) {
    return { enabled: true, remoteRemovalPending: false };
  }
  return state.enabled === false ? { ...off } : null;
}

function parsePendingRemovalConsent(
  state: Record<string, unknown>,
): ArtworkBackupConsent | null {
  if (state.enabled !== false || state.remoteRemovalPending !== true) {
    return null;
  }
  if (!isValidRemovalId(state.removalId)) return null;
  return {
    enabled: false,
    remoteRemovalPending: true,
    removalId: state.removalId,
  };
}

/** Owns expanded consent only; ordinary backup consent remains independent. */
export class CloudBackupArtworkConsent {
  constructor(private readonly deps: Dependencies) {}
  async read(vaultId: string): Promise<ArtworkBackupConsent> {
    const raw = await this.deps.read(vaultId);
    if (raw == null) return { ...off };
    if (!isConsentRecord(raw)) {
      throw new Error("Invalid adventure backup consent");
    }
    const parsed = parseSteadyConsent(raw) ?? parsePendingRemovalConsent(raw);
    if (!parsed) throw new Error("Invalid adventure backup consent");
    return parsed;
  }
  async enable(vaultId: string, confirmed: boolean): Promise<boolean> {
    if (!confirmed) return false;
    try {
      return await this.deps.lock(
        `cloud-backup-artwork:${vaultId}`,
        async () => {
          const state = await this.read(vaultId);
          if (state.remoteRemovalPending) return false;
          if (state.enabled) return true;
          await this.deps.requireFullPush(vaultId);
          await this.deps.write(vaultId, {
            enabled: true,
            remoteRemovalPending: false,
          });
          return true;
        },
      );
    } catch {
      return false;
    }
  }
  async disable(vaultId: string): Promise<boolean> {
    try {
      return await this.deps.lock(
        `cloud-backup-artwork:${vaultId}`,
        async () => {
          const state = await this.read(vaultId);
          if (!state.enabled && !state.remoteRemovalPending) return true;
          if (state.enabled) {
            const removalId = this.deps.newRemovalId();
            if (!/^[a-zA-Z0-9_-]{1,160}$/.test(removalId))
              throw new Error("Invalid removal ID");
            await this.deps.write(vaultId, {
              enabled: false,
              remoteRemovalPending: true,
              removalId,
            });
          }
          await this.deps.requireFullPush(vaultId);
          return true;
        },
      );
    } catch {
      return false;
    }
  }
  retryRemoval(vaultId: string): Promise<boolean> {
    return this.disable(vaultId);
  }
  async confirmRemoval(vaultId: string, removalId: string): Promise<boolean> {
    try {
      return await this.deps.lock(
        `cloud-backup-artwork:${vaultId}`,
        async () => {
          const state = await this.read(vaultId);
          if (!state.remoteRemovalPending || state.removalId !== removalId)
            return false;
          await this.deps.write(vaultId, { ...off });
          return true;
        },
      );
    } catch {
      return false;
    }
  }
}
