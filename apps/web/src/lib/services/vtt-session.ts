import { deleteOpfsEntry, readOpfsBlob, writeOpfsFile } from "../utils/opfs";
import type {
  EncounterSession,
  EncounterSnapshotSummary,
  Token,
} from "$types/vtt";

export interface VTTSessionServiceDeps {
  getActiveVaultHandle: () => Promise<FileSystemDirectoryHandle | undefined>;
}

function createEmptyFogMask(): string | null {
  return null;
}

export function createEncounterSession(
  mapId: string,
  id = crypto.randomUUID(),
  name = `Encounter ${id.slice(0, 8)}`,
): EncounterSession {
  return {
    id,
    name,
    mapId,
    mode: "exploration",
    tokens: {},
    initiativeOrder: [],
    initiativeValues: {},
    round: 1,
    turnIndex: 0,
    selection: null,
    sessionFogMask: createEmptyFogMask(),
    lastPing: null,
    measurement: {
      active: false,
      start: null,
      end: null,
    },
    createdAt: Date.now(),
    savedAt: null,
    chatMessages: [],
    gridSize: 50,
    gridUnit: "ft",
    gridDistance: 5,
  };
}

export function sanitizeEncounterSession(
  session: EncounterSession,
): EncounterSession {
  return {
    ...session,
    tokens: Object.fromEntries(
      Object.entries(session.tokens).map(([id, token]) => [
        id,
        { ...(token as Token) },
      ]),
    ),
    initiativeOrder: [...session.initiativeOrder],
    initiativeValues: { ...session.initiativeValues },
    measurement: {
      active: session.measurement.active,
      start: session.measurement.start
        ? { ...session.measurement.start }
        : null,
      end: session.measurement.end ? { ...session.measurement.end } : null,
      locked: session.measurement.locked,
    },
    lastPing: session.lastPing ? { ...session.lastPing } : null,
  };
}

export function summarizeEncounterSession(
  session: EncounterSession,
): EncounterSnapshotSummary {
  return {
    id: session.id,
    name: session.name,
    mapId: session.mapId,
    savedAt: session.savedAt ?? session.createdAt,
    tokenCount: Object.keys(session.tokens).length,
    round: session.round,
    mode: session.mode,
  };
}

export class VTTSessionService {
  constructor(private deps: VTTSessionServiceDeps) {}

  async saveEncounterSnapshot(
    session: EncounterSession,
    encounterId = session.id,
  ) {
    const vaultHandle = await this.deps.getActiveVaultHandle();
    if (!vaultHandle) {
      throw new Error("Vault is not available");
    }

    const payload = sanitizeEncounterSession({
      ...session,
      savedAt: Date.now(),
    });
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    await writeOpfsFile(
      ["maps", `${session.mapId}_encounter_${encounterId}.json`],
      blob,
      vaultHandle,
      vaultHandle.name,
    );

    return {
      encounterId,
      summary: summarizeEncounterSession(payload),
      path: `maps/${session.mapId}_encounter_${encounterId}.json`,
    };
  }

  async listEncounterSnapshots(mapId: string) {
    const vaultHandle = await this.deps.getActiveVaultHandle();
    if (!vaultHandle) return [];

    const mapsDir = await vaultHandle
      .getDirectoryHandle("maps")
      .catch(() => null);
    if (!mapsDir) return [];

    const summaries: EncounterSnapshotSummary[] = [];
    for await (const [name, handle] of mapsDir.entries()) {
      if (
        handle.kind === "file" &&
        name.startsWith(`${mapId}_encounter_`) &&
        name.endsWith(".json")
      ) {
        try {
          const blob = await (handle as FileSystemFileHandle).getFile();
          const parsed = JSON.parse(await blob.text()) as EncounterSession;
          summaries.push(summarizeEncounterSession(parsed));
        } catch {
          continue;
        }
      }
    }

    return summaries.sort((a, b) => b.savedAt - a.savedAt);
  }

  async loadEncounterSnapshot(mapId: string, encounterId: string) {
    const vaultHandle = await this.deps.getActiveVaultHandle();
    if (!vaultHandle) {
      throw new Error("Vault is not available");
    }

    const blob = await readOpfsBlob(
      ["maps", `${mapId}_encounter_${encounterId}.json`],
      vaultHandle,
    );
    return JSON.parse(await blob.text()) as EncounterSession;
  }

  async deleteEncounterSnapshot(mapId: string, encounterId: string) {
    const vaultHandle = await this.deps.getActiveVaultHandle();
    if (!vaultHandle) {
      throw new Error("Vault is not available");
    }

    await deleteOpfsEntry(
      vaultHandle,
      ["maps", `${mapId}_encounter_${encounterId}.json`],
      vaultHandle.name,
    );
  }
}
