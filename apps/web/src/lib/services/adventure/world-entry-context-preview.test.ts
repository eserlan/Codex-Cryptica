import { describe, expect, it } from "vitest";
import { DEFAULT_CALENDAR } from "chronology-engine";
import type { Entity } from "schema";
import { resolveWorldEntryPreview } from "./world-entry-context-preview";

function entity(
  id: string,
  type: string,
  extras: Partial<Entity> = {},
): Entity {
  return {
    id,
    type,
    title: id,
    content: "Public description",
    labels: [],
    aliases: [],
    connections: [],
    status: "active",
    ...extras,
  } as Entity;
}
function link(target: string, hidden = false) {
  return { target, type: "associated", strength: 1, label: "link", hidden };
}
const sources = [
  entity("pc", "character", { connections: [link("village")] }),
  entity("village", "location", {
    connections: [link("ruler"), link("future"), link("secret-link", true)],
  }),
  entity("ruler", "character", {
    start_date: { year: 600 },
    end_date: { year: 620 },
    lore: "GM-only identity",
  }),
  entity("future", "event", {
    date: { year: 625 },
    title: "Secret future invasion",
  }),
  entity("secret-link", "note", { title: "Linked only by secret" }),
  entity("hidden", "character", {
    visibility: "hidden",
    connections: [link("village")],
    title: "Hidden villain",
  }),
  entity("far-away", "location", { title: "Unrelated continent" }),
];

describe("resolveWorldEntryPreview", () => {
  it("shows only bounded relevant canonical references at a chosen year", () => {
    const preview = resolveWorldEntryPreview({
      entities: sources,
      calendar: DEFAULT_CALENDAR,
      characterId: "pc",
      locationId: "village",
      at: { year: 618 },
    });
    const content = JSON.stringify(preview);
    expect(preview.dated).toBe(true);
    expect(preview.records.map((item) => item.id)).toContain("ruler");
    for (const secret of [
      "Secret future invasion",
      "Hidden villain",
      "GM-only identity",
      "Linked only by secret",
      "Unrelated continent",
    ]) {
      expect(content).not.toContain(secret);
    }
    expect(preview.counts.people).toBeGreaterThan(0);
  });

  it("does not pretend undated neighbours were present at the chosen time", () => {
    const preview = resolveWorldEntryPreview({
      entities: sources,
      calendar: DEFAULT_CALENDAR,
      locationId: "village",
    });
    expect(preview.dated).toBe(false);
    expect(
      preview.records.every((record) => record.applicability === "uncertain"),
    ).toBe(true);
    expect(JSON.stringify(preview)).not.toContain("Secret future invasion");
  });

  it("supports provisional starts and bounds large connected Vaults", () => {
    const large = [
      entity("village", "location"),
      ...Array.from({ length: 400 }, (_, i) =>
        entity("character-" + i, "character", {
          connections: [link("village")],
        }),
      ),
    ];
    const preview = resolveWorldEntryPreview({
      entities: large,
      calendar: DEFAULT_CALENDAR,
      locationId: "village",
      maxRecords: 12,
    });
    expect(preview.records).toHaveLength(12);
    expect(preview.omitted).toBe(389);
    expect(
      resolveWorldEntryPreview({ entities: [], calendar: DEFAULT_CALENDAR })
        .records,
    ).toEqual([]);
  });
});
