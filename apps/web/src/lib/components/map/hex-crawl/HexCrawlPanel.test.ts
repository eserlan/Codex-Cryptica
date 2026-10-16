/** @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { hexToPoint } from "map-engine";
import type { HexCrawlState } from "hex-crawl-engine";
import { HexCrawlStore } from "$lib/stores/hex-crawl/hex-crawl.svelte";

const mapStoreMock = vi.hoisted(() => ({
  addPin: vi.fn(async () => undefined),
}));
vi.mock("$lib/stores/map.svelte", () => ({ mapStore: mapStoreMock }));

const vaultMock = vi.hoisted(() => ({
  createEntity: vi.fn(async () => "entity-new"),
}));
vi.mock("$lib/stores/vault.svelte", () => ({ vault: vaultMock }));

const modalMock = vi.hoisted(() => ({ openZenMode: vi.fn() }));
vi.mock("$lib/stores/ui/modal-ui.svelte", () => ({ modalUIStore: modalMock }));

import HexCrawlPanel from "./HexCrawlPanel.svelte";
import { HEX_HINT_KEY } from "./hex-crawl-hint";

const GRID = {
  orientation: "pointy",
  size: 50,
  offsetX: 0,
  offsetY: 0,
} as const;
const LABELS = {
  style: "alphanumeric",
  startCol: "A",
  startRow: 1,
  rowPadding: 2,
} as const;
const HEX = { q: 0, r: 0 };

type MapLike = { id: string; hexCrawl: HexCrawlState; [key: string]: unknown };

function makeHarness(
  options: { hexes?: HexCrawlState["hexes"]; enabled?: boolean } = {},
) {
  const map: MapLike = {
    id: "map-1",
    hexCrawl: { enabled: options.enabled ?? true, hexes: options.hexes ?? {} },
  };
  const store = new HexCrawlStore({
    getMap: (id) => (id === "map-1" ? (map as never) : undefined),
    saveMaps: vi.fn(async () => true),
    clock: { now: () => 1000 },
    publishCapture: vi.fn(),
    isGM: () => true,
    isGuest: () => false,
  });
  return { map, store };
}

function memoryStorage(initial: Record<string, string> = {}) {
  const data: Record<string, string> = { ...initial };
  return {
    getItem: (key: string) => data[key] ?? null,
    setItem: (key: string, value: string) => {
      data[key] = value;
    },
    data,
  };
}

function discoveryStub(overrides: Record<string, unknown> = {}) {
  const controls = {
    retry: vi.fn(async () => undefined),
    rollTables: vi.fn(async () => undefined),
    regenerate: vi.fn(async () => undefined),
    discardPart: vi.fn(async () => undefined),
    discardDraft: vi.fn(async () => undefined),
    saveEntityPart: vi.fn(async () => undefined),
    saveNotePart: vi.fn(async () => undefined),
    saveFactionPart: vi.fn(async () => undefined),
  };
  return {
    explore: vi.fn(async (_signal: AbortSignal) => ({})),
    controls,
    proposedLink: null,
    factionMatch: null,
    aiEnabled: false,
    ...overrides,
  };
}

function renderPanel(
  store: HexCrawlStore,
  props: Record<string, unknown> = {},
) {
  return render(HexCrawlPanel, {
    store,
    mapId: "map-1",
    hex: HEX,
    isGM: true,
    isGuest: false,
    revealed: true,
    labelConfig: LABELS,
    orientation: "pointy",
    gridConfig: GRID,
    pins: [],
    entities: [{ id: "e-smith", title: "Smith Brann", type: "npc" }],
    discovery: null,
    storage: memoryStorage(),
    ...props,
  });
}

describe("HexCrawlPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });
  afterEach(() => {
    vi.clearAllTimers();
  });

  describe("contents and state", () => {
    it("shows the hex label, state chip, terrain, notes and contents", () => {
      const { store } = makeHarness({
        hexes: {
          "0,0": { terrain: { kind: "preset", id: "forest" }, updatedAt: 1 },
        },
      });
      renderPanel(store);

      expect(screen.getByRole("region", { name: "A01" })).toBeTruthy();
      expect(screen.getByText("Seen")).toBeTruthy();
      expect(screen.getByText("Current: Forest")).toBeTruthy();
      expect(screen.getByLabelText("Your notes")).toBeTruthy();
      expect(screen.getByText("In this hex")).toBeTruthy();
    });

    it("shows Unknown when the fog covers the hex centre", () => {
      const { store } = makeHarness();
      renderPanel(store, { revealed: false });

      expect(screen.getByText("Unknown")).toBeTruthy();
    });

    it("persists a preset terrain through the store", async () => {
      const { store, map } = makeHarness();
      renderPanel(store);

      await fireEvent.click(screen.getByRole("button", { name: "Forest" }));

      await waitFor(() =>
        expect(map.hexCrawl.hexes["0,0"]?.terrain).toEqual({
          kind: "preset",
          id: "forest",
        }),
      );
    });

    it("persists custom terrain through the store", async () => {
      const { store, map } = makeHarness();
      renderPanel(store);

      await fireEvent.click(screen.getByRole("button", { name: "Custom…" }));
      await fireEvent.input(screen.getByLabelText("Custom terrain name"), {
        target: { value: "Ash fields" },
      });
      await fireEvent.click(
        screen.getByRole("button", { name: "Use custom terrain" }),
      );

      await waitFor(() =>
        expect(map.hexCrawl.hexes["0,0"]?.terrain).toEqual({
          kind: "custom",
          label: "Ash fields",
        }),
      );
    });

    it("attaches a searched entity at the hex centre", async () => {
      const { store } = makeHarness();
      renderPanel(store);

      await fireEvent.input(screen.getByLabelText("Search entities"), {
        target: { value: "smith" },
      });
      await fireEvent.click(
        screen.getByRole("button", { name: "Attach Smith Brann" }),
      );

      expect(mapStoreMock.addPin).toHaveBeenCalledWith(
        "e-smith",
        hexToPoint(HEX, GRID),
      );
    });

    it("creates an entity here, pins it and opens it", async () => {
      const { store } = makeHarness();
      renderPanel(store);

      await fireEvent.change(screen.getByLabelText("Entity type"), {
        target: { value: "event" },
      });
      await fireEvent.input(screen.getByLabelText("New entity title"), {
        target: { value: "Ambush" },
      });
      await fireEvent.click(
        screen.getByRole("button", { name: "Create entity here" }),
      );

      await waitFor(() =>
        expect(modalMock.openZenMode).toHaveBeenCalledWith("entity-new"),
      );
      expect(vaultMock.createEntity).toHaveBeenCalledWith("event", "Ambush");
      expect(mapStoreMock.addPin).toHaveBeenCalledWith(
        "entity-new",
        hexToPoint(HEX, GRID),
      );
    });

    it("closes on Escape and returns focus to the opener", async () => {
      const { store } = makeHarness();
      const opener = document.createElement("button");
      document.body.appendChild(opener);
      opener.focus();
      store.openHex("map-1", HEX, opener);
      renderPanel(store);

      await fireEvent.keyDown(screen.getByRole("region", { name: "A01" }), {
        key: "Escape",
      });

      expect(store.selectedHex).toBeNull();
      expect(document.activeElement).toBe(opener);
      opener.remove();
    });

    it("renders nothing for a guest or a non-GM", () => {
      const { store } = makeHarness();
      const guest = renderPanel(store, { isGuest: true });
      expect(screen.queryByRole("region")).toBeNull();
      expect(guest.container.textContent?.trim() ?? "").toBe("");
      guest.unmount();

      renderPanel(store, { isGM: false });
      expect(screen.queryByRole("region")).toBeNull();
    });
  });

  describe("exploration", () => {
    it("offers Explore as the primary action for an unknown hex", async () => {
      const { store } = makeHarness();
      const discovery = discoveryStub();
      renderPanel(store, { revealed: false, discovery });

      await fireEvent.click(screen.getByRole("button", { name: "Explore" }));
      expect(discovery.explore).toHaveBeenCalledWith(expect.any(AbortSignal));
    });

    it("keeps Explore available for an explored hex", () => {
      const { store } = makeHarness({
        hexes: { "0,0": { explored: true, exploredAt: 1, updatedAt: 1 } },
      });
      renderPanel(store, { discovery: discoveryStub() });

      expect(screen.getByRole("button", { name: "Explore" })).toBeTruthy();
    });

    it("opens a pending draft with Review discovery without generating", async () => {
      const draft = {
        source: "tables" as const,
        createdAt: 1,
        parts: Object.fromEntries(
          [
            "landmark",
            "encounter",
            "hazard",
            "secret",
            "factionPresence",
            "atmosphere",
          ].map((id) => [
            id,
            { text: `${id} text`, source: "tables", status: "pending" },
          ]),
        ) as never,
      };
      const { store } = makeHarness({
        hexes: { "0,0": { draft, updatedAt: 1 } },
      });
      const discovery = discoveryStub();
      renderPanel(store, { discovery });

      expect(screen.queryByRole("button", { name: "Explore" })).toBeNull();
      await fireEvent.click(
        screen.getByRole("button", { name: "Review discovery" }),
      );
      expect(discovery.explore).not.toHaveBeenCalled();
      expect(
        screen.getByRole("region", { name: "Discovery review" }),
      ).toBeTruthy();
    });

    it("shows no Explore action in a guest vault", () => {
      const { store } = makeHarness();
      renderPanel(store, { discovery: null, isGuest: false });

      expect(screen.queryByRole("button", { name: "Explore" })).toBeNull();
    });

    it("aborts generation and saves nothing when the panel closes", async () => {
      const { store, map } = makeHarness();
      let seen: AbortSignal | undefined;
      const discovery = discoveryStub({
        explore: vi.fn(
          (signal: AbortSignal) =>
            new Promise(() => {
              seen = signal;
            }),
        ),
      });
      store.openHex("map-1", HEX);
      renderPanel(store, { discovery });

      await fireEvent.click(screen.getByRole("button", { name: "Explore" }));
      await fireEvent.keyDown(screen.getByRole("region", { name: "A01" }), {
        key: "Escape",
      });

      expect(seen?.aborted).toBe(true);
      expect(map.hexCrawl.hexes["0,0"]?.draft).toBeUndefined();
    });
  });

  describe("explored marking", () => {
    it("marks a hex explored, and the chip and button follow", async () => {
      const { store, map } = makeHarness();
      renderPanel(store);

      await fireEvent.click(
        screen.getByRole("button", { name: "Mark explored" }),
      );

      await waitFor(() =>
        expect(map.hexCrawl.hexes["0,0"]?.explored).toBe(true),
      );
      expect(
        await screen.findByRole("button", { name: "Mark unexplored" }),
      ).toBeTruthy();
      expect(screen.getByText("Explored")).toBeTruthy();
    });
  });

  describe("first-use hint", () => {
    it("shows on first open and stays dismissed afterwards", async () => {
      const { store } = makeHarness();
      const storage = memoryStorage();
      const first = renderPanel(store, { storage });

      expect(screen.getByRole("note")).toBeTruthy();
      await fireEvent.click(screen.getByRole("button", { name: "Got it" }));
      expect(storage.data[HEX_HINT_KEY]).toBe("1");
      first.unmount();

      renderPanel(store, { storage });
      expect(screen.queryByRole("note")).toBeNull();
    });
  });
});
