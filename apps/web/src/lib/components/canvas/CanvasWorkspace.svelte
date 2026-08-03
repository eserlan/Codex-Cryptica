<script lang="ts">
  import ConnectionLine from "./ConnectionLine.svelte";
  import {
    SvelteFlow,
    Background,
    Controls,
    MiniMap,
    ConnectionMode,
    type Node,
  } from "@xyflow/svelte";
  import { CanvasStore, type Canvas } from "@codex/canvas-engine";
  import type { FileImportFailureReason } from "@codex/vault-engine";
  import { vault } from "$lib/stores/vault.svelte";
  import { canvasRegistry } from "$lib/stores/canvas-registry.svelte";
  import EntityNode from "$lib/components/canvas/EntityNode.svelte";
  import FileNode from "$lib/components/canvas/FileNode.svelte";
  import DelveRoomNode from "$lib/components/canvas/DelveRoomNode.svelte";
  import DelveSectorNode from "$lib/components/canvas/DelveSectorNode.svelte";
  import AdventureNode from "$lib/components/canvas/AdventureNode.svelte";
  import CanvasContextMenu from "$lib/components/canvas/CanvasContextMenu.svelte";
  import CustomEdge from "$lib/components/canvas/CustomEdge.svelte";
  import DelveEdge from "$lib/components/canvas/DelveEdge.svelte";
  import EdgeAttributeModal from "$lib/components/canvas/EdgeAttributeModal.svelte";
  import EdgeLabelModal from "$lib/components/canvas/EdgeLabelModal.svelte";
  import RoomStockingDrawer from "$lib/components/canvas/RoomStockingDrawer.svelte";
  import AdventureNodeDrawer from "$lib/components/canvas/AdventureNodeDrawer.svelte";
  import CanvasHint from "$lib/components/hints/CanvasHint.svelte";
  import CanvasHUD from "./CanvasHUD.svelte";
  import { page } from "$app/state";
  import { tick, untrack } from "svelte";

  import { createCanvasLogic } from "./use-canvas-logic.svelte";
  import { useCanvasEvents } from "./use-canvas-events.svelte";
  import { connectionModeStore } from "$lib/stores/ui/connection-mode.svelte";
  import { sessionModeStore } from "$lib/stores/ui/session-mode.svelte";
  import type { DelveEdgeData, DelveRoomNodeData } from "generator-engine";
  import {
    delveAreaEnhancementService,
    isPlaceholderDelveAreaName,
  } from "$lib/services/delve-area-enhancement";
  import { delveDossierService } from "$lib/services/delve-dossier-service";
  import { notificationStore } from "$lib/stores/ui/notification.svelte";
  import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
  import { themeStore } from "$lib/stores/theme.svelte";
  import { getDelveTerm } from "$lib/utils/delve-terminology";
  import {
    autoArrangeCanvasNodes,
    createFlowFileNode,
    fitDelveSectorFrames,
    flowEdgeToCanvasEdge,
    flowNodesToCanvasNodes,
  } from "./canvas-workspace-helpers";
  import { exportCanvasImage } from "./canvas-image-export";
  import type {
    DelveCanvasEdge,
    DelveCanvasNode,
    AdventureNode as AdventureNodeGraph,
  } from "generator-engine";

  let { engine }: { engine: CanvasStore } = $props();

  const canvasSlug = $derived(page.params.slug);
  const canvas = $derived(
    canvasRegistry.allCanvases.find(
      (c) => c.slug === canvasSlug || c.id === canvasSlug,
    ) as Canvas | undefined,
  );
  const canvasId = $derived(canvas?.id || canvasSlug);
  let isImportingExternalFiles = $state(false);
  const sourceEntityId = $derived.by(() => {
    const id = canvas?.metadata?.sourceEntityId;
    return typeof id === "string" && id ? id : undefined;
  });
  const sourceEntityTitle = $derived(
    sourceEntityId ? vault.entities[sourceEntityId]?.title : undefined,
  );
  const sourceEntity = $derived(
    sourceEntityId ? vault.entities[sourceEntityId] : undefined,
  );
  const dossierEntityId = $derived.by(() => {
    const id = canvas?.metadata?.dossierEntityId;
    return typeof id === "string" && id ? id : undefined;
  });

  const logic = createCanvasLogic(() => engine);
  let selectedRoomId = $state<string | null>(null);
  let isRestockingRoom = $state(false);
  let roomEnhancementError = $state<string | null>(null);
  let isAutoPopulating = $state(false);
  let autoPopulationCompleted = $state(0);
  let autoPopulationTotal = $state(0);
  let autoPopulationMessage = $state<string | null>(null);
  let isFinalizingDossier = $state(false);
  let isExportingCanvas = $state(false);
  let canvasExportElement = $state<HTMLDivElement>();
  let autoPopulationCanvasId: string | null = null;
  const selectedRoomData = $derived.by(() => {
    if (!selectedRoomId) return null;
    const node = logic.nodes.find(
      (candidate) =>
        candidate.id === selectedRoomId && candidate.type === "delveRoom",
    );
    return (node?.data as unknown as DelveRoomNodeData | undefined) ?? null;
  });

  let selectedAdventureNodeId = $state<string | null>(null);
  const selectedAdventureNode = $derived.by(() => {
    if (!selectedAdventureNodeId) return null;
    const found = logic.nodes.find(
      (candidate) => candidate.id === selectedAdventureNodeId,
    );
    if (!found) return null;
    return {
      id: found.id,
      type: found.type as any,
      position: found.position,
      data: (found.data as any) || {},
    } as AdventureNodeGraph;
  });

  const activeAdventureNode = $derived(
    (logic.draftAdventureNode as unknown as AdventureNodeGraph | null) ||
      selectedAdventureNode,
  );

  let edgeModal = $state<{
    isOpen: boolean;
    edgeId: string;
    edgeData: any;
  }>({
    isOpen: false,
    edgeId: "",
    edgeData: null,
  });

  useCanvasEvents({
    onQuickSpawn: (id, pos, screenPos) =>
      logic.handleQuickSpawn(id, pos, screenPos),
    onEditLabel: (edgeId, currentLabel) => {
      logic.labelModal = { isOpen: true, edgeId, currentLabel };
    },
    onFlushSave: () => logic.flushSave(),
  });

  $effect(() => {
    function handleEditDelveEdge(e: Event) {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        edgeModal = {
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

  function updateFileNodeData(
    nodeId: string,
    updates: Record<string, unknown>,
  ) {
    const { width, height, ...dataUpdates } = updates;
    logic.nodes = logic.nodes.map((node) =>
      node.id === nodeId
        ? {
            ...node,
            ...(width !== undefined ? { width: width as number } : null),
            ...(height !== undefined ? { height: height as number } : null),
            data: { ...node.data, ...dataUpdates },
          }
        : node,
    );
  }

  function toggleNodeLock(nodeId: string) {
    logic.nodes = logic.nodes.map((node) =>
      node.id === nodeId
        ? {
            ...node,
            data: { ...node.data, locked: !(node.data as any)?.locked },
          }
        : node,
    );
  }

  const contextMenuNodeLocked = $derived.by(() => {
    if (logic.contextMenu?.type !== "node") return false;
    const node = logic.nodes.find((n) => n.id === logic.contextMenu?.id);
    return Boolean((node?.data as any)?.locked);
  });

  const filteredNodes = $derived.by(() => {
    const base = (() => {
      if (isExportingCanvas) return logic.nodes;
      if (logic.activeCategories.size === 0) return logic.nodes;
      return logic.nodes.filter((n) =>
        logic.activeCategories.has(n.data?.type as string),
      );
    })();
    return base.map((node) => {
      const locked = Boolean((node.data as any)?.locked);
      const withLock = { ...node, draggable: !locked };
      return node.type === "file"
        ? {
            ...withLock,
            data: {
              ...node.data,
              onUpdateFile: (updates: Record<string, unknown>) =>
                updateFileNodeData(node.id, updates),
            },
          }
        : withLock;
    });
  });

  const nodeTypes = {
    entity: EntityNode,
    file: FileNode,
    delveRoom: DelveRoomNode,
    delveSectorGroup: DelveSectorNode,
    adventureNode: AdventureNode,
    situation: AdventureNode,
    location: AdventureNode,
    npc: AdventureNode,
    clue: AdventureNode,
    threat: AdventureNode,
    outcome: AdventureNode,
  };

  const edgeTypes = {
    straight: CustomEdge,
    smoothstep: CustomEdge,
    delveEdge: DelveEdge,
    leads_to: CustomEdge,
    holds_clue: CustomEdge,
    threatens: CustomEdge,
    resolves_to: CustomEdge,
  };

  let arrangedCanvasId = $state<string | null>(null);

  // Initialization & Lifecycle
  $effect(() => {
    if (canvasId) {
      logic.initializeCanvas(canvasId);
    }
  });

  $effect(() => {
    if (canvasId && logic.hasInitialized && arrangedCanvasId !== canvasId) {
      arrangedCanvasId = canvasId;
      untrack(() => {
        const isManual = canvas?.metadata?.layoutState === "manual";
        if (!isManual) {
          handleAutoArrange();
        }
      });
    }
  });

  $effect(() => {
    const currentCanvas: Canvas | undefined = canvas;
    const needsAreaNames = currentCanvas?.nodes.some(
      (node) =>
        node.type === "delveRoom" &&
        isPlaceholderDelveAreaName(node.data as unknown as DelveRoomNodeData),
    );
    const needsPassageEnhancement = currentCanvas?.edges.some(
      (edge) =>
        edge.type === "delveEdge" &&
        !(edge.data as unknown as DelveEdgeData | undefined)?.aiEnhancedAt,
    );
    if (
      !currentCanvas?.id ||
      !logic.hasInitialized ||
      sessionModeStore.isGuestMode ||
      currentCanvas.metadata?.autoPopulateAreas !== true ||
      (currentCanvas.metadata?.areaPopulationStatus === "complete" &&
        !needsAreaNames &&
        !needsPassageEnhancement) ||
      autoPopulationCanvasId === currentCanvas.id
    ) {
      return;
    }

    autoPopulationCanvasId = currentCanvas.id;
    untrack(() => void populateCanvasAreas(currentCanvas));
  });

  // Pruning
  $effect(() => {
    logic.pruneNodes();
  });

  // Sync state to engine
  $effect(() => {
    logic.syncEngine();
  });

  // Monitor batch spawn
  $effect(() => {
    if (canvasRegistry.pendingEntities.length > 0) {
      logic.handleBatchSpawn();
    }
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

  function onNodeClick({ node }: { node: any }) {
    if (node.type === "delveRoom") {
      roomEnhancementError = null;
      selectedRoomId = node.id;
      return;
    }
    if (
      ["situation", "location", "npc", "clue", "threat", "outcome"].includes(
        node.type,
      )
    ) {
      selectedAdventureNodeId = node.id;
      return;
    }
  }

  function onNodeDragStop({
    targetNode,
    nodes = [],
  }: {
    targetNode?: Node | null;
    nodes?: Node[];
  }) {
    const movedNodes =
      nodes.length > 0 ? nodes : targetNode ? [targetNode] : [];
    if (movedNodes.length === 0) return;

    const movedById = new Map(
      movedNodes.map((movedNode) => [movedNode.id, movedNode] as const),
    );
    logic.nodes = logic.nodes.map((candidate) =>
      movedById.has(candidate.id)
        ? {
            ...candidate,
            position: movedById.get(candidate.id)!.position,
          }
        : candidate,
    );
    if (movedNodes.some((movedNode) => movedNode.type === "delveRoom")) {
      logic.nodes = fitDelveSectorFrames(logic.nodes);
    }
    if (canvas) {
      canvas.metadata = {
        ...(canvas.metadata || {}),
        layoutState: "manual",
      };
    }
    logic.flushSave();
  }

  async function finalizeDossier() {
    if (!canvas || !sourceEntity || isFinalizingDossier) return;
    isFinalizingDossier = true;
    isExportingCanvas = true;
    try {
      await vault.loadEntityContent(sourceEntity.id);
      const loadedSourceEntity =
        vault.entities[sourceEntity.id] ?? sourceEntity;
      if (!canvasExportElement) {
        throw new Error("The canvas is not ready to export.");
      }
      await tick();
      const canvasImage = await exportCanvasImage(
        canvasExportElement,
        logic.fitGraphForExport,
      );
      const result = await delveDossierService.finalize({
        canvas,
        sourceEntity: loadedSourceEntity,
        dossierTerm: getDelveTerm(themeStore.activeTheme.id),
        nodes: flowNodesToCanvasNodes(
          logic.nodes,
        ) as unknown as DelveCanvasNode[],
        edges: logic.edges.map((edge) =>
          flowEdgeToCanvasEdge(edge),
        ) as unknown as DelveCanvasEdge[],
        canvasImage,
      });
      notificationStore.notify(
        result.created
          ? "Created the GM dossier."
          : "Updated the GM dossier from the current canvas.",
        "success",
      );
      modalUIStore.openZenMode(result.entityId);
    } catch (error) {
      notificationStore.notify(
        error instanceof Error
          ? error.message
          : "The GM dossier could not be finalized.",
        "error",
      );
    } finally {
      isExportingCanvas = false;
      isFinalizingDossier = false;
    }
  }

  function saveRoomData(updated: DelveRoomNodeData) {
    if (!selectedRoomId) return;
    logic.nodes = logic.nodes.map((node) =>
      node.id === selectedRoomId
        ? { ...node, data: { ...node.data, ...updated } }
        : node,
    );
  }

  function getNearbyAreas(room: DelveRoomNodeData): DelveRoomNodeData[] {
    const connectedIds = new Set<string>();
    for (const edge of logic.edges) {
      if (edge.source === room.id) connectedIds.add(edge.target);
      if (edge.target === room.id) connectedIds.add(edge.source);
    }

    return logic.nodes
      .filter(
        (node) =>
          node.type === "delveRoom" &&
          node.id !== room.id &&
          (connectedIds.has(node.id) ||
            (node.data as unknown as DelveRoomNodeData).sectorId ===
              room.sectorId),
      )
      .slice(0, 8)
      .map((node) => node.data as unknown as DelveRoomNodeData);
  }

  async function enhanceRoom(room: DelveRoomNodeData) {
    if (!canvas) return;
    isRestockingRoom = true;
    roomEnhancementError = null;
    try {
      const updated = await delveAreaEnhancementService.enhanceArea({
        canvas,
        room,
        nearbyAreas: getNearbyAreas(room),
      });
      saveRoomData(updated);
    } catch (error) {
      roomEnhancementError =
        error instanceof Error
          ? error.message
          : "AI enhancement failed. The Area was not changed.";
    } finally {
      isRestockingRoom = false;
    }
  }

  async function populateCanvasAreas(targetCanvas: Canvas) {
    isAutoPopulating = true;
    autoPopulationMessage = null;
    autoPopulationCompleted = 0;
    autoPopulationTotal = targetCanvas.nodes.filter(
      (node) =>
        node.type === "delveRoom" &&
        (!(node.data as unknown as DelveRoomNodeData).aiEnhancedAt ||
          isPlaceholderDelveAreaName(
            node.data as unknown as DelveRoomNodeData,
          )),
    ).length;

    try {
      const result = await delveAreaEnhancementService.populateAllAreas(
        targetCanvas,
        ({ completed, total, updatedAreas }) => {
          autoPopulationCompleted = completed;
          autoPopulationTotal = total;
          if (updatedAreas.length === 0) return;
          const updates = new Map(
            updatedAreas.map((area) => [area.id, area] as const),
          );
          logic.nodes = logic.nodes.map((node) => {
            const update = updates.get(node.id);
            return update
              ? { ...node, data: { ...node.data, ...update } }
              : node;
          });
        },
      );

      const populationStatus =
        result.failed > 0 || result.failedPassages > 0 ? "partial" : "complete";
      const enhancedEdges = new Map(
        result.edges.map((edge) => [edge.id, edge] as const),
      );
      logic.edges = logic.edges.map((edge) => {
        const update = enhancedEdges.get(edge.id);
        return update
          ? { ...edge, data: { ...(edge.data ?? {}), ...(update.data ?? {}) } }
          : edge;
      });
      const metadata = {
        ...(targetCanvas.metadata ?? {}),
        areaPopulationStatus: populationStatus,
        areaPopulationCompleted: result.completed,
        areaPopulationTotal: result.total,
        areaPopulationUpdatedAt: Date.now(),
      };
      const updatedCanvas = {
        ...targetCanvas,
        nodes: flowNodesToCanvasNodes(logic.nodes),
        edges: logic.edges.map((edge) => flowEdgeToCanvasEdge(edge)),
        metadata,
      };
      vault.canvases[targetCanvas.id!] = updatedCanvas;
      canvasRegistry.canvases[targetCanvas.id!] = updatedCanvas;
      await vault.saveCanvas(targetCanvas.id!);

      if (result.failed > 0 || result.failedPassages > 0) {
        const failures = [
          result.failed > 0
            ? `${result.failed} Area${result.failed === 1 ? "" : "s"}`
            : "",
          result.failedPassages > 0
            ? `${result.failedPassages} passage${
                result.failedPassages === 1 ? "" : "s"
              }`
            : "",
        ]
          .filter(Boolean)
          .join(" and ");
        autoPopulationMessage = `${failures} could not be enhanced. They will retry next time this canvas opens.`;
      }
    } catch (err) {
      console.error(
        "[DelveAutoPopulation] Error during canvas auto-population:",
        err,
      );
      const detail =
        err instanceof Error && err.message ? ` (${err.message})` : "";
      autoPopulationMessage = `Automatic AI population paused${detail}. Existing Area details were preserved and it will retry next time.`;
    } finally {
      isAutoPopulating = false;
    }
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

  function onEdgeClick({ event, edge }: { event: MouseEvent; edge: any }) {
    if (event.detail === 2) {
      event.stopPropagation();
      logic.labelModal = {
        isOpen: true,
        edgeId: edge.id,
        currentLabel: (edge.label as string) || "",
      };
    }
  }

  function onDragOver(event: DragEvent) {
    const hasFiles = (event.dataTransfer?.files.length ?? 0) > 0;
    if (vault.isGuest) {
      if (hasFiles) {
        event.preventDefault();
        if (event.dataTransfer) event.dataTransfer.dropEffect = "none";
      }
      return;
    }
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = hasFiles ? "copy" : "move";
    }
  }

  async function onDrop(event: DragEvent) {
    const files = Array.from(event.dataTransfer?.files || []);
    if (vault.isGuest) {
      if (files.length > 0) {
        event.preventDefault();
        if (event.dataTransfer) event.dataTransfer.dropEffect = "none";
      }
      return;
    }
    event.preventDefault();
    if (files.length > 0) {
      await handleExternalFiles(files, {
        x: event.clientX,
        y: event.clientY,
      });
      return;
    }
    const entityId = event.dataTransfer?.getData("application/codex-entity");
    if (!entityId) return;

    const position = logic.screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });
    logic.handleQuickSpawn(entityId, position);
  }

  function formatFileFailure(file: File, reason: FileImportFailureReason) {
    const descriptions: Record<FileImportFailureReason, string> = {
      empty: "is empty",
      too_large: "is larger than 10 MB",
      vault_unavailable: "could not be saved because the vault is unavailable",
      write_failed: "could not be saved to the vault",
    };
    return `${file.name || "A file"} ${descriptions[reason] || "could not be added"}.`;
  }

  async function handleExternalFiles(
    files: File[],
    screenPosition?: { x: number; y: number },
  ) {
    if (vault.isGuest || files.length === 0 || isImportingExternalFiles) return;
    isImportingExternalFiles = true;
    try {
      const start = screenPosition
        ? logic.screenToFlowPosition(screenPosition)
        : {
            x: 80 + logic.nodes.length * 24,
            y: 80 + logic.nodes.length * 24,
          };
      const failures: string[] = [];
      let added = 0;

      for (const file of files) {
        const result = await vault.importFileToVault(file);
        if (!result.ok) {
          failures.push(formatFileFailure(file, result.reason));
          continue;
        }
        const position = { x: start.x + added * 28, y: start.y + added * 28 };
        const nodeId = engine.addFileNode(result.file, position);
        logic.nodes = [
          ...logic.nodes,
          createFlowFileNode(result.file, position, nodeId),
        ];
        added++;
      }

      if (added > 0 && failures.length > 0) {
        logic.saveNow();
        notificationStore.notify(
          `${added} file${added === 1 ? "" : "s"} added. ${failures.join(" ")}`,
          "info",
        );
      } else if (added > 0) {
        logic.saveNow();
        notificationStore.notify(
          `${added} file${added === 1 ? "" : "s"} added to the vault and canvas.`,
          "success",
        );
      } else if (failures.length) {
        notificationStore.notify(failures.join(" "), "error");
      }
    } catch {
      notificationStore.notify(
        "Files could not be added. Please try again.",
        "error",
      );
    } finally {
      isImportingExternalFiles = false;
    }
  }

  async function handleOpenOrCreateSourceEntity() {
    if (sourceEntityId && vault.entities[sourceEntityId]) {
      modalUIStore.openZenMode(sourceEntityId);
      return;
    }

    const title = canvas?.name || "Untitled Adventure";
    const existing = vault.allEntities.find(
      (e) =>
        e.title.trim().toLowerCase() === title.trim().toLowerCase() &&
        e.type === "event",
    );

    let targetId = existing?.id;
    if (!targetId) {
      const sourceLore = (canvas?.metadata as any)?.sourceLore as
        string | undefined;
      const situationNode = logic.nodes.find((n) => n.type === "situation");
      const situationData = situationNode?.data as any;
      const canvasSummary = (canvas?.metadata as any)?.summary as
        string | undefined;
      const situationSummary =
        situationData?.summary ||
        situationData?.description ||
        canvasSummary ||
        "";
      const situationHook =
        situationData?.hook || situationData?.startingHook || "";
      const situationGoal =
        situationData?.goal || situationData?.objective || "";

      if (sourceLore && sourceLore.trim()) {
        targetId = await vault.createEntity("note", title, {
          content: situationSummary ? `*${situationSummary}*` : "",
          lore: sourceLore.trim(),
          kind: "adventure",
          labels: ["adventure"],
        });
      } else {
        let markdown = `# ${title}\n\n`;
        if (situationSummary) markdown += `*${situationSummary}*\n\n`;

        if (situationHook || situationGoal) {
          markdown += `## Situation & Hook\n`;
          if (situationHook)
            markdown += `**Starting Hook:** ${situationHook}\n\n`;
          if (situationGoal) markdown += `**Objective:** ${situationGoal}\n\n`;
        }

        const locations = logic.nodes.filter((n) => n.type === "location");
        if (locations.length > 0) {
          markdown += `## Key Locations\n`;
          for (const loc of locations) {
            const d = loc.data as any;
            const name =
              (loc as any).label || d?.title || d?.name || "Location";
            const desc = d?.description || d?.summary || "";
            const role = d?.role || "";
            const relation = d?.relation || "";
            const leverage = d?.leverage || "";
            const dilemma = d?.dilemma || "";
            const hazard = d?.hazard || d?.danger || "";
            markdown += `### ${name}\n`;
            if (desc) markdown += `${desc}\n\n`;
            if (role) markdown += `- **Role:** ${role}\n`;
            if (relation) markdown += `- **Relation:** ${relation}\n`;
            if (leverage) markdown += `- **Leverage:** ${leverage}\n`;
            if (dilemma) markdown += `- **Dilemma:** ${dilemma}\n`;
            if (hazard) markdown += `- **Hazard/Danger:** ${hazard}\n`;
            markdown += `\n`;
          }
        }

        const npcs = logic.nodes.filter((n) => n.type === "npc");
        if (npcs.length > 0) {
          markdown += `## Important NPCs & Factions\n`;
          for (const npc of npcs) {
            const d = npc.data as any;
            const name = (npc as any).label || d?.title || d?.name || "NPC";
            const role = d?.role || "";
            const desc = d?.description || d?.summary || "";
            const relation = d?.relation || "";
            const wants = d?.wants || d?.motivation || "";
            const secret = d?.secret || "";
            const leverage = d?.leverage || "";
            const dilemma = d?.dilemma || "";
            markdown += `### ${name}${role ? ` (${role})` : ""}\n`;
            if (desc) markdown += `${desc}\n\n`;
            if (relation) markdown += `- **Relation:** ${relation}\n`;
            if (wants) markdown += `- **Wants:** ${wants}\n`;
            if (secret) markdown += `- **Secret:** ${secret}\n`;
            if (leverage) markdown += `- **Leverage:** ${leverage}\n`;
            if (dilemma) markdown += `- **Dilemma:** ${dilemma}\n`;
            markdown += `\n`;
          }
        }

        const clues = logic.nodes.filter((n) => n.type === "clue");
        const threats = logic.nodes.filter((n) => n.type === "threat");
        if (clues.length > 0 || threats.length > 0) {
          markdown += `## Clues & Threats\n`;
          for (const clue of clues) {
            const d = clue.data as any;
            const name = (clue as any).label || d?.title || d?.name || "Clue";
            const desc = d?.description || d?.summary || "";
            const leadsTo = d?.leadsTo || "";
            markdown += `- **${name}:** ${desc}${leadsTo ? ` *(Leads to: ${leadsTo})*` : ""}\n`;
          }
          if (clues.length > 0 && threats.length > 0) markdown += `\n`;
          for (const threat of threats) {
            const d = threat.data as any;
            const name =
              (threat as any).label || d?.title || d?.name || "Threat";
            const desc = d?.description || d?.summary || "";
            const trigger = d?.trigger || "";
            markdown += `- **${name}:** ${desc}${trigger ? ` *(Trigger: ${trigger})*` : ""}\n`;
          }
          markdown += `\n`;
        }

        const outcomes = logic.nodes.filter((n) => n.type === "outcome");
        if (outcomes.length > 0) {
          markdown += `## Possible Outcomes\n`;
          for (const outcome of outcomes) {
            const d = outcome.data as any;
            const name =
              (outcome as any).label || d?.title || d?.name || "Outcome";
            const desc = d?.description || d?.summary || "";
            markdown += `### ${name}\n${desc}\n\n`;
          }
        }

        targetId = await vault.createEntity("note", title, {
          content: situationSummary ? `*${situationSummary}*` : "",
          lore: markdown.trim(),
          kind: "adventure",
          labels: ["adventure"],
        });
      }
    }

    if (canvas?.id) {
      canvas.metadata = {
        ...(canvas.metadata || {}),
        sourceEntityId: targetId,
      };
      await canvasRegistry.saveCanvas(canvas.id);
    }

    modalUIStore.openZenMode(targetId);
  }

  function handleAutoArrange() {
    const positionedNodes = autoArrangeCanvasNodes({
      canvasId: canvas?.id || "temp",
      title: canvas?.name || "Canvas",
      nodes: logic.nodes,
      edges: logic.edges,
    });
    if (!positionedNodes) return;

    logic.nodes = positionedNodes;
    if (canvas) {
      canvas.metadata = {
        ...(canvas.metadata || {}),
        layoutState: "auto",
      };
    }
    logic.saveNow();
  }

  $effect(() => {
    return () => {
      logic.flushSave();
    };
  });
</script>

<div
  class="canvas-container {logic.isConnecting
    ? 'is-connecting'
    : ''} relative w-full h-full overflow-hidden select-none flex flex-col"
>
  <div
    class="flex-1 relative"
    ondragover={onDragOver}
    ondrop={onDrop}
    role="region"
    aria-label="Canvas Workspace"
  >
    <CanvasHUD
      canvasName={canvas?.name || ""}
      {sourceEntityId}
      {sourceEntityTitle}
      sourceEntityType={sourceEntity?.type ||
        (canvas?.metadata?.kind === "adventure" ? "event" : "location")}
      sourceEntityKind={sourceEntity?.kind ||
        (canvas?.metadata?.kind as string)}
      {dossierEntityId}
      {isFinalizingDossier}
      onFinalizeDossier={!vault.isGuest &&
      sourceEntity &&
      logic.nodes.some((node) => node.type === "delveRoom")
        ? finalizeDossier
        : undefined}
      onOpenOrCreateSourceEntity={handleOpenOrCreateSourceEntity}
      onAutoArrange={handleAutoArrange}
      onUploadFiles={!vault.isGuest ? handleExternalFiles : undefined}
      onAddAdventureNode={canvas?.metadata?.kind === "adventure" ||
      sourceEntity?.kind === "adventure" ||
      logic.nodes.some((n) => n.type === "adventureNode")
        ? (type) => logic.handleAddAdventureNode(type)
        : undefined}
      activeCategories={logic.activeCategories}
      onToggleCategory={logic.toggleCategoryFilter}
      onClearCategories={logic.clearCategoryFilters}
    />

    <div class="absolute inset-0" bind:this={canvasExportElement}>
      <SvelteFlow
        nodes={filteredNodes}
        bind:edges={logic.edges}
        {nodeTypes}
        {edgeTypes}
        onconnect={!vault.isGuest ? logic.onConnect : undefined}
        onreconnect={!vault.isGuest ? logic.onReconnect : undefined}
        onconnectstart={() => {
          if (vault.isGuest) return;
          logic.isConnecting = true;
          connectionModeStore.isConnecting = true;
        }}
        onconnectend={() => {
          logic.isConnecting = false;
          connectionModeStore.isConnecting = false;
        }}
        onnodecontextmenu={onNodeContextMenu}
        onnodeclick={onNodeClick}
        onnodedragstop={onNodeDragStop}
        onedgecontextmenu={onEdgeContextMenu}
        onedgeclick={onEdgeClick}
        onpanecontextmenu={handlePaneContextMenu}
        defaultEdgeOptions={{ type: "straight" }}
        connectionMode={ConnectionMode.Loose}
        zoomOnDoubleClick={false}
        proOptions={{ hideAttribution: true }}
        connectionLineComponent={ConnectionLine}
        minZoom={0.01}
        maxZoom={9}
        fitView
      >
        <Background gap={20} />
        {#if !sessionModeStore.isGuestMode}
          <Controls />
        {/if}
        <MiniMap position="top-right" nodeColor="var(--color-theme-primary)" />
      </SvelteFlow>
    </div>

    {#if isAutoPopulating}
      <div
        class="absolute bottom-5 left-1/2 z-30 -translate-x-1/2 inline-flex items-center gap-2 rounded-full border border-theme-primary/40 bg-theme-bg/95 px-4 py-2 text-xs font-mono text-theme-text shadow-xl"
        role="status"
        aria-live="polite"
      >
        <span
          class="icon-[lucide--sparkles] h-4 w-4 animate-pulse text-theme-primary"
          aria-hidden="true"
        ></span>
        Populating Areas with Location-aware AI…
        <span class="text-theme-primary">
          {autoPopulationCompleted}/{autoPopulationTotal}
        </span>
      </div>
    {:else if autoPopulationMessage}
      <div
        class="absolute bottom-5 left-1/2 z-30 max-w-md -translate-x-1/2 rounded-lg border border-amber-500/40 bg-theme-bg/95 px-4 py-2 text-xs text-amber-300 shadow-xl"
        role="status"
      >
        {autoPopulationMessage}
      </div>
    {/if}
  </div>

  {#if logic.contextMenu}
    <CanvasContextMenu
      x={logic.contextMenu.x}
      y={logic.contextMenu.y}
      targetId={logic.contextMenu?.id}
      targetType={logic.contextMenu.type}
      isAdventure={canvas?.metadata?.kind === "adventure" ||
        sourceEntity?.kind === "adventure" ||
        logic.nodes.some((n) => n.type === "adventureNode")}
      isLocked={contextMenuNodeLocked}
      onToggleLock={logic.contextMenu?.type === "node" && logic.contextMenu.id
        ? () => toggleNodeLock(logic.contextMenu!.id)
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
        logic.handleAddAdventureNode(type, {
          x: logic.contextMenu?.x || 0,
          y: logic.contextMenu?.y || 0,
        })}
      onClose={() => (logic.contextMenu = null)}
    />
  {/if}

  <CanvasHint />
  <EdgeLabelModal
    bind:isOpen={logic.labelModal.isOpen}
    initialValue={logic.labelModal.currentLabel}
    onSave={logic.saveLabelModal}
    onCancel={() => (logic.labelModal.isOpen = false)}
  />
  <EdgeAttributeModal
    isOpen={edgeModal.isOpen}
    edgeData={edgeModal.edgeData}
    onSave={(updates) => {
      logic.edges = logic.edges.map((e) => {
        if (e.id === edgeModal.edgeId) {
          return { ...e, data: { ...(e.data as any), ...updates } };
        }
        return e;
      });
    }}
    onClose={() => (edgeModal.isOpen = false)}
  />
  <RoomStockingDrawer
    isOpen={selectedRoomData !== null}
    roomData={selectedRoomData}
    isRegenerating={isRestockingRoom}
    errorMessage={roomEnhancementError}
    onSave={saveRoomData}
    onRegenerateAi={enhanceRoom}
    onClose={() => (selectedRoomId = null)}
  />

  <AdventureNodeDrawer
    isOpen={activeAdventureNode !== null}
    node={activeAdventureNode}
    onClose={() => {
      selectedAdventureNodeId = null;
      logic.handleCancelDraftAdventureNode();
    }}
    onSave={(updatedNode) => {
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
      selectedAdventureNodeId = null;
    }}
  />
</div>

<style>
  .canvas-container {
    background-color: var(--color-bg-primary);
    background-image: var(--bg-texture-overlay);
    background-repeat: repeat;
    background-position: top left;
    background-attachment: fixed;
  }

  :global(.svelte-flow__edges) {
    z-index: 0 !important;
  }

  :global(.svelte-flow__nodes) {
    z-index: 10 !important;
  }
  :global(.svelte-flow__node-delveSectorGroup) {
    z-index: 0 !important;
    pointer-events: none !important;
  }

  :global(.svelte-flow) {
    background-color: transparent !important;
    font-family: var(--font-body), ui-sans-serif;
    transition:
      font-family 0.3s ease,
      background-color 0.3s ease;
  }
  :global(.svelte-flow__pane) {
    background-color: transparent !important;
  }
  :global(.svelte-flow__background-pattern) {
    fill: var(--color-border-primary) !important;
    opacity: 0.25 !important;
  }
  :global(.svelte-flow__edgelabel-renderer) {
    background: transparent !important;
    pointer-events: none;
  }
  :global(.svelte-flow__edge-label) {
    background: transparent !important;
  }
  :global(.svelte-flow__edge-path) {
    stroke: var(--color-theme-primary, #78350f) !important;
    stroke-width: var(--theme-edge-stroke-width, 2) !important;
    stroke-opacity: 1 !important;
    visibility: visible !important;
    transition:
      stroke-width 0.2s ease,
      stroke 0.2s ease;
  }
  :global(.svelte-flow__edge:hover .svelte-flow__edge-path) {
    stroke-width: calc(var(--theme-edge-stroke-width, 2) + 2px) !important;
    stroke: var(--color-theme-primary) !important;
    filter: drop-shadow(0 0 4px var(--color-theme-primary));
  }
  :global(.svelte-flow__edge.selected .svelte-flow__edge-path) {
    stroke-width: calc(var(--theme-edge-stroke-width, 2) + 2px) !important;
    stroke: var(--color-theme-primary) !important;
  }
  :global(.svelte-flow__edge.animated path) {
    stroke-dasharray: 5;
    animation: svelte-flow__dashdraw 0.5s linear infinite;
  }
  :global(.svelte-flow__controls) {
    background: var(--color-theme-surface) !important;
    border: 1px solid var(--color-theme-border) !important;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }
  :global(.svelte-flow__controls-button) {
    background: var(--color-theme-surface) !important;
    border-bottom: 1px solid var(--color-theme-border) !important;
    color: var(--color-theme-primary) !important;
    fill: var(--color-theme-primary) !important;
    transition: all 0.2s ease;
  }
  :global(.svelte-flow__controls-button:last-child) {
    border-bottom: none !important;
  }
  :global(.svelte-flow__controls-button:hover) {
    background: var(--color-theme-primary) !important;
    color: var(--color-theme-bg) !important;
    fill: var(--color-theme-bg) !important;
  }
  :global(.svelte-flow__controls-button svg) {
    fill: currentColor !important;
  }
  :global(.svelte-flow__minimap) {
    background-color: var(--color-bg-surface) !important;
    border: 1px solid var(--color-border-primary) !important;
    border-radius: 8px !important;
  }
  :global(.svelte-flow__minimap-mask) {
    fill: var(--color-theme-primary) !important;
    fill-opacity: 0.1 !important;
  }
  :global(.svelte-flow__connectionline) {
    z-index: 20 !important;
  }

  @keyframes svelte-flow__dashdraw {
    from {
      stroke-dashoffset: 10;
    }
    to {
      stroke-dashoffset: 0;
    }
  }
</style>
