/** One solo session per vault, stored on this device only (data-model.md). */
export interface SoloSession {
  version: 1;
  id: string;
  vaultId: string;
  startedAt: number;
  mapId: string | null;
  journalId: string | null;
  sceneName: string;
  sceneSectionId: string | null;
  lastRoll: string | null;
}

export interface SoloSetup {
  mapId: string | null;
  journal: boolean;
}

export interface IdSource {
  uuid(): string;
}

export interface ClockSource {
  now(): number;
}
