import { untrack } from "svelte";
import {
  createSoloSession,
  withParty,
  normaliseSceneName,
  parseSoloSession,
  resolveDefaultMap,
  withLastRoll,
  type SoloSession,
  type SoloSetup,
  withSceneAdded,
  withCurrentSceneRenamed,
  nextVisitName,
  type SoloScene,
  askOracle,
  rollRandomEvent,
  withTension,
  clampTension,
  TENSION_DEFAULT,
  type EventContext,
  type Likelihood,
  type OracleAnswer,
  type RandomEvent,
} from "solo-session-engine";
import type { StorageLike } from "$lib/utils/runtime-deps";
import {
  formatOracleAnswer,
  formatPartyChange,
  formatRandomEvent,
  formatTensionChange,
  isCaptured,
  type CaptureKind,
  type JournalCapturePayload,
} from "session-journal-engine";

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
    captureOff?: CaptureKind[];
    captureMapMoves?: boolean;
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
  /** The vault's Character entities, for resolving party names. */
  characters(): { id: string; name: string }[];
  /** Emits a JOURNAL:CAPTURE; the journal records it only while one runs. */
  publishCapture(payload: JournalCapturePayload): void;
  /** Random numbers in [0, 1). Defaults to the platform's secure source. */
  random?: () => number;
  /** The vault's open threads, offered as event subjects (spec 174, FR-015). */
  openThreads?: () => { id: string; title: string }[];
  /** The name of the current place, for events about the place (FR-015). */
  placeName?: () => string | null;
}

const secureRandom = (): number => {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.getRandomValues === "function"
  ) {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    return array[0] / (0xffffffff + 1);
  }
  return Math.random();
};

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

    // The vault id is often unknown when the store is built, so follow it: a
    // reload restores the session once the active vault has loaded.
    $effect.root(() => {
      $effect(() => {
        this.deps.vaultId();
        untrack(() => this.syncVault());
      });
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
    const vaultId = this.requireStartableVault();

    this.starting = true;
    try {
      const journalId = setup.journal ? await this.startJournal() : null;
      const created = createSoloSession(vaultId, setup, journalId, this.deps);
      this.write(setup.partyIds ? withParty(created, setup.partyIds) : created);
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

  /** The vault id a session can start in. Throws when it cannot start. */
  private requireStartableVault(): string {
    const vaultId = this.deps.vaultId();
    if (!vaultId) throw new Error("No vault is open.");
    if (this.deps.isGuest()) {
      throw new Error("Solo sessions are not available in guest mode.");
    }
    if (this.deps.isSharedPlayOn()) throw new Error(SHARED_SOLO_NOTE);
    if (this.session || this.starting) {
      throw new Error("A solo session is already running in this vault.");
    }
    return vaultId;
  }

  /** The journal is optional: if it cannot start, the session starts without one. */
  private async startJournal(): Promise<string | null> {
    try {
      return (await this.deps.journal.start()).id;
    } catch {
      this.deps.notify(
        "The Session Journal could not start. Your solo session started without it.",
      );
      return null;
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

    // A scene only gets its own journal section while scenes are captured (spec 174, FR-023).
    let sectionId: string | null = null;
    if (this.journalRunning && this.scenesCaptured()) {
      try {
        sectionId = (await this.deps.journal.createSection(result.name)).id;
      } catch {
        sectionId = null;
      }
    }
    this.write(withSceneAdded(session, result.name, sectionId));
    return true;
  }

  private scenesCaptured(): boolean {
    const journal = this.deps.journal.current;
    return !!journal && isCaptured(journal, "scene");
  }

  /** Starts a numbered new visit to a past scene, in a new section (FR-023). */
  async returnToScene(index: number): Promise<boolean> {
    const session = this.requireSession();
    const name = nextVisitName(session.scenes, index);
    if (!name) return false;
    return this.setScene(name);
  }

  /** The session's scenes in order; the last is current. */
  get scenes(): SoloScene[] {
    return this.session?.scenes ?? [];
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
    if (sectionExists && this.journalRunning && this.scenesCaptured()) {
      await this.deps.journal.renameSection(
        session.sceneSectionId!,
        result.name,
      );
    }
    this.write(withCurrentSceneRenamed(session, result.name));
    return true;
  }

  /** The party, resolved to names. Members no longer in the vault are dropped. */
  /** The session's tension, 1 to 9; the default when no session runs (spec 174, FR-010). */
  get tension(): number {
    return this.session?.tension ?? TENSION_DEFAULT;
  }

  /** Raises or lowers tension one step, kept to 1 to 9, and journals a real change. */
  setTension(value: number): void {
    const session = this.session;
    if (!session) return;
    const next = clampTension(value);
    if (next === session.tension) return;
    const from = session.tension;
    this.write(withTension(session, next));
    const payload = formatTensionChange(from, next);
    if (payload) this.deps.publishCapture(payload);
  }

  raiseTension(): void {
    this.setTension(this.tension + 1);
  }

  lowerTension(): void {
    this.setTension(this.tension - 1);
  }

  /** What an event can refer to right now (spec 174, FR-015). */
  eventContext(): EventContext {
    return {
      openThreads: this.deps.openThreads?.() ?? [],
      partyNames: this.party.map((m) => m.name),
      placeName: this.deps.placeName?.() ?? null,
    };
  }

  /**
   * Asks the dice a yes/no question. Works with or without a running session
   * and journal; the journal only records while one runs. Publishes the answer
   * and, when one follows, the random event (spec 174, FR-005, FR-006, FR-016).
   */
  ask(question: string, likelihood: Likelihood): OracleAnswer {
    const random = this.deps.random ?? secureRandom;
    const result = askOracle(
      {
        question,
        likelihood,
        tension: this.tension,
        context: this.eventContext(),
      },
      random,
    );
    this.deps.publishCapture(formatOracleAnswer(result));
    if (result.event) this.deps.publishCapture(formatRandomEvent(result.event));
    return result;
  }

  /** A random event on request, recorded like any other (spec 174, FR-013). */
  randomEvent(): RandomEvent {
    const random = this.deps.random ?? secureRandom;
    const event = rollRandomEvent(this.eventContext(), random);
    this.deps.publishCapture(formatRandomEvent(event));
    return event;
  }

  get party(): { id: string; name: string }[] {
    const known = new Map(this.deps.characters().map((c) => [c.id, c.name]));
    return (this.session?.partyIds ?? [])
      .filter((id) => known.has(id))
      .map((id) => ({ id, name: known.get(id)! }));
  }

  /** Sets the party. While a journal runs, joins and leaves are recorded in it. */
  async setParty(ids: string[]): Promise<void> {
    const session = this.requireSession();
    // Only Characters that still exist count, so a deleted member neither
    // takes a place in the party nor shows up in the journal.
    const characters = this.deps.characters();
    const names = new Map(characters.map((c) => [c.id, c.name]));
    const known = (list: readonly string[]) =>
      list.filter((id) => names.has(id));
    const next = withParty(session, known(ids));
    const before = new Set(known(session.partyIds));
    const after = new Set(next.partyIds);
    const label = (id: string) => names.get(id) ?? id;
    const joined = next.partyIds.filter((id) => !before.has(id)).map(label);
    const left = [...before].filter((id) => !after.has(id)).map(label);

    this.write(next);
    if (this.journalRunning && (joined.length || left.length)) {
      const payload = formatPartyChange({ joined, left });
      if (payload) this.deps.publishCapture(payload);
    }
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
        // Keep the session: the journal is still running, and the player can try again.
        this.deps.notify(
          "The Session Journal could not be ended. The solo session is still running.",
        );
        return;
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
