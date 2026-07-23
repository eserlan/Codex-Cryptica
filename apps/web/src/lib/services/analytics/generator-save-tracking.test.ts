import { describe, it, expect } from "vitest";
import {
  trackSaveToCodex,
  countRelatedEntities,
  bucketCount,
  type SaveToCodexInput,
} from "./generator-save-tracking";

function makeStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  };
}

const baseInput: SaveToCodexInput = {
  generatorType: "npc",
  isHubBatch: false,
  itemCount: 1,
  relatedEntityCount: 0,
};

describe("trackSaveToCodex", () => {
  it("marks the first-ever save as first_saved_entity and also fires vault_created", () => {
    const storage = makeStorage();
    const track = vi_track();

    trackSaveToCodex(baseInput, {
      storage,
      win: { zaraz: { track: track.fn } },
    });

    expect(track.eventNames()).toEqual(
      expect.arrayContaining(["entity_saved", "vault_created"]),
    );
    const [, savedProps] = track.callFor("entity_saved");
    expect(savedProps.is_first_saved_entity).toBe(true);
  });

  it("does not re-fire vault_created or is_first_saved_entity on subsequent saves", () => {
    const storage = makeStorage();
    trackSaveToCodex(baseInput, {
      storage,
      win: { zaraz: { track: () => {} } },
    });

    const track = vi_track();
    trackSaveToCodex(baseInput, {
      storage,
      win: { zaraz: { track: track.fn } },
    });

    expect(track.eventNames()).not.toContain("vault_created");
    const [, savedProps] = track.callFor("entity_saved");
    expect(savedProps.is_first_saved_entity).toBe(false);
  });

  it("only fires related_entity_created when relatedEntityCount > 0", () => {
    const storage = makeStorage();
    const track = vi_track();

    trackSaveToCodex(
      { ...baseInput, relatedEntityCount: 3 },
      { storage, win: { zaraz: { track: track.fn } } },
    );

    expect(track.eventNames()).toContain("related_entity_created");
    const [, props] = track.callFor("related_entity_created");
    expect(props.related_entity_count).toBe("2-5");
  });

  it("never fires related_entity_created when the count is 0", () => {
    const storage = makeStorage();
    const track = vi_track();

    trackSaveToCodex(baseInput, {
      storage,
      win: { zaraz: { track: track.fn } },
    });

    expect(track.eventNames()).not.toContain("related_entity_created");
  });

  it("persists the has-saved flag under its own dedicated key, distinct from attribution", () => {
    const storage = makeStorage();
    trackSaveToCodex(baseInput, {
      storage,
      win: { zaraz: { track: () => {} } },
    });

    expect(storage.getItem("codex-cryptica-has-saved-to-vault")).toBe("true");
    expect(storage.getItem("codex-cryptica-attribution-first")).toBeNull();
    expect(storage.getItem("codex-cryptica-attribution-latest")).toBeNull();
  });
});

describe("bucketCount", () => {
  it("buckets into stable, low-cardinality labels", () => {
    expect(bucketCount(0)).toBe("0");
    expect(bucketCount(1)).toBe("1");
    expect(bucketCount(2)).toBe("2-5");
    expect(bucketCount(5)).toBe("2-5");
    expect(bucketCount(6)).toBe("6+");
    expect(bucketCount(100)).toBe("6+");
  });
});

describe("countRelatedEntities", () => {
  it("counts wiki-links in content", () => {
    expect(
      countRelatedEntities(
        "Lives in [[Kingdom of Aethel]] and knows [[Eldrin the Wise]].",
        undefined,
      ),
    ).toBe(2);
  });

  it("adds explicit references on top of wiki-links", () => {
    expect(
      countRelatedEntities("Knows [[Eldrin]].", ["Kingdom of Aethel"]),
    ).toBe(2);
  });

  it("returns 0 for content with no links and no references", () => {
    expect(countRelatedEntities("Just a lone wanderer.", undefined)).toBe(0);
    expect(countRelatedEntities(undefined, undefined)).toBe(0);
  });
});

// Small local helper to keep the vi.fn()-based call tracking terse and
// readable across the tests above (avoids repeating .mock.calls.find(...)).
function vi_track() {
  const calls: Array<[string, Record<string, unknown>]> = [];
  const fn = (name: string, props: Record<string, unknown>) => {
    calls.push([name, props]);
  };
  return {
    fn,
    eventNames: () => calls.map(([name]) => name),
    callFor: (name: string) => {
      const found = calls.find(([n]) => n === name);
      if (!found) throw new Error(`No tracked event named "${name}"`);
      return found;
    },
  };
}
