# Contract: Adventure Session Repository and Control Lease

## Session repository

```ts
interface AdventureSessionRepository {
  list(vaultId: string): Promise<AdventureListResult>;
  load(vaultId: string, sessionId: string): Promise<AdventureLoadResult>;
  save(
    expectedRevision: number | null,
    session: AdventureSession,
  ): Promise<AdventureSaveResult>;
  archive(
    vaultId: string,
    sessionId: string,
    expectedRevision: number,
  ): Promise<AdventureSaveResult>;
}
```

Paths are `.codex/adventures/<sessionId>.json`. The repository validates that
the requested vault and filename match the document before returning it.

### Guarantees

- `save` uses optimistic revision comparison and serializes calls per session.
- UI state is not advanced until the OPFS writable closes successfully.
- A failed write leaves the caller holding the prior committed object.
- Invalid/corrupt/newer files are never overwritten by load/list recovery.
- If multiple valid files are marked active, the newest `updatedAt` record is
  returned as the effective active session and every other active-marked record
  is projected with `duplicate-active-conflict`; conflict records are read-only,
  cannot acquire control, and remain unchanged on disk.
- `list` returns player-safe metadata only; it never materializes hidden text in
  archive UI DTOs.
- Archive is a status update to the same authoritative file, not deletion.
- Existing vault backup/restore includes the path without special export code.

## Foundational control authority

```ts
interface AdventureControlAuthority {
  acquire(key: AdventureLeaseKey): Promise<LeaseResult>;
  renew(lease: AdventureControlLease): Promise<LeaseResult>;
  verify(lease: AdventureControlLease): Promise<boolean>;
  release(lease: AdventureControlLease): Promise<void>;
}
```

The authority is implemented during the Foundational phase because every
commit path must verify it. The authoritative record is an `appSettings` value
written in a Dexie read-check-write transaction.

## Browser control coordinator

```ts
interface AdventureControlCoordinator {
  start(lease: AdventureControlLease): void;
  stop(): Promise<void>;
  subscribe(
    key: AdventureLeaseKey,
    listener: (event: AdventureControlEvent) => void,
  ): () => void;
}
```

The coordinator renews the authoritative lease, performs best-effort lifecycle
release, and uses `BroadcastChannel` for notification only. It never grants
authority.

### Fencing rules

- Every successful acquisition produces a monotonically newer fencing token.
- Generation captures the token; save re-verifies it.
- An expired or superseded owner cannot persist a turn even if its network
  response arrives late.
- A takeover reloads the persisted session before enabling controls.
- Heartbeat is 3 seconds; normal expiry is 10 seconds. Tests use an injected
  clock and do not sleep.
