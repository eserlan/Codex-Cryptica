import type { Node } from "@xyflow/svelte";

export function useCanvasContextMenu(logic: any, vault: any) {
  const contextMenuNodeLocked = $derived.by(() => {
    if (logic.contextMenu?.type !== "node") return false;
    const node = logic.nodes.find((n: Node) => n.id === logic.contextMenu?.id);
    return Boolean((node?.data as any)?.locked);
  });

  const contextMenuNodeStackable = $derived.by(() => {
    if (logic.contextMenu?.type !== "node") return false;
    const node = logic.nodes.find((n: Node) => n.id === logic.contextMenu?.id);
    return Boolean(node) && node?.type !== "delveSectorGroup";
  });

  const contextMenuTextNode = $derived.by(() => {
    if (logic.contextMenu?.type !== "node") return undefined;
    const node = logic.nodes.find((n: Node) => n.id === logic.contextMenu?.id);
    return node?.type === "text" ? node : undefined;
  });

  const contextMenuEntityNode = $derived.by(() => {
    if (logic.contextMenu?.type !== "node") return undefined;
    const node = logic.nodes.find((n: Node) => n.id === logic.contextMenu?.id);
    return node?.type === "entity" ? node : undefined;
  });

  function onNodeContextMenu({
    event,
    node,
  }: {
    event: MouseEvent;
    node: any;
  }) {
    event.preventDefault();
    logic.contextMenu = {
      x: event.clientX,
      y: event.clientY,
      type: "node",
      id: node.id,
    };
  }

  function onEdgeContextMenu({
    event,
    edge,
  }: {
    event: MouseEvent;
    edge: any;
  }) {
    event.preventDefault();
    logic.contextMenu = {
      x: event.clientX,
      y: event.clientY,
      type: "edge",
      id: edge.id,
    };
  }

  function handlePaneContextMenu({ event }: { event: MouseEvent }) {
    if (vault.isGuest) return;
    event.preventDefault();
    logic.contextMenu = {
      x: event.clientX,
      y: event.clientY,
      type: "pane",
      id: "pane",
    };
  }

  return {
    get contextMenuNodeLocked() {
      return contextMenuNodeLocked;
    },
    get contextMenuNodeStackable() {
      return contextMenuNodeStackable;
    },
    get contextMenuTextNode() {
      return contextMenuTextNode;
    },
    get contextMenuEntityNode() {
      return contextMenuEntityNode;
    },
    onNodeContextMenu,
    onEdgeContextMenu,
    handlePaneContextMenu,
  };
}
