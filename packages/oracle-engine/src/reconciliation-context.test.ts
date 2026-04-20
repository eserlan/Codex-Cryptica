import { describe, expect, it } from "vitest";
import { buildRelatedEntityContext } from "./reconciliation-context";

describe("buildRelatedEntityContext", () => {
  it("prioritizes connected entities mentioned in the incoming text", () => {
    const related = buildRelatedEntityContext({
      entity: {
        id: "rw",
        title: "Red Wizards of Thay",
        connections: [
          { target: "szass", type: "rules" },
          { target: "aglarond", type: "invades" },
        ],
      },
      incoming: {
        chronicle: "Szass Tam reshaped the order after the War of the Zulkirs.",
        lore: "Aglarond still resists Thayan power.",
      },
      vault: {
        entities: {
          rw: { id: "rw", title: "Red Wizards of Thay", type: "faction" },
          szass: {
            id: "szass",
            title: "Szass Tam",
            type: "npc",
            content: "Lich-regent of Thay.",
            lore: "",
          },
          aglarond: {
            id: "aglarond",
            title: "Aglarond",
            type: "location",
            content: "A realm hostile to Thayan expansion.",
            lore: "",
          },
        },
        inboundConnections: {},
      },
      getConsolidatedContext: (entity) =>
        [entity.content, entity.lore].filter(Boolean).join("\n\n"),
    });

    expect(related).toHaveLength(2);
    expect(related[0]).toEqual(
      expect.objectContaining({
        title: "Aglarond",
        type: "location",
      }),
    );
    expect(related[1]).toEqual(
      expect.objectContaining({
        title: "Szass Tam",
        type: "npc",
      }),
    );
  });
});
