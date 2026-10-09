/** @vitest-environment jsdom */
import { describe, expect, it } from "vitest";
import type { Node } from "@xyflow/svelte";
import { useDelveRoomSelection } from "./use-delve-room-selection.svelte";
import type { CanvasLogic } from "./canvas-logic-type";

function makeLogic(nodes: Node[]) {
  return { nodes } as unknown as CanvasLogic;
}

const room = (id: string, name: string): Node =>
  ({
    id,
    type: "delveRoom",
    position: { x: 0, y: 0 },
    data: { id, name },
  }) as Node;

describe("useDelveRoomSelection", () => {
  it("exposes the data of the selected room and clears it", () => {
    const logic = makeLogic([room("a", "Crypt"), room("b", "Vault")]);
    const selection = useDelveRoomSelection(logic);

    expect(selection.selectedRoomData).toBeNull();
    selection.select("b");
    expect(selection.selectedRoomData).toMatchObject({ name: "Vault" });
    selection.clear();
    expect(selection.selectedRoomData).toBeNull();
  });

  it("ignores selected ids that are not delve rooms", () => {
    const logic = makeLogic([
      { id: "t", type: "text", position: { x: 0, y: 0 }, data: {} } as Node,
    ]);
    const selection = useDelveRoomSelection(logic);

    selection.select("t");
    expect(selection.selectedRoomData).toBeNull();
  });

  it("merges saved data into the selected room only", () => {
    const logic = makeLogic([room("a", "Crypt"), room("b", "Vault")]);
    const selection = useDelveRoomSelection(logic);

    selection.select("a");
    selection.saveRoomData({ id: "a", name: "Ossuary" } as never);

    expect((logic.nodes[0].data as { name: string }).name).toBe("Ossuary");
    expect((logic.nodes[1].data as { name: string }).name).toBe("Vault");
  });

  it("does nothing when saving with no room selected", () => {
    const nodes = [room("a", "Crypt")];
    const logic = makeLogic(nodes);
    const selection = useDelveRoomSelection(logic);

    selection.saveRoomData({ id: "a", name: "Changed" } as never);

    expect(logic.nodes).toBe(nodes);
    expect((logic.nodes[0].data as { name: string }).name).toBe("Crypt");
  });
});
