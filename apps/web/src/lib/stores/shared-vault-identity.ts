import {
  browserStorage,
  systemIdGenerator,
  type StorageLike,
} from "#lib/utils/runtime-deps.js";

const KEY = "codex-shared-vault-identity";
const DEVICE_ID = /^[A-Za-z0-9_-]{8,128}$/;

interface Identity {
  deviceId?: string;
  displayName?: string;
}

/**
 * Who this device is in a shared vault: a random device id the worker counts
 * against its device cap, and the name shown on conflict copies. Neither is a
 * secret and the key never holds a token. The id is made on the first join,
 * never earlier, and is never rotated.
 */
export class SharedVaultIdentity {
  constructor(
    private storage: StorageLike = browserStorage,
    private newId: () => string = systemIdGenerator.uuid,
  ) {}

  private read(): Identity {
    try {
      const raw = this.storage.getItem(KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }

  private write(identity: Identity): void {
    this.storage.setItem(KEY, JSON.stringify(identity));
  }

  deviceId(): string {
    const identity = this.read();
    if (identity.deviceId && DEVICE_ID.test(identity.deviceId)) {
      return identity.deviceId;
    }
    const deviceId = this.newId();
    this.write({ ...identity, deviceId });
    return deviceId;
  }

  displayName(): string | undefined {
    const name = this.read().displayName;
    return typeof name === "string" && name ? name : undefined;
  }

  setDisplayName(name: string): void {
    this.write({ ...this.read(), displayName: name });
  }
}

export const sharedVaultIdentity = new SharedVaultIdentity();
