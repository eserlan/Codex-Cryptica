<script lang="ts">
  import EdgeAttributeModal from "$lib/components/canvas/EdgeAttributeModal.svelte";
  import EdgeLabelModal from "$lib/components/canvas/EdgeLabelModal.svelte";
  import RoomStockingDrawer from "$lib/components/canvas/RoomStockingDrawer.svelte";
  import AdventureNodeDrawer from "$lib/components/canvas/AdventureNodeDrawer.svelte";
  import type { CanvasLogic } from "./hooks/canvas-logic-type";
  import type { useDelveAreaActions } from "./hooks/use-delve-area-actions.svelte";
  import type { useAdventureNodeSelection } from "./hooks/use-adventure-node-selection.svelte";
  import type { useEdgeAttributeEditor } from "./hooks/use-edge-attribute-editor.svelte";

  let {
    logic,
    delveAreas,
    adventureSelection,
    edgeEditor,
  }: {
    logic: CanvasLogic;
    delveAreas: ReturnType<typeof useDelveAreaActions>;
    adventureSelection: ReturnType<typeof useAdventureNodeSelection>;
    edgeEditor: ReturnType<typeof useEdgeAttributeEditor>;
  } = $props();
</script>

<EdgeLabelModal
  bind:isOpen={logic.labelModal.isOpen}
  initialValue={logic.labelModal.currentLabel}
  onSave={logic.saveLabelModal}
  onCancel={() => (logic.labelModal.isOpen = false)}
/>
<EdgeAttributeModal
  isOpen={edgeEditor.isOpen}
  edgeData={edgeEditor.edgeData}
  onSave={edgeEditor.save}
  onClose={edgeEditor.close}
/>
<RoomStockingDrawer
  isOpen={delveAreas.selectedRoomData !== null}
  roomData={delveAreas.selectedRoomData}
  isRegenerating={delveAreas.isRestockingRoom}
  errorMessage={delveAreas.roomEnhancementError}
  onSave={delveAreas.saveRoomData}
  onRegenerateAi={delveAreas.enhanceRoom}
  onClose={delveAreas.clearRoomSelection}
/>
<AdventureNodeDrawer
  isOpen={adventureSelection.activeNode !== null}
  node={adventureSelection.activeNode}
  onClose={adventureSelection.close}
  onSave={adventureSelection.save}
/>
