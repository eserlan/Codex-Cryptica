<script lang="ts">
  import type { Canvas } from "@codex/canvas-engine";
  import EdgeAttributeModal from "$lib/components/canvas/EdgeAttributeModal.svelte";
  import EdgeLabelModal from "$lib/components/canvas/EdgeLabelModal.svelte";
  import RoomStockingDrawer from "$lib/components/canvas/RoomStockingDrawer.svelte";
  import AdventureNodeDrawer from "$lib/components/canvas/AdventureNodeDrawer.svelte";
  import type { CanvasLogic } from "./hooks/canvas-logic-type";
  import type { useCanvasAreaEnhancement } from "./canvas-area-enhancement.svelte";
  import type { useDelveRoomSelection } from "./hooks/use-delve-room-selection.svelte";
  import type { useAdventureNodeSelection } from "./hooks/use-adventure-node-selection.svelte";
  import type { useEdgeAttributeEditor } from "./hooks/use-edge-attribute-editor.svelte";

  let {
    logic,
    canvas,
    areaEnhancement,
    roomSelection,
    adventureSelection,
    edgeEditor,
  }: {
    logic: CanvasLogic;
    canvas: Canvas | undefined;
    areaEnhancement: ReturnType<typeof useCanvasAreaEnhancement>;
    roomSelection: ReturnType<typeof useDelveRoomSelection>;
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
  isOpen={roomSelection.selectedRoomData !== null}
  roomData={roomSelection.selectedRoomData}
  isRegenerating={areaEnhancement.isRestockingRoom}
  errorMessage={areaEnhancement.roomEnhancementError}
  onSave={roomSelection.saveRoomData}
  onRegenerateAi={(room) => areaEnhancement.enhanceRoom(room, canvas)}
  onClose={roomSelection.clear}
/>
<AdventureNodeDrawer
  isOpen={adventureSelection.activeNode !== null}
  node={adventureSelection.activeNode}
  onClose={adventureSelection.close}
  onSave={adventureSelection.save}
/>
