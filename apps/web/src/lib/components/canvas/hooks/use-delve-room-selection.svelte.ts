import type { DelveRoomNodeData } from "generator-engine";
import type { CanvasLogic } from "./canvas-logic-type";

/** Tracks which delve room is open in the stocking drawer. */
export function useDelveRoomSelection(logic: CanvasLogic) {
  let selectedRoomId = $state<string | null>(null);

  const selectedRoomData = $derived.by(() => {
    if (!selectedRoomId) return null;
    const node = logic.nodes.find(
      (candidate) =>
        candidate.id === selectedRoomId && candidate.type === "delveRoom",
    );
    return (node?.data as unknown as DelveRoomNodeData | undefined) ?? null;
  });

  function select(nodeId: string) {
    selectedRoomId = nodeId;
  }

  function clear() {
    selectedRoomId = null;
  }

  function saveRoomData(updated: DelveRoomNodeData) {
    if (!selectedRoomId) return;
    logic.nodes = logic.nodes.map((node) =>
      node.id === selectedRoomId
        ? { ...node, data: { ...node.data, ...updated } }
        : node,
    );
  }

  return {
    select,
    clear,
    saveRoomData,
    get selectedRoomData() {
      return selectedRoomData;
    },
  };
}
