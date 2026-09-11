import { entityDb } from "$lib/utils/entity-db";
import {
  systemClock,
  systemIdGenerator,
  type Clock,
  type IdGenerator,
} from "$lib/utils/runtime-deps";

export interface AdventureLeaseKey {
  vaultId: string;
  sessionId: string;
}

export interface AdventureControlLease extends AdventureLeaseKey {
  ownerId: string;
  fencingToken: number;
  expiresAt: number;
}

export type LeaseResult =
  | { ok: true; lease: AdventureControlLease }
  | { ok: false; reason: "held" | "stale" };

const EXPIRY_MS = 10_000;

export class AdventureControlAuthority {
  constructor(
    private readonly db = entityDb,
    private readonly clock: Clock = systemClock,
    private readonly idGenerator: IdGenerator = systemIdGenerator,
  ) {}

  private key(key: AdventureLeaseKey): string {
    return `adventure-control:${key.vaultId}:${key.sessionId}`;
  }

  async acquire(key: AdventureLeaseKey): Promise<LeaseResult> {
    return this.db.transaction("rw", this.db.appSettings, async () => {
      const setting = await this.db.appSettings.get(this.key(key));
      const current = setting?.value as AdventureControlLease | undefined;
      const now = this.clock.now();
      if (current && current.expiresAt > now)
        return { ok: false, reason: "held" };
      const lease: AdventureControlLease = {
        ...key,
        ownerId: this.idGenerator.uuid(),
        fencingToken: (current?.fencingToken ?? 0) + 1,
        expiresAt: now + EXPIRY_MS,
      };
      await this.db.appSettings.put({
        key: this.key(key),
        value: lease,
        updatedAt: now,
      });
      return { ok: true, lease };
    });
  }

  async renew(lease: AdventureControlLease): Promise<LeaseResult> {
    return this.db.transaction("rw", this.db.appSettings, async () => {
      const current = (await this.db.appSettings.get(this.key(lease)))
        ?.value as AdventureControlLease | undefined;
      if (
        !current ||
        current.ownerId !== lease.ownerId ||
        current.fencingToken !== lease.fencingToken
      )
        return { ok: false, reason: "stale" };
      const renewed = { ...current, expiresAt: this.clock.now() + EXPIRY_MS };
      await this.db.appSettings.put({
        key: this.key(lease),
        value: renewed,
        updatedAt: this.clock.now(),
      });
      return { ok: true, lease: renewed };
    });
  }

  async verify(lease: AdventureControlLease): Promise<boolean> {
    const current = (await this.db.appSettings.get(this.key(lease)))?.value as
      AdventureControlLease | undefined;
    return (
      !!current &&
      current.ownerId === lease.ownerId &&
      current.fencingToken === lease.fencingToken &&
      current.expiresAt > this.clock.now()
    );
  }

  async release(lease: AdventureControlLease): Promise<void> {
    await this.db.transaction("rw", this.db.appSettings, async () => {
      const current = (await this.db.appSettings.get(this.key(lease)))
        ?.value as AdventureControlLease | undefined;
      if (
        current?.ownerId === lease.ownerId &&
        current.fencingToken === lease.fencingToken
      )
        await this.db.appSettings.delete(this.key(lease));
    });
  }
}

export const adventureControlAuthority = new AdventureControlAuthority();
