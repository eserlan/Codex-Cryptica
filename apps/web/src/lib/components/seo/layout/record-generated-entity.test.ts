/** @vitest-environment jsdom */
import { describe, expect, it, vi } from "vitest";
import { recordGeneratedEntity } from "./record-generated-entity";

function makeHub() {
  return {
    addEntity: vi.fn(() => "entity-1"),
    addProvenance: vi.fn(),
  };
}

const context = { entities: [], trimmed: false } as never;
const base = {
  type: "character",
  title: "Mira",
  content: "Body",
  lore: "Lore",
  labels: [],
  status: "draft",
} as never;

describe("recordGeneratedEntity", () => {
  it("prefixes the summary onto the stored content and records provenance", () => {
    const hub = makeHub();

    const id = recordGeneratedEntity(hub as never, context, {
      ...(base as object),
      summary: "A rogue",
    } as never);

    expect(id).toBe("entity-1");
    expect(hub.addEntity).toHaveBeenCalledWith(
      expect.objectContaining({
        content: "*A rogue*\n\nBody",
        reuseEnabled: true,
        pinned: false,
      }),
    );
    expect(hub.addProvenance).toHaveBeenCalledOnce();
  });

  it("keeps the content untouched without a summary and merges derivation info", () => {
    const hub = makeHub();

    recordGeneratedEntity(hub as never, context, base, {
      derivedFromEntityId: "old",
      derivation: "refine",
    });

    expect(hub.addEntity).toHaveBeenCalledWith(
      expect.objectContaining({
        content: "Body",
        derivedFromEntityId: "old",
        derivation: "refine",
      }),
    );
  });
});
