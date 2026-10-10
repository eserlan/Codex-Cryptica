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
  import { when } from "./canvas-guard";
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

  const canEdit = $derived(!vault.isGuest);
  const menuPosition = () => ({
    x: logic.contextMenu?.x || 0,
    y: logic.contextMenu?.y || 0,
  });
  const targetId = () => logic.contextMenu!.id;
  const entityNode = $derived(contextMenuLogic.contextMenuEntityNode);
  const textNode = $derived(contextMenuLogic.contextMenuTextNode);
  const styledNode = $derived(entityNode ?? textNode);
  const isNodeTarget = $derived(
    logic.contextMenu?.type === "node" && Boolean(logic.contextMenu.id),
  );

  function renameEdge() {
    const edge = logic.edges.find((e) => e.id === logic.contextMenu?.id);
    logic.labelModal = {
      isOpen: true,
      edgeId: targetId(),
      currentLabel: (edge?.label as string) || "",
    };
    logic.contextMenu = null;
  }

  function setNodeBackground(background: string) {
    nodeActions.updateNodeData(styledNode!.id, {
      background: normalizeCanvasTextBackground(
        background,
        DEFAULT_CANVAS_TEXT_BACKGROUND,
      ),
    });
  }

  const nodeBackground = $derived(
    normalizeCanvasTextBackground(
      (styledNode?.data as any)?.background ?? "",
      DEFAULT_CANVAS_TEXT_BACKGROUND,
    ),
  );
  const textNodeFontSize = $derived(
    normalizeCanvasTextFontSize(
      (textNode?.data as any)?.fontSize,
      DEFAULT_CANVAS_TEXT_FONT_SIZE,
    ),
  );
  const entityCardView = $derived(
    normalizeEntityCardViewPreference((entityNode?.data as any)?.cardView),
  );
  const largeCard = $derived((entityNode?.data as any)?.largeCard === true);
</script>

{#if logic.contextMenu}
  <CanvasContextMenu
    x={logic.contextMenu.x}
    y={logic.contextMenu.y}
    targetId={logic.contextMenu.id}
    targetType={logic.contextMenu.type}
    {isAdventure}
    isLocked={contextMenuLogic.contextMenuNodeLocked}
    onToggleLock={when(isNodeTarget, () =>
      nodeActions.toggleNodeLock(targetId()),
    )}
    onBringToFront={when(contextMenuLogic.contextMenuNodeStackable, () =>
      nodeActions.handleBringNodeToFront(targetId()),
    )}
    onSendToBack={when(contextMenuLogic.contextMenuNodeStackable, () =>
      nodeActions.handleSendNodeToBack(targetId()),
    )}
    onDelete={logic.handleDelete}
    onRename={renameEdge}
    onCreateEntity={logic.handleCreateEntity}
    onAddAdventureNode={(type) =>
      logic.handleAddAdventureNode(type, menuPosition())}
    onPaste={when(canEdit, () => onPasteFromClipboard(menuPosition()))}
    onAddTextNode={when(canEdit, () =>
      nodeActions.handleAddTextNode(menuPosition()),
    )}
    {nodeBackground}
    onNodeBackgroundChange={when(styledNode && canEdit, setNodeBackground)}
    {textNodeFontSize}
    onTextNodeFontSizeChange={when(textNode && canEdit, (fontSize: number) =>
      nodeActions.updateNodeData(textNode!.id, { fontSize }),
    )}
    {entityCardView}
    onEntityCardViewChange={when(
      entityNode && canEdit,
      (view: EntityCardViewPreference) =>
        nodeActions.updateNodeData(entityNode!.id, { cardView: view }),
    )}
    {largeCard}
    onLargeCardChange={when(entityNode && canEdit, (large: boolean) =>
      nodeActions.updateNodeData(entityNode!.id, { largeCard: large }),
    )}
    isAllImageOnly={nodeActions.isAllImageOnly}
    onToggleAllImageOnly={when(
      nodeActions.hasEntityNodes && canEdit,
      nodeActions.handleToggleAllImageOnly,
    )}
    showImageLabels={nodeActions.showImageLabels}
    onToggleShowImageLabels={when(
      nodeActions.hasEntityNodes,
      nodeActions.handleToggleShowImageLabels,
    )}
    onClose={() => (logic.contextMenu = null)}
  />
{/if}
