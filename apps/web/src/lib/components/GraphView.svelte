<script lang="ts">
  import { fade, fly } from "svelte/transition";
  import { onMount, onDestroy, untrack } from "svelte";
  import { initGraph } from "graph-engine";
  import { graph } from "$lib/stores/graph.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { debugStore } from "$lib/stores/debug.svelte";
  import type { Entity } from "schema";
  import { isTemporalMetadataEqual } from "$lib/utils/comparison";
  import { ui } from "$lib/stores/ui.svelte";
  import { categories } from "$lib/stores/categories.svelte";
  import { marked } from "marked";
  import DOMPurify from "isomorphic-dompurify";
  import type { Core, NodeSingular } from "cytoscape";
  import cytoscape from "cytoscape";
  import fcose from "cytoscape-fcose";
  import {
    getGraphStyle,
    DEFAULT_LAYOUT_OPTIONS,
    hasTimelineDate,
    type GraphNode,
    type GraphEdge,
  } from "graph-engine";

  cytoscape.use(fcose);
  import { themeStore } from "$lib/stores/theme.svelte";
  import Minimap from "./graph/Minimap.svelte";
  import TimelineControls from "$lib/components/graph/TimelineControls.svelte";
  import TimelineOverlay from "$lib/components/graph/TimelineOverlay.svelte";
  import OrbitControls from "$lib/components/graph/OrbitControls.svelte";
  import ContextMenu from "$lib/components/graph/ContextMenu.svelte";
  import SelectionConnector from "$lib/components/graph/SelectionConnector.svelte";
  import FeatureHint from "$lib/components/help/FeatureHint.svelte";
  import { setCentralNode, getTimelineLayout } from "graph-engine";
  import LabelFilter from "$lib/components/labels/LabelFilter.svelte";
  import CategoryFilter from "$lib/components/labels/CategoryFilter.svelte";

  let container: HTMLElement;
  let cy: Core | undefined = $state();
  let currentLayout: any;
  let stabilizationTimeout: number | undefined;
  let isLayoutRunning = $state(false);
  let showMinimap = $state(false);
  let graphVisible = $state(false);

  let graphStyle = $derived([
    ...getGraphStyle(themeStore.activeTheme, categories.list, graph.showImages),
    {
      selector: ".filtered-out",
      style: {
        display: "none",
      },
    },
    {
      selector: ".timeline-hidden",
      style: {
        display: "none",
      },
    },
    {
      selector: ".category-filtered-out",
      style: {
        display: "none",
      },
    },
    ...(graph.timelineMode || !graph.showLabels
      ? [
          {
            selector: "node",
            style: {
              label: "",
            },
          },
        ]
      : []),
  ]);

  let connectMode = $state(false);
  let sourceId = $state<string | null>(null);
  let { selectedId = $bindable(null) } = $props<{
    selectedId: string | null;
  }>();

  const applyFocus = (id: string | null) => {
    const currentCy = cy;
    if (!currentCy) return;
    try {
      currentCy.batch(() => {
        const allEles = currentCy.elements();
        if (!id) {
          allEles.removeClass("dimmed neighborhood secondary-neighborhood");
        } else {
          const node = currentCy.$id(id);
          if (node.length > 0) {
            const firstLevel = node.closedNeighborhood();
            const firstLevelNodes = firstLevel.nodes();
            const secondLevelNodes = firstLevelNodes
              .neighborhood()
              .nodes()
              .not(firstLevelNodes);
            const secondLevelEdges =
              secondLevelNodes.edgesWith(firstLevelNodes);
            const secondLevel = secondLevelNodes.add(secondLevelEdges);

            allEles.addClass("dimmed");
            allEles.removeClass("neighborhood secondary-neighborhood");

            firstLevel.removeClass("dimmed");
            firstLevel.addClass("neighborhood");

            secondLevel.removeClass("dimmed");
            secondLevel.addClass("secondary-neighborhood");
          } else {
            allEles.removeClass("dimmed neighborhood secondary-neighborhood");
          }
        }
      });
    } catch {
      /* ignore */
    }
  };

  let hoveredEntityId = $state<string | null>(null);
  let hoverPosition = $state<{ x: number; y: number } | null>(null);
  let hoverTimeout: number | undefined;
  let selectionCount = $state(0);
  const HOVER_DELAY = 800;

  let editingEdge = $state<{
    source: string;
    target: string;
    label: string;
    type: string;
  } | null>(null);
  let edgeEditInput = $state("");
  let edgeEditType = $state("neutral");

  const applyCurrentLayout = async (
    isInitial = false,
    isForced = false,
    caller = "unknown",
  ) => {
    const currentCy = cy;
    if (!currentCy) return;

    if (isLayoutRunning && !isInitial && !isForced) {
      return;
    }

    if (currentLayout) {
      try {
        currentLayout.stop();
      } catch {
        /* ignore */
      }
    }

    isLayoutRunning = true;
    try {
      currentCy.resize();

      currentCy.batch(() => {
        currentCy.nodes().forEach((node) => {
          const data = node.data() as GraphNode["data"];
          const hasDate = hasTimelineDate({ group: "nodes", data });
          if (graph.timelineMode && !hasDate) {
            node.addClass("timeline-hidden");
          } else {
            node.removeClass("timeline-hidden");
          }
        });
      });

      if (vault.isGuest) {
        if (isInitial) {
          currentCy.fit(currentCy.nodes(), 20);
          graphVisible = true;
        }
        isLayoutRunning = false;
        return;
      }

      if (graph.timelineMode) {
        try {
          const nodes = graph.elements.filter(
            (e) => e.group === "nodes",
          ) as any[];

          const positions = getTimelineLayout(
            $state.snapshot(nodes),
            $state.snapshot({
              axis: graph.timelineAxis,
              scale: graph.timelineScale,
              jitter: 150,
            }),
          );

          if (!cy || currentCy.destroyed()) {
            isLayoutRunning = false;
            return;
          }

          const nodesToLayout = currentCy
            .nodes()
            .filter((n) => positions[n.id()] !== undefined);

          graphVisible = true;
          nodesToLayout
            .layout({
              name: "preset",
              positions: positions,
              animate: true,
              animationDuration: 500,
              animationEasing: "ease-out-cubic",
              fit: true,
              padding: 20,
              stop: () => {
                isLayoutRunning = false;
              },
            })
            .run();
        } catch (err) {
          debugStore.error("Timeline layout failed", err);
          isLayoutRunning = false;
        }
      } else if (graph.orbitMode && graph.centralNodeId) {
        setCentralNode(currentCy, graph.centralNodeId);
        if (isInitial) {
          currentCy.resize();
          graphVisible = true;
          currentCy.animate({
            fit: { eles: currentCy.nodes(), padding: 20 },
            duration: 800,
            easing: "ease-out-cubic",
            complete: () => {
              isLayoutRunning = false;
            },
          });
        } else {
          isLayoutRunning = false;
        }
      } else {
        try {
          const snapshotNodes: any[] = [];
          let hasNewNodes = false;
          let nodesAtOrigin = 0;

          const elementsLen = graph.elements.length;
          for (let i = 0; i < elementsLen; i++) {
            const el = graph.elements[i] as any;
            if (el.group === "nodes") {
              snapshotNodes.push(el);
              if (!el.position) {
                hasNewNodes = true;
              } else if (el.position.x === 0 && el.position.y === 0) {
                nodesAtOrigin++;
              }
            }
          }

          const isClumpedAtOrigin =
            snapshotNodes.length > 1 && nodesAtOrigin === snapshotNodes.length;

          const isExitingTimeline =
            caller === "Timeline Toggle" && !graph.timelineMode;
          const randomize =
            hasNewNodes ||
            (isInitial && !graph.stableLayout) ||
            isExitingTimeline ||
            isClumpedAtOrigin;

          if (
            graph.stableLayout &&
            !isForced &&
            !hasNewNodes &&
            !isExitingTimeline &&
            !isClumpedAtOrigin
          ) {
            if (isInitial && currentCy) {
              currentCy.resize();
              currentCy.fit(currentCy.elements(), 20);
              graphVisible = true;
              setTimeout(() => {
                _layoutReady = true;
              }, 1000);
            }

            isLayoutRunning = false;
            return;
          }

          const width = currentCy.width();
          const height = currentCy.height();
          const ar = width / height;
          const isLandscape = ar > 1.2;

          currentLayout = currentCy.layout({
            ...DEFAULT_LAYOUT_OPTIONS,
            boundingBox: { x1: 0, y1: 0, x2: width, y2: height },
            gravity: isLandscape ? 0.1 : 0.8,
            idealEdgeLength: isLandscape ? 140 : 60,
            nodeRepulsion: isLandscape
              ? Math.min(45000, 5000 + snapshotNodes.length * 150)
              : Math.min(20000, 3000 + snapshotNodes.length * 50),
            nodeSeparation: isLandscape ? 150 : 60,
            randomize,
            animate: false,
            fit: false,
          } as any);

          const layout = currentLayout;
          layout.one("layoutstop", () => {
            if (currentLayout !== layout || currentCy.destroyed()) return;

            currentCy.resize();
            graphVisible = true;
            currentCy.animate({
              fit: {
                eles: currentCy.elements(),
                padding: 20,
              },
              duration: 800,
              easing: "ease-out-quad",
              complete: () => {
                isLayoutRunning = false;
                if (isInitial) {
                  setTimeout(() => {
                    _layoutReady = true;
                  }, 1000);
                }
              },
            });

            if (!vault.isGuest && currentCy) {
              const updates: Record<string, Partial<Entity>> = {};
              currentCy.nodes().forEach((node) => {
                const pos = node.position();
                updates[node.id()] = {
                  metadata: {
                    ...(vault.entities[node.id()]?.metadata || {}),
                    coordinates: {
                      x: Math.round(pos.x),
                      y: Math.round(pos.y),
                    },
                  },
                };
              });
              if (Object.keys(updates).length > 0) {
                vault.batchUpdateEntities(updates as any);
              }
            }
          });

          currentLayout.run();
        } catch (err) {
          console.error("Layout failed:", err);
          isLayoutRunning = false;
        }
      }
    } catch (error) {
      debugStore.error("Unexpected error in applyCurrentLayout", error);
      isLayoutRunning = false;
    }
  };

  const toggleConnectMode = () => {
    connectMode = !connectMode;
    if (!connectMode) {
      sourceId = null;
      cy?.$(".selected-source").removeClass("selected-source");
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    const target = document.activeElement;
    if (
      target?.tagName === "INPUT" ||
      target?.tagName === "TEXTAREA" ||
      (target as HTMLElement)?.isContentEditable
    )
      return;

    if (e.key.toLowerCase() === "t" && !e.ctrlKey && !e.metaKey && !e.altKey) {
      graph.toggleTimeline();
      applyCurrentLayout(false, false, "Keyboard Shortcut (T)");
    }
    if (e.key.toLowerCase() === "c" && !e.ctrlKey && !e.metaKey && !e.altKey) {
      if (!vault.isGuest) toggleConnectMode();
    }
    if (e.key.toLowerCase() === "l" && !e.ctrlKey && !e.metaKey && !e.altKey) {
      graph.toggleLabels();
    }
    if (e.key.toLowerCase() === "i" && !e.ctrlKey && !e.metaKey && !e.altKey) {
      graph.toggleImages();
    }
    if (e.key === "Escape" && connectMode) {
      toggleConnectMode();
    }
  };

  let initTimer: ReturnType<typeof setTimeout> | null = null;

  onMount(() => {
    if (container) {
      initTimer = setTimeout(async () => {
        if (!container) return;

        try {
          const instance = (await initGraph({
            container,
            elements: untrack(() => graph.elements),
            style: untrack(() => graphStyle),
          })) as any;

          if (initTimer === null) {
            instance.destroy();
            return;
          }

          cy = instance;

          if (import.meta.env.DEV || (window as any).__E2E__) {
            (window as any).cy = instance;
          }

          instance.on("mouseover", "node", (evt: any) => {
            const node = evt.target;
            clearTimeout(hoverTimeout);
            hoverTimeout = window.setTimeout(() => {
              const renderedPos = node.renderedPosition();
              hoverPosition = { x: renderedPos.x, y: renderedPos.y };
              hoveredEntityId = node.id();
            }, HOVER_DELAY);
          });

          instance.on("mouseout", "node", (_evt: any) => {
            clearTimeout(hoverTimeout);
            hoveredEntityId = null;
            hoverPosition = null;
          });

          instance.on("position", "node", (evt: any) => {
            if (hoveredEntityId === evt.target.id()) {
              const renderedPos = evt.target.renderedPosition();
              hoverPosition = { x: renderedPos.x, y: renderedPos.y };
            }
          });
          instance.on("pan zoom", () => {
            if (hoveredEntityId && instance) {
              const node = instance.$id(hoveredEntityId);
              if (node.length > 0) {
                const renderedPos = node.renderedPosition();
                hoverPosition = { x: renderedPos.x, y: renderedPos.y };
              }
            }
          });

          instance.on("tap", "node", async (evt: any) => {
            const targetNode = evt.target as NodeSingular;
            const targetId = targetNode.id();

            if (connectMode) {
              if (!sourceId) {
                sourceId = targetId;
                targetNode.addClass("selected-source");
              } else if (sourceId === targetId) {
                sourceId = null;
                targetNode.removeClass("selected-source");
              } else {
                await vault.addConnection(sourceId, targetId, "neutral");
                instance?.$(".selected-source").removeClass("selected-source");
                sourceId = null;
                connectMode = false;
              }
            } else if (graph.orbitMode) {
              graph.setCentralNode(targetId);
              selectedId = targetId;
            } else {
              selectedId = targetId;
            }
          });

          instance.on("cxttap", "edge", (evt: any) => {
            if (vault.isGuest) return;
            const edge = evt.target;
            editingEdge = {
              source: edge.data("source"),
              target: edge.data("target"),
              label: edge.data("label") || "",
              type: edge.data("connectionType") || "neutral",
            };
            edgeEditInput = editingEdge.label;
            edgeEditType = editingEdge.type;
          });

          instance.on("tap", (evt: any) => {
            if (evt.target === instance) {
              if (!connectMode) selectedId = null;
              editingEdge = null;
            }
          });

          instance.on("select unselect", "node", () => {
            selectionCount = instance?.$("node:selected").length || 0;
          });

          instance.on("dragfree", "node", async (evt: any) => {
            if (vault.isGuest) return;
            const node = evt.target;
            const id = node.id();
            const pos = node.position();
            const entity = vault.entities[id];
            if (entity) {
              await vault.updateEntity(id, {
                metadata: {
                  ...(entity.metadata || {}),
                  coordinates: { x: Math.round(pos.x), y: Math.round(pos.y) },
                },
              });
            }
          });
        } catch (error) {
          debugStore.error("Failed to initialize graph", error);
        }
      }, 0);
    }
  });

  onDestroy(() => {
    if (currentLayout) {
      try {
        currentLayout.stop();
      } catch {
        /* ignore */
      }
    }
    if (initTimer) {
      clearTimeout(initTimer);
      initTimer = null;
    }
    if (cy) {
      if (import.meta.env.DEV) delete (window as any).cy;
      cy.destroy();
      cy = undefined;
    }
    clearTimeout(hoverTimeout);
  });

  let initialLoaded = $state(false);
  let _layoutReady = $state(false);
  let didFinalizeLoad = $state(false);

  const urlCache = new Map<string, string>();

  // FLICKER PREVENTION: Lockdown global style effect during loading.
  let activeStyleJson = "";
  $effect(() => {
    const currentStyle = graphStyle;
    const currentCy = cy;
    const isVaultLoading = vault.status === "loading";

    // While loading, we do NOT re-apply global styles. This is the biggest flicker killer.
    // New nodes added via currentCy.add() will inherit the current stylesheet rules automatically.
    if (currentCy && currentStyle && (!isVaultLoading || didFinalizeLoad)) {
      const styleJson = JSON.stringify(currentStyle);
      if (styleJson !== activeStyleJson) {
        activeStyleJson = styleJson;
        untrack(() => {
          currentCy.style(currentStyle);
        });
      }
    }
  });

  $effect(() => {
    const currentCy = cy;
    if (currentCy && graph.activeLabels) {
      const active = Array.from(graph.activeLabels).map((l) => l.toLowerCase());
      const filterMode = graph.labelFilterMode;
      currentCy.batch(() => {
        currentCy.nodes().forEach((node) => {
          const entity = vault.entities[node.id()];
          if (!entity) return;
          let hasMatch = active.length === 0;
          if (!hasMatch) {
            const entityLabels = (entity.labels || []).map((l) =>
              l.toLowerCase(),
            );
            hasMatch =
              filterMode === "AND"
                ? active.every((l) => entityLabels.includes(l))
                : active.some((l) => entityLabels.includes(l));
          }
          if (hasMatch) {
            node.removeClass("filtered-out");
          } else {
            node.addClass("filtered-out");
          }
        });
      });
    }
  });

  $effect(() => {
    const currentCy = cy;
    if (currentCy && !currentCy.destroyed() && graph.activeCategories) {
      const activeCategories = graph.activeCategories;
      const entities = vault.entities;
      currentCy.batch(() => {
        currentCy.nodes().forEach((node) => {
          const entity = entities[node.id()];
          if (!entity) return;
          if (
            activeCategories.size === 0 ||
            activeCategories.has(entity.type)
          ) {
            node.removeClass("category-filtered-out");
          } else {
            node.addClass("category-filtered-out");
          }
        });
      });
    }
  });

  $effect(() => {
    const currentCy = cy;
    if (currentCy && graph.elements) {
      const isVaultLoading = vault.status === "loading";

      try {
        const snapshotElements = $state.snapshot(graph.elements);
        const targetIds = new Set(snapshotElements.map((el) => el.data.id));
        const elementMap = new Map();
        const elementsToRemove: any[] = [];

        currentCy.elements().forEach((el) => {
          const id = el.id();
          if (!targetIds.has(id)) elementsToRemove.push(el);
          else elementMap.set(id, el);
        });

        if (elementsToRemove.length > 0)
          currentCy.remove(currentCy.collection(elementsToRemove));

        const newNodes: GraphNode[] = [];
        const newEdges: GraphEdge[] = [];
        snapshotElements.forEach((el) => {
          if (!elementMap.has(el.data.id)) {
            if (!("source" in el.data)) newNodes.push(el as GraphNode);
            else newEdges.push(el as GraphEdge);
          }
        });

        if (newNodes.length > 0 || newEdges.length > 0) {
          if (newNodes.length > 0) {
            currentCy.add(newNodes).forEach((n) => {
              elementMap.set(n.id(), n);
            });
          }
          const validEdges = newEdges.filter((edge) => {
            const sourceId = edge.data.source!;
            const targetId = edge.data.target!;
            return (
              currentCy &&
              currentCy.$id(sourceId).nonempty() &&
              currentCy.$id(targetId).nonempty()
            );
          });
          if (validEdges.length > 0) {
            currentCy.add(validEdges).forEach((e) => {
              elementMap.set(e.id(), e);
            });
          }
        }

        // FLICKER PREVENTION: Only sync data for existing elements if loading is FINISHED.
        // This is strictly enforced here to prevent any metadata jitter during waves.
        if (!isVaultLoading || didFinalizeLoad) {
          currentCy.batch(() => {
            snapshotElements.forEach((el) => {
              const node = elementMap.get(el.data.id);
              if (node) {
                const currentData = node.data();
                const newData = el.data as Record<string, any>;
                const patch: Record<string, any> = {};
                let hasChanges = false;

                for (const k in newData) {
                  if (
                    k === "id" ||
                    k === "resolvedImage" ||
                    k === "image" ||
                    k === "thumbnail" ||
                    !Object.hasOwn(newData, k)
                  )
                    continue;
                  const newVal = newData[k];
                  const curVal = currentData[k];
                  let isMatch = newVal === curVal;
                  if (!isMatch) {
                    if (
                      el.group === "nodes" &&
                      (k === "date" || k === "start_date" || k === "end_date")
                    )
                      isMatch = isTemporalMetadataEqual(newVal, curVal);
                    else if (Array.isArray(newVal))
                      isMatch =
                        Array.isArray(curVal) &&
                        newVal.length === curVal.length &&
                        newVal.every((v, i) => v === curVal[i]);
                    else if (
                      typeof newVal === "object" &&
                      newVal !== null &&
                      curVal !== null &&
                      typeof curVal === "object"
                    ) {
                      if (k === "coordinates")
                        isMatch =
                          newVal.x === curVal.x && newVal.y === curVal.y;
                      else if (k === "metadata")
                        isMatch =
                          !!curVal &&
                          newVal.coordinates?.x === curVal.coordinates?.x &&
                          newVal.coordinates?.y === curVal.coordinates?.y &&
                          newVal.isRevealed === curVal.isRevealed;
                    }
                  }
                  if (!isMatch) {
                    patch[k] = newVal;
                    hasChanges = true;
                  }
                }
                if (hasChanges) node.data(patch);
                if (
                  vault.isGuest &&
                  el.group === "nodes" &&
                  el.position?.x !== undefined
                ) {
                  const currentPos = node.position();
                  if (
                    Math.abs(currentPos.x - el.position.x) > 1 ||
                    Math.abs(currentPos.y - el.position.y) > 1
                  )
                    node.position(el.position);
                }
              }
            });
          });
        }

        const isFirstElements = !initialLoaded && graph.elements.length > 0;
        if (newNodes.length > 0 || isFirstElements) {
          if (isFirstElements) {
            if (!graphVisible) {
              currentCy.fit(currentCy.nodes(), 20);
              graphVisible = true;
            }
            clearTimeout(stabilizationTimeout);
            stabilizationTimeout = window.setTimeout(() => {
              if (!initialLoaded) {
                applyCurrentLayout(true, false, "Initial Startup");
                initialLoaded = true;
              }
            }, 500);
          } else if (isVaultLoading) {
            graphVisible = true;
            // Removed redundant fit() during waves to reduce thread pressure.
          } else {
            applyCurrentLayout(false, !graph.stableLayout, "Elements Update");
          }
        }

        if (initialLoaded && !isVaultLoading && !didFinalizeLoad) {
          clearTimeout(stabilizationTimeout);
          stabilizationTimeout = window.setTimeout(() => {
            applyCurrentLayout(false, !graph.stableLayout, "Load Finalized");
            _layoutReady = true;
            didFinalizeLoad = true;
          }, 500);
        }
      } catch (err) {
        debugStore.error("Cytoscape Error", err);
      }
    }
  });

  $effect(() => {
    const currentCy = cy;
    if (currentCy) {
      applyFocus(selectedId);
      const timer = setTimeout(() => {
        currentCy.resize();
        if (selectedId) {
          const node = currentCy.$id(selectedId);
          if (node.length > 0)
            currentCy.animate({
              center: { eles: node },
              duration: 500,
              easing: "ease-out-cubic",
            });
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  });

  $effect(() => {
    const currentCy = cy;
    if (currentCy && graph.fitRequest > 0) {
      untrack(() =>
        currentCy.animate({
          fit: { eles: currentCy.elements(), padding: 20 },
          duration: 800,
          easing: "ease-out-cubic",
        }),
      );
    }
  });

  const resolvingIds = new Set<string>();
  $effect(() => {
    const currentCy = cy;
    const showImages = graph.showImages;
    const elements = graph.elements;
    const isVaultLoading = vault.status === "loading";

    // FLICKER PREVENTION: Defer all image loading until the graph has finished incrementally loading.
    // This stops Cytoscape from thrashing styles and re-rendering on every single chunk.
    if (
      currentCy &&
      elements &&
      showImages &&
      (!isVaultLoading || didFinalizeLoad)
    ) {
      untrack(() => {
        const nodesWithImages = currentCy
          .nodes()
          .filter(
            (n) =>
              (n.data("image") || n.data("thumbnail")) &&
              !n.data("resolvedImage") &&
              !resolvingIds.has(n.id()),
          );

        const CONCURRENCY_LIMIT = 8;
        let active = 0;
        let styleUpdateTimeout: number | undefined;
        const queue: { node: any; imagePath: string }[] = [];

        const scheduleStyleUpdate = () => {
          clearTimeout(styleUpdateTimeout);
          styleUpdateTimeout = window.setTimeout(() => {
            if (currentCy && !currentCy.destroyed()) currentCy.style().update();
          }, 150);
        };

        const processNext = () => {
          while (active < CONCURRENCY_LIMIT && queue.length > 0) {
            const { node, imagePath } = queue.shift()!;
            active += 1;
            resolvingIds.add(node.id());

            void (async () => {
              try {
                let url = urlCache.get(imagePath);
                if (!url) {
                  url = await vault.resolveImageUrl(imagePath);
                  if (url) urlCache.set(imagePath, url);
                }

                if (!url || currentCy.destroyed() || !graph.showImages) {
                  resolvingIds.delete(node.id());
                  return;
                }

                const oldUrl = node.data("resolvedImage");
                if (oldUrl === url) {
                  resolvingIds.delete(node.id());
                  return;
                }

                node.data("resolvedImage", url);
                if (oldUrl?.startsWith("blob:")) {
                  URL.revokeObjectURL(oldUrl);
                }
                scheduleStyleUpdate();
              } catch (err) {
                debugStore.error(`Image Error: ${node.id()}`, err);
              } finally {
                active -= 1;
                if (queue.length > 0 && !currentCy.destroyed()) processNext();
              }
            })();
          }
        };

        nodesWithImages.forEach((node) => {
          const path = node.data("image") || node.data("thumbnail");
          if (path) queue.push({ node, imagePath: path });
        });
        if (queue.length > 0) processNext();
      });
    } else if (currentCy && !showImages) {
      untrack(() => {
        resolvingIds.clear();
        currentCy
          .nodes()
          .filter((n) => n.data("resolvedImage"))
          .forEach((node) => {
            const oldUrl = node.data("resolvedImage");
            if (oldUrl?.startsWith("blob:")) {
              URL.revokeObjectURL(oldUrl);
            }
            node.removeData("resolvedImage");
          });
        currentCy.style().update();
      });
    }
  });

  const saveEdgeLabel = async () => {
    if (editingEdge) {
      await vault.updateConnection(
        editingEdge.source,
        editingEdge.target,
        editingEdge.type,
        edgeEditType,
        edgeEditInput,
      );
      editingEdge = null;
    }
  };

  let selectedEntity = $derived(selectedId ? vault.entities[selectedId] : null);
  let parentEntity = $derived(
    selectedId
      ? vault.inboundConnections[selectedId]?.[0]?.sourceId
        ? vault.entities[vault.inboundConnections[selectedId][0].sourceId]
        : null
      : null,
  );
  let hoveredEntity = $derived(
    hoveredEntityId ? vault.entities[hoveredEntityId] : null,
  );
  let tooltipContent = $derived(
    hoveredEntity?.content
      ? DOMPurify.sanitize(marked.parse(hoveredEntity.content) as string)
      : '<span class="italic text-theme-muted">No data available</span>',
  );
</script>

<div
  class="absolute inset-0 w-full h-full bg-theme-bg overflow-hidden shadow-2xl border-y border-theme-border/30"
>
  <div
    class="absolute inset-0 pointer-events-none opacity-20"
    style="background-image: radial-gradient(var(--color-theme-secondary) 1px, transparent 1px); background-size: 30px 30px;"
  ></div>

  <div
    class="absolute top-6 left-6 z-20 flex flex-col items-start gap-3 pointer-events-none"
  >
    <div
      class="bg-theme-surface/80 backdrop-blur border border-theme-border px-4 py-1.5 flex items-center gap-2 text-[10px] font-mono tracking-widest text-theme-primary shadow-lg uppercase pointer-events-auto"
    >
      {#if selectedEntity}
        {#if parentEntity}
          <span class="text-theme-muted"
            >{parentEntity.title || parentEntity.id}</span
          >
          <span class="text-theme-muted">/</span>
        {/if}
        <span class="font-bold text-theme-primary"
          >{selectedEntity.title || selectedEntity.id}</span
        >
      {:else}
        <span class="text-theme-muted"
          >{themeStore.jargon.vault.toUpperCase()}</span
        >
        <span class="text-theme-muted">/</span>
        <span class="font-bold text-theme-primary">OVERVIEW</span>
      {/if}
    </div>

    {#if selectedId}
      <div
        class="flex items-center gap-2 text-[9px] font-bold text-theme-primary animate-pulse bg-theme-surface/40 px-2 py-0.5 border border-theme-primary/20"
      >
        <div class="w-1.5 h-1.5 bg-theme-primary rounded-full"></div>
        ARCHIVE DETAIL MODE
      </div>
    {/if}

    <div class="pointer-events-auto">
      <CategoryFilter
        activeCategories={graph.activeCategories}
        onToggle={(id) => graph.toggleCategoryFilter(id)}
        onClear={() => graph.clearCategoryFilters()}
      />
    </div>

    <div class="pointer-events-auto">
      <LabelFilter
        activeLabels={graph.activeLabels}
        filterMode={graph.labelFilterMode}
        onToggle={(l) => graph.toggleLabelFilter(l)}
        onToggleMode={() => graph.toggleLabelFilterMode()}
        onClear={() => graph.clearLabelFilters()}
      />
    </div>

    {#if graph.timelineMode}
      <div
        class="bg-timeline-dark/40 backdrop-blur border border-timeline-primary/30 px-3 py-1 flex items-center gap-2 text-[9px] font-mono tracking-[0.2em] text-timeline-primary shadow-lg uppercase pointer-events-auto"
        transition:fade
      >
        <span class="icon-[lucide--history] w-3 h-3 animate-pulse"></span>
        Chronological Synchrony Active ({graph.timelineAxis === "x"
          ? "Horizontal"
          : "Vertical"})
      </div>
    {/if}

    {#if ui.sharedMode}
      <div
        class="bg-amber-900/40 backdrop-blur border border-amber-500/30 px-3 py-1 flex items-center gap-2 text-[9px] font-mono tracking-[0.2em] text-amber-300 shadow-lg uppercase pointer-events-auto"
        transition:fade
      >
        <span class="icon-[lucide--eye] w-3 h-3 animate-pulse"></span>
        Shared Mode Active (Player Preview)
      </div>
    {/if}

    {#if isLayoutRunning}
      <div
        class="bg-blue-900/40 backdrop-blur border border-blue-500/30 px-3 py-1 flex items-center gap-2 text-[9px] font-mono tracking-[0.2em] text-blue-300 shadow-lg uppercase pointer-events-auto"
        transition:fade
      >
        <span class="icon-[lucide--cpu] w-3 h-3 animate-spin"></span>
        Neural Layout Synthesis Processing...
      </div>
    {/if}
  </div>

  <div class="absolute bottom-6 left-6 z-20 flex flex-col gap-2 items-start">
    {#if cy}
      <div class="relative">
        <Minimap
          {cy}
          absolute={false}
          width={192}
          height={128}
          isExpanded={showMinimap}
        />
      </div>
    {/if}

    <div class="flex gap-1 items-center">
      <button
        class="w-8 h-8 flex items-center justify-center border transition {showMinimap
          ? 'border-theme-primary bg-theme-primary/20 text-theme-primary'
          : 'border-theme-border bg-theme-surface/80 text-theme-muted hover:text-theme-primary'}"
        onclick={() => (showMinimap = !showMinimap)}
        title="Toggle Minimap"
        aria-label="Toggle Minimap"
        aria-pressed={showMinimap}
      >
        <span class="icon-[lucide--map] w-4 h-4"></span>
      </button>
      <div class="h-6 w-px bg-theme-border/30 mx-1"></div>
      <TimelineControls onApply={applyCurrentLayout} />
      <div class="h-6 w-px bg-theme-border/30 mx-2"></div>
      <button
        class="w-8 h-8 flex items-center justify-center border border-theme-border bg-theme-surface/80 text-theme-primary hover:bg-theme-primary/20 hover:text-theme-text transition"
        onclick={() => cy?.zoom(cy.zoom() * 1.2)}
        title="Zoom In"
        aria-label="Zoom In"
        ><span class="icon-[lucide--zoom-in] w-4 h-4"></span></button
      >
      <button
        class="w-8 h-8 flex items-center justify-center border border-theme-border bg-theme-surface/80 text-theme-primary hover:bg-theme-primary/20 hover:text-theme-text transition"
        onclick={() => cy?.zoom(cy.zoom() / 1.2)}
        title="Zoom Out"
        aria-label="Zoom Out"
        ><span class="icon-[lucide--zoom-out] w-4 h-4"></span></button
      >
      <button
        class="w-8 h-8 flex items-center justify-center border border-theme-border bg-theme-surface/80 text-theme-primary hover:bg-theme-primary/20 hover:text-theme-text transition"
        onclick={() => graph.requestFit()}
        title="Fit to Screen"
        aria-label="Fit to Screen"
        ><span class="icon-[lucide--maximize] w-4 h-4"></span></button
      >
      <button
        class="w-8 h-8 flex items-center justify-center border transition {graph.stableLayout
          ? 'border-theme-primary bg-theme-primary/20 text-theme-primary'
          : 'border-theme-border bg-theme-surface/80 text-theme-muted hover:text-theme-primary'}"
        onclick={() =>
          void graph.toggleStableLayout().catch((e) => console.error(e))}
        title={graph.stableLayout ? "Stable Layout: ON" : "Stable Layout: OFF"}
        aria-label="Toggle Stable Layout"
        aria-pressed={graph.stableLayout}
        ><span
          class="{graph.stableLayout
            ? 'icon-[lucide--pin]'
            : 'icon-[lucide--pin-off]'} w-4 h-4"
        ></span></button
      >
      <button
        class="w-8 h-8 flex items-center justify-center border border-theme-border bg-theme-surface/80 text-theme-primary hover:bg-theme-primary/20 hover:text-theme-text transition"
        onclick={() => applyCurrentLayout(false, true, "UI Redraw Button")}
        title="Redraw Layout"
        aria-label="Redraw Layout"
        ><span
          class="icon-[lucide--refresh-cw] w-4 h-4 {isLayoutRunning
            ? 'animate-spin'
            : ''}"
        ></span></button
      >
      <div class="h-6 w-px bg-theme-border/30 mx-2 hidden md:block"></div>
      <button
        class="w-8 h-8 flex items-center justify-center border transition {ui.sharedMode
          ? 'bg-amber-500/20 border-amber-500/50 text-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
          : 'border-theme-border bg-theme-surface/80 text-theme-primary hover:bg-theme-primary/20 hover:text-theme-text'}"
        onclick={() => (ui.sharedMode = !ui.sharedMode)}
        title={ui.sharedMode ? "Exit Shared Mode" : "Enter Shared Mode"}
        data-testid="shared-mode-toggle"
        ><span
          class={ui.sharedMode
            ? "icon-[lucide--eye] w-4 h-4"
            : "icon-[lucide--eye-off] w-4 h-4"}
        ></span></button
      >
      <button
        class="w-8 h-8 flex items-center justify-center border border-theme-border bg-theme-surface/80 text-theme-primary hover:bg-theme-primary/20 hover:text-theme-text transition"
        onclick={() => graph.toggleLabels()}
        title="Toggle Labels (L)"
        ><span
          class="icon-[lucide--tag] w-4 h-4 {graph.showLabels
            ? 'opacity-100'
            : 'opacity-50'}"
        ></span></button
      >
      <button
        class="w-8 h-8 flex items-center justify-center border border-theme-border bg-theme-surface/80 text-theme-primary hover:bg-theme-primary/20 hover:text-theme-text transition"
        onclick={() => graph.toggleImages()}
        title="Toggle Node Images (I)"
        ><span
          class="w-4 h-4 {graph.showImages
            ? 'icon-[lucide--image] opacity-100'
            : 'icon-[lucide--image-off] opacity-50'}"
        ></span></button
      >
      {#if !vault.isGuest}
        <button
          class="w-8 h-8 flex items-center justify-center border transition {connectMode
            ? 'border-theme-accent bg-theme-accent/20 text-theme-accent shadow-[0_0_10px_var(--color-theme-accent)]'
            : 'border-theme-border bg-theme-surface/80 text-theme-primary hover:bg-theme-primary/20 hover:text-theme-text'}"
          onclick={toggleConnectMode}
          title="Connect Mode (C)"
          ><span class="icon-[lucide--link] w-4 h-4"></span></button
        >
      {/if}
      <div class="h-6 w-px bg-theme-border/30 mx-2 hidden md:block"></div>
      <div class="hidden md:block"><FeatureHint hintId="lore-oracle" /></div>
    </div>
  </div>

  <div
    class="absolute inset-0 z-10 w-full h-full opacity-0 transition-opacity duration-500 {graphVisible
      ? 'opacity-100'
      : 'opacity-0'}"
    bind:this={container}
    data-testid="graph-canvas"
  ></div>

  {#if cy}
    <TimelineOverlay {cy} />
    <OrbitControls />
    <ContextMenu {cy} />
    <SelectionConnector {cy} />
  {/if}

  {#if hoveredEntityId && hoverPosition && hoveredEntity}
    <div
      class="absolute z-50 pointer-events-none"
      style:top="{hoverPosition.y}px"
      style:left="{hoverPosition.x}px"
      style:transform="translate(-50%, -115%)"
      transition:fade={{ duration: 150 }}
    >
      <div
        class="bg-theme-bg/95 border border-theme-primary/50 shadow-2xl p-4 rounded-sm max-w-[400px] min-w-[200px]"
        in:fly={{ y: 10, duration: 200 }}
      >
        <div
          class="text-xs font-bold text-theme-primary tracking-wider uppercase font-header mb-2 border-b border-theme-border/50 pb-1 flex justify-between"
        >
          <span>{hoveredEntity.title}</span>
          <span class="text-[10px] text-theme-muted">{hoveredEntity.type}</span>
        </div>
        <div
          class="text-sm text-theme-text/90 font-body leading-relaxed prose prose-p:my-1 prose-headings:text-theme-primary prose-headings:text-xs prose-strong:text-theme-primary prose-em:text-theme-secondary prose-headings:font-header"
        >
          {@html tooltipContent}
        </div>
        <div
          class="absolute -top-px -left-px w-2 h-2 border-t border-l border-theme-primary"
        ></div>
        <div
          class="absolute -bottom-px -right-px w-2 h-2 border-b border-r border-theme-primary"
        ></div>
      </div>
      <div
        class="absolute left-1/2 -translate-x-1/2 bottom-[-6px] w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-theme-primary/50"
      ></div>
    </div>
  {/if}

  {#if connectMode}
    <div
      class="absolute top-20 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-4 pointer-events-auto"
    >
      {#if !sourceId}<div
          class="bg-green-500/10 border border-green-500/50 text-green-200 px-4 py-1 rounded-full text-xs font-mono animate-bounce"
        >
          > SELECT SOURCE NODE
        </div>
      {:else}<div
          class="bg-yellow-500/10 border border-yellow-500/50 text-yellow-200 px-4 py-1 rounded-full text-xs font-mono animate-bounce"
        >
          > SELECT TARGET TO LINK
        </div>{/if}
      <FeatureHint hintId="connect-mode" />
    </div>
  {/if}

  {#if selectionCount >= 2 && !connectMode}
    <div
      class="absolute left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-3 pointer-events-auto {ui.isMobile
        ? 'bottom-24'
        : 'top-20'}"
      transition:fly={{ y: ui.isMobile ? 20 : -20, duration: 200 }}
    >
      <div class="flex gap-2">
        <button
          class="bg-theme-surface/90 backdrop-blur border border-theme-primary/50 text-theme-primary px-4 py-2 rounded-full text-[10px] font-mono shadow-xl hover:bg-theme-primary hover:text-theme-bg transition-all uppercase tracking-wider flex items-center gap-2 {ui.isMobile
            ? 'h-10 px-5'
            : 'py-1.5'}"
          onclick={() =>
            ui.openBulkLabelDialog(
              cy?.$("node:selected").map((n) => n.id()) || [],
            )}
          ><span
            class="icon-[lucide--layers] {ui.isMobile ? 'w-4 h-4' : 'w-3 h-3'}"
          ></span>Label ({selectionCount})</button
        >
        <button
          class="bg-theme-surface/90 backdrop-blur border border-theme-primary/50 text-theme-primary px-4 py-2 rounded-full text-[10px] font-mono shadow-xl hover:bg-theme-primary hover:text-theme-bg transition-all uppercase tracking-wider flex items-center gap-2 {ui.isMobile
            ? 'h-10 px-5'
            : 'py-1.5'}"
          onclick={() =>
            ui.openMergeDialog(cy?.$("node:selected").map((n) => n.id()) || [])}
          ><span
            class="icon-[lucide--git-merge] {ui.isMobile
              ? 'w-4 h-4'
              : 'w-3 h-3'}"
          ></span>Merge</button
        >
      </div>
      {#if !ui.isMobile}<FeatureHint hintId="node-merging" />{/if}
    </div>
  {/if}

  {#if editingEdge}
    <div
      class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30"
    >
      <div
        class="bg-theme-surface border border-theme-border shadow-2xl p-4 min-w-[280px]"
      >
        <div
          class="text-[10px] font-mono text-theme-primary uppercase tracking-widest mb-3"
        >
          Edit Connection
        </div>
        <div class="mb-2">
          <select
            bind:value={edgeEditType}
            class="w-full bg-theme-bg border border-theme-border text-theme-text px-3 py-2 text-xs font-mono focus:outline-none focus:border-theme-primary rounded uppercase"
          >
            <option value="related_to">Default (Grey)</option><option
              value="neutral">Neutral (Amber)</option
            ><option value="friendly">Friendly (Blue)</option><option
              value="enemy">Enemy (Red)</option
            >
          </select>
        </div>
        <input
          type="text"
          bind:value={edgeEditInput}
          placeholder="Enter description..."
          class="w-full bg-theme-bg border border-theme-border text-theme-text px-3 py-2 text-sm font-mono focus:outline-none focus:border-theme-primary rounded"
          onkeydown={(e) => {
            if (e.key === "Enter") saveEdgeLabel();
            if (e.key === "Escape") editingEdge = null;
          }}
        />
        <div class="flex gap-2 mt-3">
          <button
            class="flex-1 px-3 py-1.5 text-xs font-mono uppercase bg-theme-primary/10 border border-theme-primary/30 text-theme-primary hover:bg-theme-primary hover:text-theme-bg transition rounded"
            onclick={saveEdgeLabel}>Save</button
          >
          <button
            class="flex-1 px-3 py-1.5 text-xs font-mono uppercase bg-theme-surface border border-theme-border text-theme-muted hover:text-theme-primary transition rounded"
            onclick={() => (editingEdge = null)}>Cancel</button
          >
        </div>
        <button
          class="w-full mt-2 px-3 py-1.5 text-xs font-mono uppercase bg-red-900/20 border border-red-900/50 text-red-500 hover:bg-red-900/40 hover:text-red-400 transition"
          onclick={async () => {
            if (editingEdge) {
              await vault.removeConnection(
                editingEdge.source,
                editingEdge.target,
                editingEdge.type,
              );
              editingEdge = null;
            }
          }}>Delete Connection</button
        >
      </div>
    </div>
  {/if}
</div>

<svelte:window onkeydown={handleKeyDown} />
