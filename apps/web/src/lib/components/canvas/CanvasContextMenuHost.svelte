<script lang="ts">
  import {
    DEFAULT_CANVAS_TEXT_BACKGROUND,
    DEFAULT_CANVAS_TEXT_FONT_SIZE,
    normalizeCanvasTextBackground,
    normalizeCanvasTextFontSize,
  } from "@codex/canvas-engine";
  import CanvasContextMenu from "$lib/components/canvas/CanvasContextMenu.svelte";
  import type { vault as VaultStore } from "$lib/stores/vault.svelte";
  import {
    normalizeEntityCardViewPreference,
    type EntityCardViewPreference,
  } from "./cards/entity-card-variant";
  import type { CanvasLogic } from "./hooks/canvas-logic-type";
  import type { useCanvasContextMenu } from "./hooks/use-canvas-context-menu.svelte";
  import type { useCanvasNodeActions } from "./hooks/use-canvas-node-actions.svelte";

  let {
    logic,
    nodeActions,
    contextMenuLogic,
    vault,
    isAdventure,
    onPasteFromClipboard,
  }: {
    logic: CanvasLogic;
    nodeActions: ReturnType<typeof useCanvasNodeActions>;
    contextMenuLogic: ReturnType<typeof useCanvasContextMenu>;
    vault: typeof VaultStore;
    isAdventure: boolean;
    onPasteFromClipboard: (position: { x: number; y: number }) => void;
  } = $props();

  const menuPosition = () => ({
    x: logic.contextMenu?.x || 0,
    y: logic.contextMenu?.y || 0,
  });
  const entityNode = $derived(contextMenuLogic.contextMenuEntityNode);
  const textNode = $derived(contextMenuLogic.contextMenuTextNode);
  const styledNode = $derived(entityNode ?? textNode);
</script>

{#if logic.contextMenu}
  <CanvasContextMenu
    x={logic.contextMenu.x}
    y={logic.contextMenu.y}
    targetId={logic.contextMenu?.id}
    targetType={logic.contextMenu.type}
    {isAdventure}
    isLocked={contextMenuLogic.contextMenuNodeLocked}
    onToggleLock={logic.contextMenu?.type === "node" && logic.contextMenu.id
      ? () => nodeActions.toggleNodeLock(logic.contextMenu!.id)
      : undefined}
    onBringToFront={contextMenuLogic.contextMenuNodeStackable
      ? () => nodeActions.handleBringNodeToFront(logic.contextMenu!.id)
      : undefined}
    onSendToBack={contextMenuLogic.contextMenuNodeStackable
      ? () => nodeActions.handleSendNodeToBack(logic.contextMenu!.id)
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
    nodeBackground={normalizeCanvasTextBackground(
      (styledNode?.data as any)?.background ?? "",
      DEFAULT_CANVAS_TEXT_BACKGROUND,
    )}
    onNodeBackgroundChange={styledNode && !vault.isGuest
      ? (background: string) =>
          nodeActions.updateNodeData(styledNode.id, {
            background: normalizeCanvasTextBackground(
              background,
              DEFAULT_CANVAS_TEXT_BACKGROUND,
            ),
          })
      : undefined}
    textNodeFontSize={normalizeCanvasTextFontSize(
      (textNode?.data as any)?.fontSize,
      DEFAULT_CANVAS_TEXT_FONT_SIZE,
    )}
    onTextNodeFontSizeChange={textNode && !vault.isGuest
      ? (fontSize: number) =>
          nodeActions.updateNodeData(textNode.id, { fontSize })
      : undefined}
    entityCardView={normalizeEntityCardViewPreference(
      (entityNode?.data as any)?.cardView,
    )}
    onEntityCardViewChange={entityNode && !vault.isGuest
      ? (view: EntityCardViewPreference) =>
          nodeActions.updateNodeData(entityNode.id, { cardView: view })
      : undefined}
    largeCard={(entityNode?.data as any)?.largeCard === true}
    onLargeCardChange={entityNode && !vault.isGuest
      ? (large: boolean) =>
          nodeActions.updateNodeData(entityNode.id, { largeCard: large })
      : undefined}
    isAllImageOnly={nodeActions.isAllImageOnly}
    onToggleAllImageOnly={nodeActions.hasEntityNodes && !vault.isGuest
      ? nodeActions.handleToggleAllImageOnly
      : undefined}
    showImageLabels={nodeActions.showImageLabels}
    onToggleShowImageLabels={nodeActions.hasEntityNodes
      ? nodeActions.handleToggleShowImageLabels
      : undefined}
    onClose={() => (logic.contextMenu = null)}
  />
{/if}
