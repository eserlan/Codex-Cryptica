import { describe, expect, it, vi } from "vitest";
import { SETTINGS_PANEL_IDS } from "help-engine";
import { HelpAssistantStore } from "$lib/stores/help-assistant/help-assistant.svelte";
import { HelpContextStore } from "$lib/stores/help-assistant/help-context.svelte";
import { HelpSurfaceRegistry } from "$lib/stores/help-assistant/help-surface.svelte";
import { HelpClient } from "./help-client";
import type { VttHelpFacts } from "help-engine";

/**
 * Drives the real store, context builder and client end to end with a screen
 * that is full of names and identifiers, and inspects the bytes that would go
 * over the wire.
 */
async function capture(question: string) {
  const surfaces = new HelpSurfaceRegistry();
  surfaces.registerEntityDetail({
    entityKind: () => "Oakvale, the Red Hand's hideout",
    activeTab: () => "connections",
    isEditing: () => false,
    canAddConnection: () => true,
    openTab: () => {},
  });
  const context = new HelpContextStore({
    getRouteId: () =>
      "/vault/3f2a9c1e-7b1d-4f6a-9c3e-0a1b2c3d4e5f/entity/9b1c77aa",
    surfaces,
    isGeneratorOpen: () => false,
    generatorsAvailable: () => true,
    getOpenSettingsTab: () => null,
    isGuestMode: () => false,
  });

  const fetcher = vi.fn(
    async () =>
      new Response(
        JSON.stringify({
          outcome: "no-match",
          answer: "x",
          sources: [],
          action: null,
          suggestions: [],
        }),
        { status: 200 },
      ),
  );
  const client = new HelpClient({
    fetcher: fetcher as never,
    getToken: async () => "tok",
    proxyUrl: "https://proxy.test",
    isOnline: () => true,
  });
  const store = new HelpAssistantStore({
    client,
    context,
    fallback: () => ({ message: "x", topics: [], showLibrary: true }),
    helpIds: () => new Set(),
  });
  await store.ask(question);
  const [, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
  return {
    raw: init.body as string,
    body: JSON.parse(init.body as string),
    init,
  };
}

describe("what leaves the browser when asking for help", () => {
  it("is exactly the question, the capped history, and the agreed screen description", async () => {
    const { body } = await capture(
      "How do I connect the faction I just created?",
    );
    expect(Object.keys(body).sort()).toEqual([
      "context",
      "history",
      "question",
    ]);
    expect(Object.keys(body.context).sort()).toEqual([
      "area",
      "availableActions",
      "entityKind",
      "flags",
      "mode",
      "routeTemplate",
      "surface",
      "tab",
      "v",
    ]);
  });

  it("contains no entry names, categories the user invented, or identifiers", async () => {
    const { raw } = await capture(
      "How do I connect the faction I just created?",
    );
    expect(raw).not.toMatch(/Oakvale|Red Hand|hideout/i);
    expect(raw).not.toMatch(/3f2a9c1e|9b1c77aa/);
    expect(raw).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}/);
  });

  it("sends a route template and a collapsed category, never a resolved path or custom name", async () => {
    const { body } = await capture("What is this?");
    expect(body.context.routeTemplate).toBe("unknown");
    expect(body.context.entityKind).toBe("custom");
  });

  it("sends only the typed question as free text", async () => {
    const { body } = await capture("What does Connections do?");
    const textFields: string[] = [];
    (function walk(value: unknown) {
      if (typeof value === "string") textFields.push(value);
      else if (value && typeof value === "object")
        Object.values(value).forEach(walk);
    })(body);
    const allowed = new Set([
      "What does Connections do?",
      // schema enums and template tokens, never user text
      "unknown",
      "custom",
      "entity-detail",
      "connections",
      "view",
      "vault",
      "connections-editable",
      "generators",
      "status-tab",
      "connections-tab",
      "stats-tab",
      "timeline-tab",
      // closed catalogue ids for the Settings tabs
      ...SETTINGS_PANEL_IDS,
    ]);
    expect(textFields.filter((t) => !allowed.has(t))).toEqual([]);
  });

  it("keeps the capability token in the Authorization header, never in the body", async () => {
    const { raw, init } = await capture("anything");
    expect(raw).not.toContain("tok");
    expect((init.headers as Headers).get("Authorization")).toBe("Bearer tok");
  });
});

describe("what leaves the browser when asking for help on the map", () => {
  async function askOnMap(facts: VttHelpFacts) {
    const surfaces = new HelpSurfaceRegistry();
    surfaces.registerVttMap({ facts: () => facts });
    const context = new HelpContextStore({
      getRouteId: () => "/(app)/map",
      surfaces,
      isGeneratorOpen: () => false,
      generatorsAvailable: () => false,
      getOpenSettingsTab: () => null,
      isGuestMode: () => facts.guest,
    });
    const fetcher = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            outcome: "no-match",
            answer: "x",
            sources: [],
            action: null,
            suggestions: [],
          }),
          { status: 200 },
        ),
    );
    const store = new HelpAssistantStore({
      client: new HelpClient({
        fetcher: fetcher as never,
        getToken: async () => "tok",
        proxyUrl: "https://proxy.test",
        isOnline: () => true,
      }),
      context,
      fallback: () => ({ message: "x", topics: [], showLibrary: true }),
      helpIds: () => new Set(),
    });
    await store.ask("Why can't I move this?");
    const [, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    return JSON.parse(init.body as string);
  }

  const facts = (over: Partial<VttHelpFacts> = {}): VttHelpFacts => ({
    vttOn: true,
    combat: true,
    guest: false,
    playerView: false,
    grid: "hex",
    fogOn: true,
    tokenSelected: true,
    tokenLinked: true,
    tokenManageable: true,
    layer: "object",
    hasInitiative: true,
    canAdvanceTurn: true,
    hosting: true,
    measuring: false,
    ...over,
  });

  it("adds yes/no VTT facts and nothing else to the screen description", async () => {
    const body = await askOnMap(facts());

    expect(Object.keys(body.context).sort()).toEqual([
      "area",
      "availableActions",
      "entityKind",
      "flags",
      "mode",
      "routeTemplate",
      "surface",
      "tab",
      "v",
    ]);
    expect(body.context.area).toBe("map");
    expect(body.context.flags).toContain("vtt-token-selected");
    expect(
      body.context.flags.every((flag: string) =>
        /^[a-z]+(-[a-z]+)*$/.test(flag),
      ),
    ).toBe(true);
  });

  it("gives a player's request nothing that only the GM may know", async () => {
    const body = await askOnMap(
      facts({
        guest: true,
        layer: null,
        hosting: false,
        tokenLinked: false,
        tokenManageable: false,
      }),
    );

    expect(body.context.flags).toContain("vtt-guest");
    expect(body.context.flags).not.toContain("vtt-hosting");
    expect(body.context.flags).not.toContain("vtt-token-linked");
    expect(
      body.context.flags.filter((flag: string) =>
        flag.startsWith("vtt-layer-"),
      ),
    ).toEqual([]);
  });

  it("stays bounded however many facts are true", async () => {
    const body = await askOnMap(
      facts({ playerView: true, measuring: true, guest: true }),
    );

    expect(body.context.flags.length).toBeLessThanOrEqual(28);
    expect(JSON.stringify(body).length).toBeLessThan(2000);
  });
});
