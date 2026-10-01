import { describe, expect, it, vi } from "vitest";
import { SETTINGS_PANEL_IDS } from "help-engine";
import { HelpAssistantStore } from "$lib/stores/help-assistant/help-assistant.svelte";
import { HelpContextStore } from "$lib/stores/help-assistant/help-context.svelte";
import { HelpSurfaceRegistry } from "$lib/stores/help-assistant/help-surface.svelte";
import { HelpClient } from "./help-client";

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
