import type { AdventureNode as AdventureNodeGraph } from "generator-engine";
import type { CanvasLogic } from "./canvas-logic-type";

export function useAdventureNodeSelection(logic: CanvasLogic) {
  let selectedId = $state<string | null>(null);

  const selectedNode = $derived.by(() => {
    if (!selectedId) return null;
    const found = logic.nodes.find((candidate) => candidate.id === selectedId);
    if (!found) return null;
    return {
      id: found.id,
      type: found.type as any,
      position: found.position,
      data: (found.data as any) || {},
    } as AdventureNodeGraph;
  });

  const activeNode = $derived(
    (logic.draftAdventureNode as unknown as AdventureNodeGraph | null) ||
      selectedNode,
  );

  function select(nodeId: string) {
    selectedId = nodeId;
  }

  function close() {
    selectedId = null;
    logic.handleCancelDraftAdventureNode();
  }

  function save(updatedNode: AdventureNodeGraph) {
    if (logic.draftAdventureNode) {
      const flowNode = {
        ...logic.draftAdventureNode,
        data: {
          ...logic.draftAdventureNode.data,
          ...updatedNode.data,
        },
      };
      logic.handleSaveAdventureNode(flowNode);
    } else {
      logic.nodes = logic.nodes.map((n) =>
        n.id === updatedNode.id
          ? { ...n, data: { ...(n.data as any), ...updatedNode.data } }
          : n,
      );
      logic.flushSave();
    }
    selectedId = null;
  }

  return {
    select,
    close,
    save,
    get activeNode() {
      return activeNode;
    },
  };
}
