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
  /** Character entity ids in the party, at most 12 (Solo Play Loop). */
  partyIds: string[];
  /** The session's scenes in order; the last one is current (Solo Play Loop). */
  scenes: SoloScene[];
}

export interface SoloScene {
  name: string;
  sectionId: string | null;
}

export interface SoloSetup {
  mapId: string | null;
  journal: boolean;
  /** Optional party chosen in setup (Solo Play Loop, FR-014). */
  partyIds?: string[];
}

export interface IdSource {
  uuid(): string;
}

export interface ClockSource {
  now(): number;
}
