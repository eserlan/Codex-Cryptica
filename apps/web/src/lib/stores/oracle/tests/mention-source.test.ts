import { describe, expect, it } from "vitest";
import { createVaultMentionSource, sourceEntitiesFor } from "../mention-source";

const elara = {
  id: "e-elara",
  title: "Elara Voss",
  type: "character",
  status: "active",
};
const spy = {
  id: "e-spy",
  title: "Shadow Spy",
  type: "character",
  labels: ["hidden"],
};
const vault: any = {
  entities: { [elara.id]: elara, [spy.id]: spy },
  allEntities: [elara, spy],
  isGuest: false,
  defaultVisibility: "visible",
};

describe("sourceEntitiesFor", () => {
  it("returns the grounded source entities by id", () => {
    const source = createVaultMentionSource(vault);
    expect(sourceEntitiesFor(["e-elara"], source).map((e) => e.id)).toEqual([
      "e-elara",
    ]);
  });

  it("drops a hidden source entity for a guest", () => {
    const source = createVaultMentionSource({ ...vault, isGuest: true });
    expect(sourceEntitiesFor(["e-spy"], source)).toEqual([]);
  });

  it("returns nothing for an unknown source id", () => {
    const source = createVaultMentionSource(vault);
    expect(sourceEntitiesFor(["e-gone"], source)).toEqual([]);
  });
});
