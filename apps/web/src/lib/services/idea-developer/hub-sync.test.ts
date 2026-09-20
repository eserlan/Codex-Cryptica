// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { toHubDraft } from "generator-engine";
import type { Development } from "generator-engine";
import { SessionHubStore } from "$lib/stores/session-hub.svelte";
import { sessionHubStore } from "$lib/stores/session-hub.svelte";
import { getSessionContext } from "$lib/services/seo/session-context";
import { HubSync } from "./hub-sync";
import type { StorageLike } from "$lib/utils/runtime-deps";

const dev: Development = {
  mode: "develop",
  alreadyInteresting: "Everything is made from dragon parts.",
  centralQuestion: "Where do the parts come from?",
  makeItMove: "The last shipment is late.",
  peopleWhoCare: [
    { name: "Mara", role: "Smith", wants: "Scales", conflictsWith: "Warden" },
    { name: "Warden", role: "Guard", wants: "Peace", conflictsWith: "Mara" },
  ],
  playerDirections: [
    { title: "Follow it", description: "Trace it." },
    { title: "Search it", description: "Find it." },
  ],
  consequences: "The town runs dry.",
  creatorQuestions: ["Who?", "Why?"],
  generatorSuggestions: [],
};

const idea = "A town where everything is made from dragon parts.";

function memoryStorage(): StorageLike {
  const data = new Map<string, string>();
  return {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
    length: 0,
    key: () => null,
  };
}

function freshHub() {
  let n = 0;
  return new SessionHubStore({ uuid: () => `id-${++n}` }, memoryStorage());
}

describe("HubSync", () => {
  it("adds one draft for a conversation and returns its id", () => {
    const hub = freshHub();
    const sync = new HubSync(hub);
    const id = sync.add(dev, idea);
    expect(hub.entities).toHaveLength(1);
    expect(hub.entities[0].id).toBe(id);
    expect(hub.entities[0].labels).toEqual(["idea-developer", "develop"]);
    expect(hub.entities[0].reuseEnabled).toBe(true);
  });

  it("adds a separate draft for a second conversation", () => {
    const hub = freshHub();
    const sync = new HubSync(hub);
    sync.add(dev, idea);
    sync.add(dev, "Another idea.");
    expect(hub.entities).toHaveLength(2);
  });

  it("updates the same draft in place instead of adding another", () => {
    const hub = freshHub();
    const sync = new HubSync(hub);
    const id = sync.add(dev, idea);
    const changed = { ...dev, centralQuestion: "Who wants the dragons back?" };
    expect(sync.update(id, changed, idea)).toBe(true);
    expect(hub.entities).toHaveLength(1);
    expect(hub.entities[0].content).toContain("Who wants the dragons back?");
    expect(hub.entities[0].summary).toBe(toHubDraft(changed, idea).summary);
  });

  it("reports false when updating a draft that is gone", () => {
    const sync = new HubSync(freshHub());
    expect(sync.update("missing", dev, idea)).toBe(false);
  });

  it("removes a draft and reports whether it exists", () => {
    const hub = freshHub();
    const sync = new HubSync(hub);
    const id = sync.add(dev, idea);
    expect(sync.exists(id)).toBe(true);
    sync.remove(id);
    expect(sync.exists(id)).toBe(false);
    expect(hub.entities).toHaveLength(0);
    expect(() => sync.remove(id)).not.toThrow();
  });

  it("looks a draft up for saving", () => {
    const hub = freshHub();
    const sync = new HubSync(hub);
    const id = sync.add(dev, idea);
    expect(sync.get(id)?.title).toMatch(/^A town where everything/);
    expect(sync.get("missing")).toBeUndefined();
  });
});

describe("hub drafts as context for other generators (FR-014)", () => {
  beforeEach(() => sessionHubStore.clear());

  it("shows the idea to generators through getSessionContext", () => {
    const sync = new HubSync(sessionHubStore);
    sync.add(dev, idea);
    const context = getSessionContext();
    expect(context).toContain(
      "A town where everything is made from dragon parts.",
    );
    expect(context).toContain("(note)");
  });

  it("stops offering the draft when reuse is turned off", () => {
    const sync = new HubSync(sessionHubStore);
    const id = sync.add(dev, idea);
    sessionHubStore.updateEntity(id, { reuseEnabled: false });
    expect(getSessionContext()).toBe("");
  });
});
