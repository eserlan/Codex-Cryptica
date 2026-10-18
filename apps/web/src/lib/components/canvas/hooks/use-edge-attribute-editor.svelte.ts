import type { CanvasLogic } from "./canvas-logic-type";

export function useEdgeAttributeEditor(logic: CanvasLogic) {
  let modal = $state<{ isOpen: boolean; edgeId: string; edgeData: any }>({
    isOpen: false,
    edgeId: "",
    edgeData: null,
  });

  $effect(() => {
    function handleEditDelveEdge(e: Event) {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        modal = {
          isOpen: true,
          edgeId: customEvent.detail.edgeId,
          edgeData: customEvent.detail.edgeData,
        };
      }
    }

    window.addEventListener("edit-delve-edge", handleEditDelveEdge);
    return () => {
      window.removeEventListener("edit-delve-edge", handleEditDelveEdge);
    };
  });

  function save(updates: Record<string, unknown>) {
    logic.edges = logic.edges.map((e) =>
      e.id === modal.edgeId
        ? { ...e, data: { ...(e.data as any), ...updates } }
        : e,
    );
  }

  function close() {
    modal.isOpen = false;
  }

  return {
    get isOpen() {
      return modal.isOpen;
    },
    get edgeData() {
      return modal.edgeData;
    },
    save,
    close,
  };
}
