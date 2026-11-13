import { vi } from "vitest";
import { createMemoryStorage, type CloudBackupRuntime } from "./runtime";
import { enableCloudBackup } from "./backup-lifecycle";

export const MANIFEST = {
  schemaVersion: 1,
  backupId: "b-1",
  vaultTitle: "The Saltmere Fens",
  sizeBytes: 512,
  createdAt: "2026-08-31T10:00:00.000Z",
  lastPushedAt: "2026-08-31T10:00:00.000Z",
};

export const PAYLOAD = {
  vaultTitle: "The Saltmere Fens",
  bundle: { entities: [] },
};

/** Builds a runtime whose fetch returns queued responses and records calls. */
export function makeRuntime(
  responses: { ok: boolean; status: number; body: unknown }[] = [],
) {
  const calls: { url: string; init?: any }[] = [];
  const queue = [...responses];
  const runtime: CloudBackupRuntime = {
    baseUrl: "https://worker.test",
    storage: createMemoryStorage(),
    now: () => new Date("2026-08-31T12:00:00.000Z"),
    fetch: vi.fn(async (url: string, init?: any) => {
      calls.push({ url, init });
      const next = queue.shift() ?? {
        ok: true,
        status: 200,
        body: { manifest: MANIFEST },
      };
      return {
        ok: next.ok,
        status: next.status,
        json: async () => next.body,
        arrayBuffer: async () => new ArrayBuffer(0),
      };
    }) as any,
  };
  return { runtime, calls };
}

export const enableResponse = {
  ok: true,
  status: 201,
  body: { backupId: "b-1", ownerCode: "code-1", manifest: MANIFEST },
};

export async function enabled(
  ...then: { ok: boolean; status: number; body: unknown }[]
) {
  const h = makeRuntime([enableResponse, ...then]);
  await enableCloudBackup(h.runtime, "v-1", PAYLOAD);
  h.calls.length = 0;
  return h;
}
