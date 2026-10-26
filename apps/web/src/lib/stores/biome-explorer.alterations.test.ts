import { describe, expect, it, vi } from "vitest";
import { makeStore } from "./biome-explorer.test-helpers";
import { BIOME_AI_NOTICE_KEY } from "./biome-explorer.svelte";
import { HINT_KEYS } from "$lib/config/help-content";

const goodJson = JSON.stringify({
  suggestions: [
    { effect: "Rivers run grey", plausibilityNote: "Ash clouds water." },
    { effect: "Ferns spread", plausibilityNote: "Ash enriches soil." },
  ],
});

function started(overrides = {}) {
  const made = makeStore(overrides);
  made.store.startFromReference("tundra");
  const id = made.store.addAlteration({
    aspect: "climate",
    description: "It rains ash",
  })!;
  return { ...made, id };
}

describe("BiomeExplorerStore alterations", () => {
  it("adds, edits and removes a fictional change and marks the draft dirty", () => {
    const { store, id } = started();
    expect(store.draft?.profile.alterations).toHaveLength(1);
    expect(store.draft?.dirty).toBe(true);
    store.updateAlteration(id, { cause: "A sleeping volcano" });
    expect(store.draft?.profile.alterations[0].cause).toBe(
      "A sleeping volcano",
    );
    store.removeAlteration(id);
    expect(store.draft?.profile.alterations).toEqual([]);
  });

  it("rejects an empty description without changing the draft", () => {
    const { store } = makeStore();
    store.startBlank();
    expect(
      store.addAlteration({ aspect: "water", description: "   " }),
    ).toBeNull();
    expect(store.draft?.profile.alterations).toEqual([]);
  });

  it("reminds about a missing cause but still saves", async () => {
    const { store, vault, id } = started();
    expect(store.reminderFor(id)).toMatch(/Say what causes this change/);
    store.setTitle("Ashen Flats");
    expect(await store.save()).toBe(true);
    expect(
      store.warnings.some((w) => w.code === "alteration-missing-cause"),
    ).toBe(true);
    expect([...vault.records.values()][0].profile.alterations).toHaveLength(1);
    expect([...vault.records.values()][0].content).toContain(
      "## Fictional alterations",
    );
    store.updateAlteration(id, { cause: "A sleeping volcano" });
    expect(store.reminderFor(id)).toBeNull();
  });

  it("keeps the alteration out of the reference snapshot", () => {
    const { store } = started();
    expect(store.draft?.profile.reference?.biomeId).toBe("tundra");
    expect(JSON.stringify(store.draft?.profile.reference)).not.toContain(
      "It rains ash",
    );
  });
});

describe("BiomeExplorerStore AI suggestions", () => {
  it("is unavailable without a runner or when AI is not allowed", () => {
    expect(makeStore().store.canSuggest).toBe(false);
    expect(
      makeStore({ suggest: async () => goodJson, isAiAllowed: () => false })
        .store.canSuggest,
    ).toBe(false);
    expect(makeStore({ suggest: async () => goodJson }).store.canSuggest).toBe(
      true,
    );
  });

  it("proposes effects and changes nothing until one is accepted", async () => {
    const { store, id } = started({ suggest: async () => goodJson });
    await store.requestSuggestions(id);
    const state = store.suggestions[id];
    expect(state.status === "done" && state.items).toHaveLength(2);
    expect(store.draft?.profile.alterations[0].effects).toEqual([]);

    store.acceptSuggestion(id, 0);
    const alteration = store.draft!.profile.alterations[0];
    expect(alteration.effects).toEqual(["Rivers run grey"]);
    expect(alteration.aiAssisted).toBe(true);
    const after = store.suggestions[id];
    expect(after.status === "done" && after.items.map((i) => i.effect)).toEqual(
      ["Ferns spread"],
    );
  });

  it("dismisses a proposal without adding it", async () => {
    const { store, id } = started({ suggest: async () => goodJson });
    await store.requestSuggestions(id);
    store.dismissSuggestion(id, 0);
    store.dismissSuggestion(id, 0);
    expect(store.suggestions[id]).toBeUndefined();
    expect(store.draft?.profile.alterations[0].effects).toEqual([]);
    expect(store.draft?.profile.alterations[0].aiAssisted).toBeUndefined();
  });

  it("says plainly when the helper fails, and leaves the draft alone", async () => {
    const { store, id } = started({
      suggest: async () => {
        throw new Error("offline");
      },
    });
    await store.requestSuggestions(id);
    const state = store.suggestions[id];
    expect(state.status === "error" && state.message).toMatch(
      /isn't available right now/,
    );
    expect(store.draft?.profile.alterations[0].effects).toEqual([]);
  });

  it("reports an unusable answer", async () => {
    const { store, id } = started({ suggest: async () => "not json" });
    await store.requestSuggestions(id);
    const state = store.suggestions[id];
    expect(state.status === "error" && state.message).toMatch(/couldn't use/);
  });

  it("cancels a request in flight and clears its state", async () => {
    let release: (value: string) => void = () => {};
    const suggest = vi.fn(
      ({ signal }: { signal?: AbortSignal }) =>
        new Promise<string>((resolve, reject) => {
          release = resolve;
          signal?.addEventListener("abort", () =>
            reject(new DOMException("a", "AbortError")),
          );
        }),
    );
    const { store, id } = started({ suggest });
    const pending = store.requestSuggestions(id);
    expect(store.suggestions[id]).toEqual({ status: "loading" });
    store.cancelSuggestions(id);
    await pending;
    expect(store.suggestions[id]).toBeUndefined();
    release(goodJson);
  });

  it("does nothing when the helper is switched off between click and answer", async () => {
    let allowed = true;
    const { store, id } = started({
      suggest: async () => goodJson,
      isAiAllowed: () => allowed,
    });
    allowed = false;
    await store.requestSuggestions(id);
    const state = store.suggestions[id];
    expect(state.status === "error" && state.message).toMatch(/turned off/);
  });

  it("forgets proposals when a new draft starts", async () => {
    const { store, id } = started({ suggest: async () => goodJson });
    await store.requestSuggestions(id);
    store.startBlank();
    expect(store.suggestions).toEqual({});
  });
});

describe("BiomeExplorerStore AI notice", () => {
  it("shows once, remembers on this device and tolerates broken storage", () => {
    expect(BIOME_AI_NOTICE_KEY).toBe(HINT_KEYS.BIOME_AI_NOTICE);
    const { store, storage } = makeStore();
    expect(store.aiNoticeSeen).toBe(false);
    store.dismissAiNotice();
    expect(store.aiNoticeSeen).toBe(true);
    expect(storage.setItem).toHaveBeenCalledWith(BIOME_AI_NOTICE_KEY, "1");

    const again = makeStore({ storage });
    expect(again.store.aiNoticeSeen).toBe(true);

    const broken = makeStore({
      storage: {
        getItem() {
          throw new Error("blocked");
        },
        setItem() {
          throw new Error("blocked");
        },
        removeItem() {},
      },
    });
    expect(broken.store.aiNoticeSeen).toBe(false);
    expect(() => broken.store.dismissAiNotice()).not.toThrow();
  });
});
