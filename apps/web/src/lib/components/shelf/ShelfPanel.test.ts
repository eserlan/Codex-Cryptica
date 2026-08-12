import { describe, expect, it } from "vitest";
import { render } from "@testing-library/svelte";
import type { ShelfEntrySummary } from "@codex/entity-shelf";
import ShelfPanel from "./ShelfPanel.svelte";
import type { ShelfStore } from "$lib/features/shelf/shelf.svelte";

function entry(overrides: Partial<ShelfEntrySummary> = {}): ShelfEntrySummary {
  return {
    id: "entry-1",
    groupId: "group-1",
    sourceEntityId: "goblin",
    sourceVaultId: "vault-a",
    sourceVaultName: "Vault A",
    title: "Goblin",
    type: "creature",
    shelvedAt: Date.UTC(2026, 7, 12),
    byteSize: 4096,
    ...overrides,
  };
}

/** A stand-in with just the surface the panel reads. */
function fakeShelf(entries: ShelfEntrySummary[]): ShelfStore {
  return {
    entries,
    totalBytes: entries.reduce((sum, e) => sum + e.byteSize, 0),
    quotaBytes: null,
    busy: false,
    progress: null,
    lastOutcome: null,
    error: null,
    nearingStorageLimit: false,
    removeEntry: async () => {},
    clear: async () => {},
  } as unknown as ShelfStore;
}

describe("ShelfPanel", () => {
  it("explains what the Shelf is when it is empty", () => {
    const { getByTestId } = render(ShelfPanel, { shelf: fakeShelf([]) });

    const empty = getByTestId("shelf-empty");
    expect(empty.textContent).toMatch(/Nothing on the Shelf yet/i);
    expect(empty.textContent).toMatch(/Send to Shelf/i);
  });

  it("lists entries newest first, in one flat list (FR-026)", () => {
    const { getAllByTestId } = render(ShelfPanel, {
      shelf: fakeShelf([
        entry({ id: "newest", title: "Newest", shelvedAt: 3_000 }),
        entry({ id: "oldest", title: "Oldest", shelvedAt: 1_000 }),
      ]),
    });

    const cards = getAllByTestId("shelf-entry");
    expect(cards).toHaveLength(2);
    expect(cards[0].textContent).toContain("Newest");
    expect(cards[1].textContent).toContain("Oldest");
  });

  it("shows each entry's source vault and date (FR-022)", () => {
    const { getByTestId } = render(ShelfPanel, { shelf: fakeShelf([entry()]) });

    const card = getByTestId("shelf-entry");
    expect(card.textContent).toContain("Goblin");
    expect(card.textContent).toContain("creature");
    expect(card.textContent).toContain("Vault A");
  });

  it("discloses that the Shelf is browser-local and not a backup (FR-024)", () => {
    const { getByTestId } = render(ShelfPanel, { shelf: fakeShelf([entry()]) });

    // Collapsed: the copy wraps across lines in the markup.
    const copy = getByTestId("shelf-panel").textContent?.replace(/\s+/g, " ");
    expect(copy).toMatch(/lives in this browser/i);
    expect(copy).toMatch(/not a backup/i);
  });

  it("cannot import with nothing selected", () => {
    const { getByTestId } = render(ShelfPanel, { shelf: fakeShelf([entry()]) });

    expect(getByTestId("shelf-import").hasAttribute("disabled")).toBe(true);
  });

  it("never says “tags” in user-facing copy (principle XII)", () => {
    const { getByTestId } = render(ShelfPanel, { shelf: fakeShelf([entry()]) });

    expect(getByTestId("shelf-panel").textContent?.toLowerCase()).not.toContain(
      "tags",
    );
  });
});
