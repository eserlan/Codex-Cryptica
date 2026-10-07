import {
  createSoloSession,
  normaliseSceneName,
  parseSoloSession,
  resolveDefaultMap,
  withLastRoll,
  withScene,
  type SoloSession,
  type SoloSetup,
} from "solo-session-engine";
import type { StorageLike } from "$lib/utils/runtime-deps";

export const SOLO_SESSION_KEY_PREFIX = "codex-solo-session:";
export const SHARED_SOLO_NOTE = "End shared play to start a solo session.";
export const SOLO_SHARED_NOTE =
  "End your solo session to share or preview as a player.";

export const soloSessionKey = (vaultId: string) =>
  `${SOLO_SESSION_KEY_PREFIX}${vaultId}`;

/** The journal, as the solo session uses it. */
export interface JournalPort {
  current: {
    id: string;
    status: "active" | "ended";
    sections: { id: string }[];
  } | null;
  start(): Promise<{ id: string }>;
  end(): Promise<void>;
  createSection(name: string): Promise<{ id: string }>;
  renameSection(sectionId: string, name: string): Promise<void>;
  setActiveSection(id: string | undefined): void;
}

export interface MapPort {
  activeMapId: string | null;
  selectMap(id: string): void;
  setSoloFog(on: boolean): void;
}

export interface SoloSessionDeps {
  storage: StorageLike;
  storageEvents: { subscribe(cb: (key: string) => void): () => void };
  ids: { uuid(): string };
  clock: { now(): number };
  vaultId(): string | null;
  mapIds(): string[];
  journal: JournalPort;
  maps: MapPort;
  navigate(path: string): Promise<void>;
  isGuest(): boolean;
  isSharedPlayOn(): boolean;
  notify(message: string): void;
}

/**
 * One solo session per vault. Campaign knowledge stays in the vault and the
 * journal; this store only records which map, journal and scene are in play.
 */
export class SoloSessionStore {
  session = $state<SoloSession | null>(null);

  private deps: SoloSessionDeps;
  /** True while a start is in flight, so a double-click cannot start two sessions. */
  private starting = false;

  constructor(deps: SoloSessionDeps) {
    this.deps = deps;
    this.syncVault();
    this.deps.storageEvents.subscribe((key) => {
      const vaultId = this.deps.vaultId();
      if (vaultId && key === soloSessionKey(vaultId)) this.syncVault();
    });
  }

  get isActive(): boolean {
    return this.session !== null;
  }

  /** The session's journal is the running one. */
  get journalRunning(): boolean {
    const journal = this.deps.journal.current;
    return (
      !!this.session?.journalId &&
      journal?.status === "active" &&
      journal.id === this.session.journalId
    );
  }

  /** Reads the active vault's session. Called on load and when the vault changes. */
  syncVault(): void {
    const vaultId = this.deps.vaultId();
    this.session = vaultId ? this.read(vaultId) : null;
  }

  defaultMapId(): string | null {
    return resolveDefaultMap(this.deps.maps.activeMapId, this.deps.mapIds());
  }

  /** Starts a session. Throws, and writes nothing, when it cannot start. */
  async start(setup: SoloSetup): Promise<void> {
    const vaultId = this.deps.vaultId();
    if (!vaultId) throw new Error("No vault is open.");
    if (this.deps.isGuest()) {
      throw new Error("Solo sessions are not available in guest mode.");
    }
    if (this.deps.isSharedPlayOn()) throw new Error(SHARED_SOLO_NOTE);
    if (this.session || this.starting) {
      throw new Error("A solo session is already running in this vault.");
    }

    this.starting = true;
    try {
      let journalId: string | null = null;
      if (setup.journal) {
        try {
          journalId = (await this.deps.journal.start()).id;
        } catch {
          this.deps.notify(
            "The Session Journal could not start. Your solo session started without it.",
          );
        }
      }
      this.write(createSoloSession(vaultId, setup, journalId, this.deps));
    } finally {
      this.starting = false;
    }

    if (setup.mapId) {
      this.deps.maps.selectMap(setup.mapId);
      this.deps.maps.setSoloFog(true);
      await this.deps.navigate("/map");
    } else {
      await this.deps.navigate("/");
    }
  }

  /** Picks the session's map from the bar, turns SOLO on for it and goes there. */
  async chooseMap(mapId: string): Promise<void> {
    const session = this.requireSession();
    if (!this.deps.mapIds().includes(mapId)) {
      throw new Error("That map is not in this vault.");
    }
    this.write({ ...session, mapId });
    this.deps.maps.selectMap(mapId);
    this.deps.maps.setSoloFog(true);
    await this.deps.navigate("/map");
  }

  /** Returns to the running session. Map settings are left as they are (FR-021). */
  async resume(): Promise<void> {
    const session = this.requireSession();
    if (session.sceneSectionId && this.journalRunning) {
      this.deps.journal.setActiveSection(session.sceneSectionId);
    }
    const mapIds = this.deps.mapIds();
    if (session.mapId && mapIds.includes(session.mapId)) {
      this.deps.maps.selectMap(session.mapId);
      await this.deps.navigate("/map");
    } else {
      await this.deps.navigate("/");
    }
  }

  /** Sets the scene. Returns false, and changes nothing, for an empty name. */
  async setScene(input: string): Promise<boolean> {
    const session = this.requireSession();
    const result = normaliseSceneName(input);
    if (!result.ok) return false;

    let sectionId: string | null = null;
    if (this.journalRunning) {
      try {
        sectionId = (await this.deps.journal.createSection(result.name)).id;
      } catch {
        sectionId = null;
      }
    }
    this.write(withScene(session, result.name, sectionId));
    return true;
  }

  /** Renames the current scene and, when its journal section still exists, that section. */
  async renameScene(input: string): Promise<boolean> {
    const session = this.requireSession();
    const result = normaliseSceneName(input);
    if (!result.ok) return false;

    const journal = this.deps.journal.current;
    const sectionExists =
      !!session.sceneSectionId &&
      !!journal?.sections.some((s) => s.id === session.sceneSectionId);
    if (sectionExists && this.journalRunning) {
      await this.deps.journal.renameSection(
        session.sceneSectionId!,
        result.name,
      );
    }
    this.write(withScene(session, result.name, session.sceneSectionId));
    return true;
  }

  recordRoll(expression: string): void {
    const session = this.session;
    if (!session) return;
    const trimmed = expression.trim();
    if (trimmed.length === 0 || trimmed.length > 64) return;
    this.write(withLastRoll(session, trimmed));
  }

  /** Ends the session. Only the journal is ever ended here, and only on request. */
  async end({ endJournal }: { endJournal: boolean }): Promise<void> {
    const vaultId = this.deps.vaultId();
    if (!this.session || !vaultId) return;
    if (endJournal && this.journalRunning) {
      try {
        await this.deps.journal.end();
      } catch {
        this.deps.notify("The Session Journal could not be ended.");
      }
    }
    this.clear(vaultId);
  }

  private requireSession(): SoloSession {
    if (!this.session) throw new Error("No solo session is running.");
    return this.session;
  }

  private read(vaultId: string): SoloSession | null {
    try {
      const raw = this.deps.storage.getItem(soloSessionKey(vaultId));
      if (!raw) return null;
      return parseSoloSession(JSON.parse(raw), vaultId);
    } catch (err) {
      console.warn("[SoloSession] Could not read the session", err);
      return null;
    }
  }

  private write(session: SoloSession): void {
    this.session = session;
    try {
      this.deps.storage.setItem(
        soloSessionKey(session.vaultId),
        JSON.stringify(session),
      );
    } catch (err) {
      console.warn("[SoloSession] Could not save the session", err);
    }
  }

  private clear(vaultId: string): void {
    this.session = null;
    try {
      this.deps.storage.removeItem(soloSessionKey(vaultId));
    } catch (err) {
      console.warn("[SoloSession] Could not clear the session", err);
    }
  }
}
