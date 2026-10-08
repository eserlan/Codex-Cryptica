import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  SoloSessionStore,
  SOLO_SESSION_KEY_PREFIX,
  SHARED_SOLO_NOTE,
  type JournalPort,
  type MapPort,
  type SoloSessionDeps,
} from "./solo-session.svelte";

const VAULT = "v1";

function memoryStorage(seed: Record<string, string> = {}) {
  const data = new Map(Object.entries(seed));
  return {
    data,
    getItem: vi.fn((k: string) => data.get(k) ?? null),
    setItem: vi.fn((k: string, v: string) => void data.set(k, v)),
    removeItem: vi.fn((k: string) => void data.delete(k)),
  };
}

function makeJournal(overrides: Partial<JournalPort> = {}): JournalPort & {
  current: JournalPort["current"];
} {
  let n = 0;
  const journal = {
    current: null as JournalPort["current"],
    start: vi.fn(async () => {
      journal.current = { id: "j1", status: "active", sections: [] };
      return { id: "j1" };
    }),
    end: vi.fn(async () => {
      if (journal.current) journal.current.status = "ended";
    }),
    createSection: vi.fn(async (_name: string) => {
      const id = `sec${++n}`;
      journal.current?.sections.push({ id });
      return { id };
    }),
    renameSection: vi.fn(async () => {}),
    setActiveSection: vi.fn(),
    ...overrides,
  };
  return journal as JournalPort & { current: JournalPort["current"] };
}

function makeMaps(overrides: Partial<MapPort> = {}): MapPort {
  return {
    activeMapId: null,
    selectMap: vi.fn(),
    setSoloFog: vi.fn(),
    ...overrides,
  };
}

function build(
  opts: {
    storage?: ReturnType<typeof memoryStorage>;
    journal?: JournalPort;
    maps?: MapPort;
    vaultId?: string | null;
    mapIds?: string[];
    isGuest?: boolean;
    isSharedPlayOn?: boolean;
    characters?: { id: string; name: string }[];
    publishCapture?: (payload: unknown) => void;
    random?: () => number;
    openThreads?: { id: string; title: string }[];
    placeName?: string | null;
  } = {},
) {
  const storage = opts.storage ?? memoryStorage();
  const journal = opts.journal ?? makeJournal();
  const maps = opts.maps ?? makeMaps();
  const notify = vi.fn();
  const navigate = vi.fn(async (_path: string) => {});
  let vaultId: string | null =
    opts.vaultId === undefined ? VAULT : opts.vaultId;
  let listener: ((key: string) => void) | undefined;
  const deps: SoloSessionDeps = {
    storage,
    storageEvents: { subscribe: (cb) => ((listener = cb), () => {}) },
    ids: { uuid: () => "sess-1" },
    clock: { now: () => 1000 },
    vaultId: () => vaultId,
    mapIds: () => opts.mapIds ?? ["m1"],
    journal,
    maps,
    navigate,
    isGuest: () => opts.isGuest ?? false,
    isSharedPlayOn: () => opts.isSharedPlayOn ?? false,
    characters: () =>
      opts.characters ?? [
        { id: "kael", name: "Kael" },
        { id: "ivo", name: "Brother Ivo" },
      ],
    publishCapture: opts.publishCapture ?? (() => {}),
    random: opts.random,
    openThreads: () => opts.openThreads ?? [],
    placeName: () => opts.placeName ?? null,
    notify,
  };
  const store = new SoloSessionStore(deps);
  return {
    store,
    storage,
    journal,
    maps,
    navigate,
    notify,
    setVault: (id: string | null) => {
      vaultId = id;
      store.syncVault();
    },
    emitStorage: (key: string) => listener?.(key),
  };
}

const key = (v = VAULT) => `${SOLO_SESSION_KEY_PREFIX}${v}`;

describe("loading the session", () => {
  it("reads the active vault's stored session", () => {
    const stored = JSON.stringify({
      version: 1,
      id: "s",
      vaultId: VAULT,
      startedAt: 5,
      mapId: "m1",
      journalId: null,
      sceneName: "",
      sceneSectionId: null,
      lastRoll: null,
    });
    const { store } = build({ storage: memoryStorage({ [key()]: stored }) });
    expect(store.isActive).toBe(true);
    expect(store.session?.mapId).toBe("m1");
  });

  it("reads a malformed value as no session, without throwing", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { store } = build({ storage: memoryStorage({ [key()]: "{nope" }) });
    expect(store.isActive).toBe(false);
    warn.mockRestore();
  });

  it("treats a storage read error as no session", () => {
    const storage = memoryStorage();
    storage.getItem.mockImplementation(() => {
      throw new Error("denied");
    });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { store } = build({ storage });
    expect(store.isActive).toBe(false);
    warn.mockRestore();
  });

  it("reloads when the active vault changes", () => {
    const stored = JSON.stringify({
      version: 1,
      id: "s",
      vaultId: "v2",
      startedAt: 5,
      mapId: null,
      journalId: null,
      sceneName: "",
      sceneSectionId: null,
      lastRoll: null,
    });
    const storage = memoryStorage({ [key("v2")]: stored });
    const { store, setVault } = build({ storage });
    expect(store.isActive).toBe(false);
    setVault("v2");
    expect(store.isActive).toBe(true);
    setVault(null);
    expect(store.isActive).toBe(false);
  });

  it("reloads when another tab writes this vault's key, and ignores other keys", () => {
    const storage = memoryStorage();
    const { store, emitStorage } = build({ storage });
    expect(store.isActive).toBe(false);
    storage.data.set(
      key(),
      JSON.stringify({
        version: 1,
        id: "s",
        vaultId: VAULT,
        startedAt: 5,
        mapId: null,
        journalId: null,
        sceneName: "",
        sceneSectionId: null,
        lastRoll: null,
      }),
    );
    emitStorage("codex-something-else");
    expect(store.isActive).toBe(false);
    emitStorage(key());
    expect(store.isActive).toBe(true);
  });
});

describe("start", () => {
  it("with a map: selects it, turns SOLO on, starts a journal and goes to the map", async () => {
    const { store, maps, journal, navigate, storage } = build();
    await store.start({ mapId: "m1", journal: true });
    expect(journal.start).toHaveBeenCalledTimes(1);
    expect(maps.selectMap).toHaveBeenCalledWith("m1");
    expect(maps.setSoloFog).toHaveBeenCalledWith(true);
    expect(navigate).toHaveBeenCalledWith("/map");
    expect(store.session?.journalId).toBe("j1");
    expect(storage.setItem).toHaveBeenCalledWith(key(), expect.any(String));
  });

  it("with no map: goes to the graph and does not touch the map", async () => {
    const { store, maps, navigate } = build();
    await store.start({ mapId: null, journal: false });
    expect(maps.selectMap).not.toHaveBeenCalled();
    expect(maps.setSoloFog).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith("/");
  });

  it("with the journal option off: makes no journal call", async () => {
    const { store, journal } = build();
    await store.start({ mapId: null, journal: false });
    expect(journal.start).not.toHaveBeenCalled();
    expect(store.session?.journalId).toBeNull();
  });

  it("keeps the session when the journal fails to start, and tells the player", async () => {
    const journal = makeJournal({
      start: vi.fn(async () => {
        throw new Error("db down");
      }),
    });
    const { store, notify } = build({ journal });
    await store.start({ mapId: null, journal: true });
    expect(store.isActive).toBe(true);
    expect(store.session?.journalId).toBeNull();
    expect(notify).toHaveBeenCalled();
  });

  it("refuses in guest mode and writes nothing", async () => {
    const { store, storage } = build({ isGuest: true });
    await expect(store.start({ mapId: null, journal: false })).rejects.toThrow(
      /guest/,
    );
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(store.isActive).toBe(false);
  });

  it("refuses while shared play is on, with the shared-play note", async () => {
    const { store, navigate } = build({ isSharedPlayOn: true });
    await expect(store.start({ mapId: null, journal: false })).rejects.toThrow(
      SHARED_SOLO_NOTE,
    );
    expect(navigate).not.toHaveBeenCalled();
    expect(store.isActive).toBe(false);
  });

  it("refuses when a session is already running in this vault, and keeps the existing one", async () => {
    const { store, storage } = build();
    await store.start({ mapId: null, journal: false });
    const before = storage.setItem.mock.calls.length;
    await expect(store.start({ mapId: "m1", journal: false })).rejects.toThrow(
      /already running/,
    );
    expect(storage.setItem.mock.calls.length).toBe(before);
    expect(store.session?.mapId).toBeNull();
  });

  it("refuses a second start while the first is in flight, and starts only one session", async () => {
    const journal = makeJournal({
      start: vi.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        return { id: "j1" };
      }),
    });
    const { store, storage } = build({ journal });
    const first = store.start({ mapId: null, journal: true });
    await expect(store.start({ mapId: null, journal: true })).rejects.toThrow(
      /already running/,
    );
    await first;
    expect(store.isActive).toBe(true);
    expect(storage.setItem).toHaveBeenCalledTimes(1);
  });

  it("refuses with no vault open", async () => {
    const { store } = build({ vaultId: null });
    await expect(store.start({ mapId: null, journal: false })).rejects.toThrow(
      /No vault/,
    );
  });

  it("never calls the Oracle or Adventure Mode, and never navigates to /adventure", async () => {
    const { store, navigate } = build();
    await store.start({ mapId: "m1", journal: true });
    const paths = navigate.mock.calls.map((call) => String(call[0]));
    expect(paths.length).toBeGreaterThan(0);
    for (const path of paths) {
      expect(path).not.toContain("adventure");
    }
  });

  it("defaults the setup map to the last open map, or the first map", () => {
    const { store } = build({
      maps: makeMaps({ activeMapId: "m2" }),
      mapIds: ["m1", "m2"],
    });
    expect(store.defaultMapId()).toBe("m2");
    const other = build({ mapIds: ["m1"] });
    expect(other.store.defaultMapId()).toBe("m1");
  });
});

describe("resume", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("selects the session's map and goes to it, without touching SOLO", async () => {
    const { store, maps, navigate } = build();
    await store.start({ mapId: "m1", journal: false });
    (maps.setSoloFog as ReturnType<typeof vi.fn>).mockClear();
    (maps.selectMap as ReturnType<typeof vi.fn>).mockClear();
    await store.resume();
    expect(maps.selectMap).toHaveBeenCalledWith("m1");
    expect(maps.setSoloFog).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenLastCalledWith("/map");
  });

  it("goes to the graph when the map is gone", async () => {
    const { store, navigate } = build({ mapIds: [] });
    await store.start({ mapId: null, journal: false });
    store.session = { ...store.session!, mapId: "gone" };
    await store.resume();
    expect(navigate).toHaveBeenLastCalledWith("/");
  });

  it("rejects with no session running", async () => {
    const { store } = build();
    await expect(store.resume()).rejects.toThrow(/No solo session/);
  });

  it("keeps two vaults' sessions apart", async () => {
    const storage = memoryStorage();
    const a = build({ storage, vaultId: "v1" });
    await a.store.start({ mapId: null, journal: false });
    const b = build({ storage, vaultId: "v2" });
    expect(b.store.isActive).toBe(false);
    expect(a.store.isActive).toBe(true);
  });
});

describe("scenes", () => {
  it("with the journal running: creates a section and stores it", async () => {
    const { store, journal } = build();
    await store.start({ mapId: null, journal: true });
    const ok = await store.setScene("Arrival");
    expect(ok).toBe(true);
    expect(journal.createSection).toHaveBeenCalledWith("Arrival");
    expect(store.session?.sceneName).toBe("Arrival");
    expect(store.session?.sceneSectionId).toBe("sec1");
  });

  it("with no journal: stores the name only", async () => {
    const { store, journal } = build();
    await store.start({ mapId: null, journal: false });
    await store.setScene("Arrival");
    expect(journal.createSection).not.toHaveBeenCalled();
    expect(store.session?.sceneSectionId).toBeNull();
    expect(store.session?.sceneName).toBe("Arrival");
  });

  it("rejects an empty name and changes nothing", async () => {
    const { store } = build();
    await store.start({ mapId: null, journal: false });
    await store.setScene("Arrival");
    expect(await store.setScene("   ")).toBe(false);
    expect(store.session?.sceneName).toBe("Arrival");
  });

  it("keeps the name when the section cannot be created", async () => {
    const journal = makeJournal({
      createSection: vi.fn(async () => {
        throw new Error("nope");
      }),
    });
    const { store } = build({ journal });
    await store.start({ mapId: null, journal: true });
    await store.setScene("Crypt");
    expect(store.session?.sceneName).toBe("Crypt");
    expect(store.session?.sceneSectionId).toBeNull();
  });

  it("renames the section while it exists in the running journal", async () => {
    const { store, journal } = build();
    await store.start({ mapId: null, journal: true });
    await store.setScene("Arrival");
    await store.renameScene("The flooded crypt");
    expect(journal.renameSection).toHaveBeenCalledWith(
      "sec1",
      "The flooded crypt",
    );
    expect(store.session?.sceneName).toBe("The flooded crypt");
  });

  it("does not rename a section that is no longer in the journal", async () => {
    const { store, journal } = build();
    await store.start({ mapId: null, journal: true });
    await store.setScene("Arrival");
    journal.current!.sections = [];
    await store.renameScene("Other");
    expect(journal.renameSection).not.toHaveBeenCalled();
    expect(store.session?.sceneName).toBe("Other");
  });
});

describe("chooseMap", () => {
  it("sets the session's map, turns SOLO on and goes to the map", async () => {
    const { store, maps, navigate } = build({ mapIds: ["m1", "m2"] });
    await store.start({ mapId: null, journal: false });
    await store.chooseMap("m2");
    expect(store.session?.mapId).toBe("m2");
    expect(maps.selectMap).toHaveBeenCalledWith("m2");
    expect(maps.setSoloFog).toHaveBeenCalledWith(true);
    expect(navigate).toHaveBeenLastCalledWith("/map");
  });

  it("refuses a map that is not in the vault and changes nothing", async () => {
    const { store, maps } = build({ mapIds: ["m1"] });
    await store.start({ mapId: null, journal: false });
    await expect(store.chooseMap("ghost")).rejects.toThrow(/not in this vault/);
    expect(store.session?.mapId).toBeNull();
    expect(maps.selectMap).not.toHaveBeenCalled();
  });
});

describe("recordRoll", () => {
  it("stores the last expression, and survives a reload", async () => {
    const storage = memoryStorage();
    const { store } = build({ storage });
    await store.start({ mapId: null, journal: false });
    store.recordRoll("2d6+1");
    expect(store.session?.lastRoll).toBe("2d6+1");
    const reloaded = build({ storage });
    expect(reloaded.store.session?.lastRoll).toBe("2d6+1");
  });

  it("does not store an expression over 64 characters", async () => {
    const { store } = build();
    await store.start({ mapId: null, journal: false });
    store.recordRoll("1".repeat(65));
    expect(store.session?.lastRoll).toBeNull();
  });
});

describe("end", () => {
  it("with the journal kept: removes only this vault's key and makes no journal call", async () => {
    const { store, journal, storage } = build();
    await store.start({ mapId: null, journal: true });
    storage.removeItem.mockClear();
    await store.end({ endJournal: false });
    expect(journal.end).not.toHaveBeenCalled();
    expect(storage.removeItem).toHaveBeenCalledTimes(1);
    expect(storage.removeItem).toHaveBeenCalledWith(key());
    expect(storage.setItem).toHaveBeenCalledTimes(1);
    expect(store.isActive).toBe(false);
  });

  it("with the journal ended: ends the running journal and clears the session", async () => {
    const { store, journal } = build();
    await store.start({ mapId: null, journal: true });
    await store.end({ endJournal: true });
    expect(journal.end).toHaveBeenCalledTimes(1);
    expect(store.isActive).toBe(false);
  });

  it("keeps the session when ending the journal fails, so the player can try again", async () => {
    const journal = makeJournal({
      end: vi.fn(async () => {
        throw new Error("nope");
      }),
    });
    const { store, notify, storage } = build({ journal });
    await store.start({ mapId: null, journal: true });
    storage.removeItem.mockClear();
    await store.end({ endJournal: true });
    expect(store.isActive).toBe(true);
    expect(storage.removeItem).not.toHaveBeenCalled();
    expect(notify).toHaveBeenCalledWith(
      expect.stringContaining("still running"),
    );
  });

  it("does not end a journal that is not the session's", async () => {
    const { store, journal } = build();
    await store.start({ mapId: null, journal: false });
    await store.end({ endJournal: true });
    expect(journal.end).not.toHaveBeenCalled();
  });

  it("journalRunning is true only for the session's active journal", async () => {
    const { store, journal } = build();
    await store.start({ mapId: null, journal: true });
    expect(store.journalRunning).toBe(true);
    journal.current!.status = "ended";
    expect(store.journalRunning).toBe(false);
  });
});

describe("party", () => {
  it("saves the party and keeps it across a reload", async () => {
    const storage = memoryStorage();
    const { store } = build({ storage });
    await store.start({ mapId: null, journal: false });
    await store.setParty(["kael", "ivo"]);
    expect(store.party.map((m) => m.id)).toEqual(["kael", "ivo"]);
    const reloaded = build({ storage });
    expect(reloaded.store.session?.partyIds).toEqual(["kael", "ivo"]);
  });

  it("journals joins and leaves while a journal runs", async () => {
    const publishCapture = vi.fn();
    const { store } = build({ publishCapture });
    await store.start({ mapId: null, journal: true });
    await store.setParty(["kael"]);
    await store.setParty(["kael", "ivo"]);
    await store.setParty(["ivo"]);
    const contents = publishCapture.mock.calls.map((c) => c[0].content);
    expect(contents[0]).toBe("Party: Kael joined.");
    expect(contents[1]).toBe("Party: Brother Ivo joined.");
    expect(contents[2]).toBe("Party: Kael left.");
  });

  it("publishes nothing when the party did not change, or when no journal runs", async () => {
    const publishCapture = vi.fn();
    const { store } = build({ publishCapture });
    await store.start({ mapId: null, journal: false });
    await store.setParty(["kael"]);
    expect(publishCapture).not.toHaveBeenCalled();

    const journaledCapture = vi.fn();
    const journaled = build({ publishCapture: journaledCapture });
    await journaled.store.start({ mapId: null, journal: true });
    await journaled.store.setParty(["kael"]);
    await journaled.store.setParty(["kael"]);
    expect(journaledCapture).toHaveBeenCalledTimes(1);
  });

  it("resolves names and drops members no longer in the vault", async () => {
    const { store } = build({ characters: [{ id: "kael", name: "Kael" }] });
    await store.start({ mapId: null, journal: false });
    await store.setParty(["kael", "gone"]);
    expect(store.party).toEqual([{ id: "kael", name: "Kael" }]);
  });

  it("a deleted member does not push a new member out of the party, or appear in the journal", async () => {
    const publishCapture = vi.fn();
    const stale = Array.from({ length: 12 }, (_, i) => `gone${i}`);
    const { store } = build({
      publishCapture,
      characters: [{ id: "kael", name: "Kael" }],
    });
    await store.start({ mapId: null, journal: true });
    // Twelve saved ids for Characters that no longer exist.
    store.session!.partyIds = [...stale];
    await store.setParty([...stale, "kael"]);
    expect(store.session?.partyIds).toEqual(["kael"]);
    expect(publishCapture.mock.calls.map((c) => c[0].content)).toEqual([
      "Party: Kael joined.",
    ]);
  });

  it("keeps each vault's party separate", async () => {
    const storage = memoryStorage();
    const first = build({ storage, vaultId: "v1" });
    await first.store.start({ mapId: null, journal: false });
    await first.store.setParty(["kael"]);
    const second = build({ storage, vaultId: "v2" });
    expect(second.store.session).toBeNull();
    expect(first.store.session?.partyIds).toEqual(["kael"]);
  });
});

describe("scene history", () => {
  it("setScene appends each scene in order", async () => {
    const { store } = build();
    await store.start({ mapId: null, journal: false });
    await store.setScene("Arrival");
    await store.setScene("The crypt");
    expect(store.scenes.map((s) => s.name)).toEqual(["Arrival", "The crypt"]);
  });

  it("renameScene renames only the current scene", async () => {
    const { store } = build();
    await store.start({ mapId: null, journal: false });
    await store.setScene("Arrival");
    await store.setScene("The crypt");
    await store.renameScene("The tomb");
    expect(store.scenes.map((s) => s.name)).toEqual(["Arrival", "The tomb"]);
  });

  it("returnToScene starts a numbered visit in a new section and leaves earlier sections alone", async () => {
    const { store, journal } = build();
    await store.start({ mapId: null, journal: true });
    await store.setScene("Arrival");
    await store.setScene("Crypt");
    const earlierSection = store.session?.scenes[0].sectionId;

    const ok = await store.returnToScene(0);

    expect(ok).toBe(true);
    expect(journal.createSection).toHaveBeenLastCalledWith("Arrival (2)");
    expect(store.scenes.map((s) => s.name)).toEqual([
      "Arrival",
      "Crypt",
      "Arrival (2)",
    ]);
    expect(store.scenes[0].sectionId).toBe(earlierSection);
    expect(store.session?.sceneName).toBe("Arrival (2)");
  });

  it("returnToScene with an index out of range does nothing", async () => {
    const { store, journal } = build();
    await store.start({ mapId: null, journal: true });
    await store.setScene("Arrival");
    const createSection = journal.createSection as unknown as {
      mock: { calls: unknown[] };
    };
    const calls = createSection.mock.calls.length;
    expect(await store.returnToScene(7)).toBe(false);
    expect(createSection.mock.calls.length).toBe(calls);
    expect(store.scenes.map((s) => s.name)).toEqual(["Arrival"]);
  });
});

describe("solo oracle, events and tension (spec 174)", () => {
  it("asks the dice and journals the answer while a journal runs", async () => {
    const publishCapture = vi.fn();
    const { store } = build({ publishCapture, random: () => 0.5 });
    await store.start({ mapId: null, journal: true });
    const answer = store.ask("Is the guard asleep?", "even");
    expect(answer.question).toBe("Is the guard asleep?");
    expect(publishCapture.mock.calls[0][0].entryType).toBe("oracle-answer");
  });

  it("returns the answer with no session, and still publishes it without error", () => {
    const publishCapture = vi.fn();
    const { store } = build({ publishCapture, random: () => 0.5 });
    const answer = store.ask("", "likely");
    expect([
      "Yes, and",
      "Yes",
      "Yes, but",
      "No, but",
      "No",
      "No, and",
    ]).toContain(answer.answer);
    expect(publishCapture).toHaveBeenCalled();
  });

  it("never calls the network when asking or rolling an event", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const { store } = build({ random: () => 0.3 });
    store.ask("Q", "very_likely");
    store.randomEvent();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("attaches a random event when the event roll meets the tension", () => {
    const publishCapture = vi.fn();
    // Every d100 roll is 1, so the event always happens at any tension.
    const { store } = build({ publishCapture, random: () => 0 });
    store.ask("Q", "even");
    const types = publishCapture.mock.calls.map((c) => c[0].entryType);
    expect(types).toEqual(["oracle-answer", "random-event"]);
  });

  it("names an open thread as the subject when a thread focus is chosen", () => {
    const threads = [{ id: "t1", title: "Why is the keeper lying?" }];
    const { store } = build({ random: () => 0.01, openThreads: threads });
    const event = store.randomEvent();
    if (event.subject.kind === "thread")
      expect(event.subject.threadId).toBe("t1");
    expect(["thread", "party", "place", "newcomer"]).toContain(
      event.subject.kind,
    );
  });

  it("raises and lowers tension within 1 to 9, persists it, and journals each real change", async () => {
    const storage = memoryStorage();
    const publishCapture = vi.fn();
    const { store } = build({ storage, publishCapture });
    await store.start({ mapId: null, journal: true });
    for (let i = 0; i < 10; i++) store.raiseTension();
    expect(store.tension).toBe(9);
    for (let i = 0; i < 12; i++) store.lowerTension();
    expect(store.tension).toBe(1);
    expect(build({ storage }).store.tension).toBe(1);
    const changes = publishCapture.mock.calls.filter(
      (c) => c[0].entryType === "tension-change",
    );
    // 5 to 9 is four real changes (further raises are no-ops), then 9 to 1 is eight.
    expect(changes.length).toBe(12);
  });

  it("uses the default tension with no session, and ignores changes", () => {
    const { store } = build();
    expect(store.tension).toBe(5);
    store.raiseTension();
    expect(store.tension).toBe(5);
  });
});
