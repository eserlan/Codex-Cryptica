<script lang="ts">
  import {
    DEFAULT_CANVAS_TEXT_BACKGROUND,
    DEFAULT_CANVAS_TEXT_FONT_SIZE,
    normalizeCanvasTextBackground,
    normalizeCanvasTextFontSize,
  } from "@codex/canvas-engine";
  import CanvasContextMenu from "$lib/components/canvas/CanvasContextMenu.svelte";
  import type { vault as VaultStore } from "$lib/stores/vault.svelte";
  import type { CanvasLogic } from "./hooks/canvas-logic-type";
  import type { useCanvasNodeActions } from "./hooks/use-canvas-node-actions.svelte";

  let {
    logic,
    nodeActions,
    vault,
    isAdventure,
    onPasteFromClipboard,
  }: {
    logic: CanvasLogic;
    nodeActions: ReturnType<typeof useCanvasNodeActions>;
    vault: typeof VaultStore;
    isAdventure: boolean;
    onPasteFromClipboard: (position: { x: number; y: number }) => void;
  } = $props();

  const menuPosition = () => ({
    x: logic.contextMenu?.x || 0,
    y: logic.contextMenu?.y || 0,
  });
  const textNode = $derived(nodeActions.contextMenuTextNode);
</script>

{#if logic.contextMenu}
  <CanvasContextMenu
    x={logic.contextMenu.x}
    y={logic.contextMenu.y}
    targetId={logic.contextMenu?.id}
    targetType={logic.contextMenu.type}
    {isAdventure}
    isLocked={nodeActions.contextMenuNodeLocked}
    onToggleLock={logic.contextMenu?.type === "node" && logic.contextMenu.id
      ? () => nodeActions.toggleNodeLock(logic.contextMenu!.id)
      : undefined}
    onBringToFront={nodeActions.contextMenuNodeStackable
      ? () => nodeActions.bringNodeToFront(logic.contextMenu!.id)
      : undefined}
    onSendToBack={nodeActions.contextMenuNodeStackable
      ? () => nodeActions.sendNodeToBack(logic.contextMenu!.id)
      : undefined}
    onDelete={logic.handleDelete}
    onRename={() => {
      const edge = logic.edges.find((e) => e.id === logic.contextMenu?.id);
      logic.labelModal = {
        isOpen: true,
        edgeId: logic.contextMenu!.id,
        currentLabel: (edge?.label as string) || "",
      };
      logic.contextMenu = null;
    }}
    onCreateEntity={logic.handleCreateEntity}
    onAddAdventureNode={(type) =>
      logic.handleAddAdventureNode(type, menuPosition())}
    onPaste={!vault.isGuest
      ? () => onPasteFromClipboard(menuPosition())
      : undefined}
    onAddTextNode={!vault.isGuest
      ? () => nodeActions.handleAddTextNode(menuPosition())
      : undefined}
    textNodeBackground={normalizeCanvasTextBackground(
      (textNode?.data as any)?.background ?? "",
      DEFAULT_CANVAS_TEXT_BACKGROUND,
    )}
    textNodeFontSize={normalizeCanvasTextFontSize(
      (textNode?.data as any)?.fontSize,
      DEFAULT_CANVAS_TEXT_FONT_SIZE,
    )}
    onTextNodeBackgroundChange={textNode && !vault.isGuest
      ? (background: string) =>
          nodeActions.updateNodeData(textNode.id, {
            background: normalizeCanvasTextBackground(
              background,
              DEFAULT_CANVAS_TEXT_BACKGROUND,
            ),
          })
      : undefined}
    onTextNodeFontSizeChange={textNode && !vault.isGuest
      ? (fontSize: number) =>
          nodeActions.updateNodeData(textNode.id, { fontSize })
      : undefined}
    onClose={() => (logic.contextMenu = null)}
  />
{/if}
