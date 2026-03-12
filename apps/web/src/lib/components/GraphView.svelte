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
    getDynamicLayoutOptions,
    hasTimelineDate,
    type GraphNode,
    type GraphEdge,
  } from "graph-engine";

  cytoscape.use(fcose);
  import { themeStore } from "$lib/stores/theme.svelte";
  import Minimap from "./graph/Minimap.svelte";
  import TimelineControls from "$lib/components/graph/TimelineControls.svelte";
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

    debugStore.log(
      `[GraphView] Applying layout. isInitial=${isInitial}, isForced=${isForced}, caller=${caller}`,
    );

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
          debugStore.log("[GraphView] Calculating timeline layout...");
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
        debugStore.log(
          `[GraphView] Applying orbit layout for central node: ${graph.centralNodeId}`,
        );
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

          const elementsLen = graph.elements.length;
          for (let i = 0; i < elementsLen; i++) {
            const el = graph.elements[i] as any;
            if (el.group === "nodes") {
              snapshotNodes.push(el);
              if (!el.position) {
                hasNewNodes = true;
              }
            }
          }

          const cyNodes = currentCy.nodes();
          const isExitingTimeline =
            caller === "Timeline Toggle" && !graph.timelineMode;

          // CRITICAL FIX: Only randomize if we are explicitly forced OR if we are clumped at origin.
          // Otherwise, trust the positions provided by the transformer!
          // We check for clumping only if we have nodes.
          let randomize = isExitingTimeline;
          if (!randomize && cyNodes.length > 1) {
            let nodesAtOrigin = 0;
            cyNodes.forEach((n) => {
              const p = n.position();
              if (p.x === 0 && p.y === 0) nodesAtOrigin++;
            });
            if (nodesAtOrigin === cyNodes.length) {
              randomize = true;
              debugStore.log(
                "[GraphView] Nodes are clumped at origin, forcing randomization.",
              );
            }
          }

          if (
            graph.stableLayout &&
            !isForced &&
            !hasNewNodes &&
            !isExitingTimeline &&
            !randomize
          ) {
            if ((isInitial || caller === "Load Finalized") && currentCy) {
              debugStore.log(
                "[GraphView] Stable layout active: fitting existing positions.",
              );
              currentCy.resize();
              currentCy.animate({
                fit: { eles: currentCy.elements(), padding: 20 },
                duration: 800,
                easing: "ease-out-cubic",
                complete: () => {
                  _layoutReady = true;
                },
              });
              graphVisible = true;
            }

            isLayoutRunning = false;
            return;
          }

          const width = currentCy.width();
          const height = currentCy.height();
          const ar = width / height;
          const isLandscape = ar > 1.2;

          debugStore.log(
            `[GraphView] Running FCOSE layout. randomize=${randomize}, nodes=${cyNodes.length}`,
          );

          currentLayout = currentCy.layout({
            ...getDynamicLayoutOptions(cyNodes.length),
            boundingBox: { x1: -2000, y1: -2000, x2: 2000, y2: 2000 },
            gravity: isLandscape ? 0.1 : 0.8,
            randomize,
            animate: false,
            fit: false,
          } as any);

          const layout = currentLayout;
          layout.one("layoutstop", () => {
            if (currentLayout !== layout || currentCy.destroyed()) return;

            debugStore.log(
              `[GraphView] Layout calculation complete. Animating camera to fit (from zoom: ${currentCy.zoom().toFixed(3)}).`,
            );
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
                const source = sourceId;
                const target = targetId;
                await vault.addConnection(source, target, "neutral");
                toggleConnectMode();
              }
            } else {
              selectedId = targetId;
            }
          });

          instance.on("tap", "edge", (evt: any) => {
            const edge = evt.target;
            const data = edge.data();
            editingEdge = {
              source: data.source,
              target: data.target,
              label: data.label || "",
              type: data.connectionType || "neutral",
            };
            edgeEditInput = editingEdge.label;
            edgeEditType = editingEdge.type;
          });

          instance.on("tap", (evt: any) => {
            if (evt.target === instance) {
              selectedId = null;
              if (connectMode) toggleConnectMode();
            }
          });

          // Set initial visibility
          graphVisible = true;
        } catch (err) {
          debugStore.error("Graph Init Failed", err);
        }
      }, 50);
    }
  });

  onDestroy(() => {
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
  const resolvingIds = new Set<string>();

  // Reset loading state when vault starts loading
  $effect(() => {
    if (vault.status === "loading") {
      untrack(() => {
        initialLoaded = false;
        didFinalizeLoad = false;
        // Clear cache and revoke all blobs to prevent memory leaks
        urlCache.forEach((url) => {
          if (url.startsWith("blob:")) URL.revokeObjectURL(url);
        });
        urlCache.clear();
        resolvingIds.clear();
      });
    }
  });

  // FLICKER PREVENTION: Lockdown global style effect during loading.
  let activeStyleJson = "";
  $effect(() => {
    const currentStyle = graphStyle;
    const currentCy = cy;

    // While loading, we ALLOW global style updates if they actually change,
    // but the lockdown condition was causing a final jump when it was lifted.
    if (currentCy && currentStyle) {
      const styleJson = JSON.stringify(currentStyle);
      if (styleJson !== activeStyleJson) {
        activeStyleJson = styleJson;
        untrack(() => {
          currentCy.style(currentStyle);
        });
      }
    }
  });

  // Load Finalization Trigger
  $effect(() => {
    if (vault.status === "idle" && initialLoaded && !didFinalizeLoad) {
      didFinalizeLoad = true;
      debugStore.log(
        "[GraphView] Vault load finalized, unlocking all updates.",
      );
      // Force layout with fitting when loading is finalized
      applyCurrentLayout(false, true, "Load Finalized");
    }
  });

  $effect(() => {
    const currentCy = cy;
    if (currentCy && graph.activeLabels) {
      const active = Array.from(graph.activeLabels).map((l) => l.toLowerCase());
      const filterMode = graph.labelFilterMode;

      // ⚡ Bolt Optimization: Scratch array declared once per effect run and reused
      // across all nodes to avoid per-node allocations for lowercased labels.
      const lowerScratch: string[] = [];
      currentCy.batch(() => {
        currentCy.nodes().forEach((node) => {
          const entity = vault.entities[node.id()];
          if (!entity) return;
          let hasMatch = active.length === 0;

          if (!hasMatch && entity.labels && entity.labels.length > 0) {
            const labels = entity.labels;

            // Pre-lowercase each label exactly once per node into the scratch array,
            // then compare against active filters using simple string equality.
            lowerScratch.length = labels.length;
            for (let j = 0; j < labels.length; j++) {
              lowerScratch[j] = labels[j].toLowerCase();
            }

            if (filterMode === "AND") {
              hasMatch = true;
              for (let i = 0; i < active.length; i++) {
                let found = false;
                for (let j = 0; j < lowerScratch.length; j++) {
                  if (lowerScratch[j] === active[i]) {
                    found = true;
                    break;
                  }
                }
                if (!found) {
                  hasMatch = false;
                  break;
                }
              }
            } else {
              hasMatch = false;
              for (let i = 0; i < active.length; i++) {
                for (let j = 0; j < lowerScratch.length; j++) {
                  if (lowerScratch[j] === active[i]) {
                    hasMatch = true;
                    break;
                  }
                }
                if (hasMatch) break;
              }
            }
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
            if (!("source" in el.data)) {
              newNodes.push(el as GraphNode);
            } else {
              newEdges.push(el as GraphEdge);
            }
          }
        });

        if (newNodes.length > 0 || newEdges.length > 0) {
          debugStore.log(
            `[GraphView] Incremental update: +${newNodes.length} nodes, +${newEdges.length} edges.`,
          );
          if (newNodes.length > 0) {
            const addedNodes = currentCy.add(newNodes);
            addedNodes.forEach((n) => {
              elementMap.set(n.id(), n);
              // EXPLICIT FORCE: Cytoscape sometimes ignores 'position' in cy.add()
              // depending on initialization state. Force it immediately.
              const originalNode = newNodes.find((nn) => nn.data.id === n.id());
              if (originalNode && originalNode.position) {
                n.position(originalNode.position);
              }
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

        // Incremental Data Sync
        currentCy.batch(() => {
          snapshotElements.forEach((el) => {
            const node = elementMap.get(el.data.id);
            if (node) {
              const currentData = node.data();
              const newData = el.data as Record<string, any>;
              const patch: Record<string, any> = {};
              let hasChanges = false;

              for (const k in newData) {
                if (k === "id" || !Object.hasOwn(newData, k)) continue;

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
                      isMatch = newVal.x === curVal.x && newVal.y === curVal.y;
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
            }
          });
        });

        const isFirstElements = !initialLoaded && graph.elements.length > 0;
        if (newNodes.length > 0 || isFirstElements) {
          if (isFirstElements) {
            debugStore.log(
              "[GraphView] First elements received, setting initial wide viewport.",
            );
            initialLoaded = true;
            graphVisible = true;
            // Set a static, wide camera view for the loading phase
            const w = currentCy.width();
            const h = currentCy.height();
            currentCy.viewport({ zoom: 0.15, pan: { x: w / 2, y: h / 2 } });
          } else if (isVaultLoading) {
            graphVisible = true;
          } else {
            applyCurrentLayout(false, !graph.stableLayout, "Elements Update");
          }
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

  $effect(() => {
    const currentCy = cy;
    const showImages = graph.showImages;
    const elements = graph.elements;

    if (currentCy && elements && showImages) {
      untrack(() => {
        const nodesWithImages = currentCy
          .nodes()
          .filter(
            (n) =>
              (n.data("image") || n.data("thumbnail")) &&
              !n.data("resolvedImage") &&
              !resolvingIds.has(n.id()),
          );

        if (nodesWithImages.length === 0) return;

        // Mark them all as resolving immediately
        nodesWithImages.forEach((n) => {
          resolvingIds.add(n.id());
        });

        // Bulk process all images concurrently
        void (async () => {
          try {
            const results = await Promise.all(
              nodesWithImages.map(async (node) => {
                const imagePath = node.data("image") || node.data("thumbnail");
                let url = urlCache.get(imagePath);
                if (!url) {
                  url = await vault.resolveImageUrl(imagePath);
                  if (url) urlCache.set(imagePath, url);
                }
                return {
                  node,
                  url,
                  oldUrl: node.data("resolvedImage") as string | undefined,
                };
              }),
            );

            if (currentCy.destroyed() || !graph.showImages) {
              nodesWithImages.forEach((n) => {
                resolvingIds.delete(n.id());
              });
              return;
            }

            // Apply in smaller batches if many images are resolved at once to prevent massive style churn
            const batchSize = 10;
            for (let i = 0; i < results.length; i += batchSize) {
              const chunk = results.slice(i, i + batchSize);
              currentCy.batch(() => {
                for (const { node, url, oldUrl } of chunk) {
                  if (url && url !== oldUrl) {
                    node.data("resolvedImage", url);
                    if (oldUrl?.startsWith("blob:")) {
                      URL.revokeObjectURL(oldUrl);
                    }
                  }
                }
              });
            }
          } catch (err) {
            debugStore.error("Incremental image resolution failed", err);
            nodesWithImages.forEach((n) => {
              resolvingIds.delete(n.id());
            });
          }
        })();
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
        class="w-8 h-8 items-center justify-center border hidden md:flex transition {ui.sharedMode
          ? 'bg-amber-500/20 border-amber-500/50 text-amber-500'
          : 'border-theme-border bg-theme-surface/80 text-theme-muted hover:text-theme-primary'}"
        onclick={() => (ui.sharedMode = !ui.sharedMode)}
        title={ui.sharedMode ? "Exit Shared Mode" : "Enter Shared Mode"}
        aria-label="Toggle Shared Mode"
        data-testid="shared-mode-toggle"
        aria-pressed={ui.sharedMode}
        ><span
          class={ui.sharedMode
            ? "icon-[lucide--eye] w-4 h-4"
            : "icon-[lucide--eye-off] w-4 h-4"}
        ></span></button
      >
      <button
        class="w-8 h-8 items-center justify-center border hidden md:flex transition {graph.showLabels
          ? 'border-theme-primary bg-theme-primary/20 text-theme-primary'
          : 'border-theme-border bg-theme-surface/80 text-theme-muted hover:text-theme-primary'}"
        onclick={() => void graph.toggleLabels().catch((e) => console.error(e))}
        title={graph.showLabels ? "Labels: ON" : "Labels: OFF"}
        aria-label="Toggle Labels"
        aria-pressed={graph.showLabels}
        ><span class="icon-[lucide--type] w-4 h-4"></span></button
      >
      <button
        class="w-8 h-8 items-center justify-center border hidden md:flex transition {graph.showImages
          ? 'border-theme-primary bg-theme-primary/20 text-theme-primary'
          : 'border-theme-border bg-theme-surface/80 text-theme-muted hover:text-theme-primary'}"
        onclick={() => void graph.toggleImages().catch((e) => console.error(e))}
        title={graph.showImages ? "Images: ON" : "Images: OFF"}
        aria-label="Toggle Images"
        aria-pressed={graph.showImages}
        ><span class="icon-[lucide--image] w-4 h-4"></span></button
      >
    </div>
  </div>

  <OrbitControls />

  <div
    bind:this={container}
    class="w-full h-full {graphVisible
      ? 'opacity-100'
      : 'opacity-0'} transition-opacity duration-1000"
  ></div>

  {#if hoveredEntityId && hoverPosition}
    <div
      class="fixed z-50 pointer-events-none bg-theme-surface/90 backdrop-blur-md border border-theme-primary/30 p-4 shadow-2xl max-w-xs overflow-hidden"
      style="left: {hoverPosition.x + 20}px; top: {hoverPosition.y - 20}px;"
      transition:fly={{ y: 10, duration: 200 }}
    >
      <div class="flex flex-col gap-2">
        <h3
          class="text-theme-primary font-header font-bold text-xs uppercase tracking-widest border-b border-theme-primary/20 pb-1"
        >
          {hoveredEntity?.title || hoveredEntityId}
        </h3>
        <div class="prose prose-invert prose-xs text-[10px] line-clamp-4">
          {@html tooltipContent}
        </div>
        {#if hoveredEntity?.tags?.length}
          <div class="flex flex-wrap gap-1 mt-1">
            {#each hoveredEntity.tags as tag}
              <span
                class="px-1.5 py-0.5 bg-theme-primary/10 border border-theme-primary/20 text-theme-primary text-[8px] font-mono rounded"
                >{tag}</span
              >
            {/each}
          </div>
        {/if}
      </div>
    </div>
  {/if}

  {#if editingEdge}
    <div
      class="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
      transition:fade={{ duration: 200 }}
    >
      <div
        class="bg-theme-surface border border-theme-primary p-6 shadow-2xl w-full max-w-md"
        transition:fly={{ y: 20, duration: 300 }}
      >
        <h2
          class="text-theme-primary font-header font-bold text-sm uppercase tracking-[0.2em] mb-4"
        >
          Update Connection
        </h2>

        <div class="space-y-4">
          <div>
            <label
              for="edge-label"
              class="block text-[10px] font-bold text-theme-muted uppercase mb-1"
              >Label</label
            >
            <input
              id="edge-label"
              type="text"
              bind:value={edgeEditInput}
              class="w-full bg-theme-bg border border-theme-border px-3 py-2 text-xs focus:border-theme-primary outline-none text-theme-text transition-colors"
              placeholder="Friend, Enemy, Leader..."
            />
          </div>

          <div>
            <label
              for="edge-type"
              class="block text-[10px] font-bold text-theme-muted uppercase mb-1"
              >Relationship Nature</label
            >
            <select
              id="edge-type"
              bind:value={edgeEditType}
              class="w-full bg-theme-bg border border-theme-border px-3 py-2 text-xs focus:border-theme-primary outline-none text-theme-text transition-colors"
            >
              <option value="friendly">Friendly</option>
              <option value="neutral">Neutral</option>
              <option value="enemy">Hostile</option>
            </select>
          </div>

          <div class="flex justify-between items-center pt-4">
            <button
              onclick={async () => {
                if (editingEdge) {
                  await vault.removeConnection(
                    editingEdge.source,
                    editingEdge.target,
                    editingEdge.type,
                  );
                  editingEdge = null;
                }
              }}
              class="text-[10px] font-bold text-red-500 hover:text-red-400 uppercase tracking-widest transition-colors"
            >
              Sever Connection
            </button>

            <div class="flex gap-2">
              <button
                onclick={() => (editingEdge = null)}
                class="px-4 py-2 text-[10px] font-bold text-theme-muted hover:text-theme-text uppercase tracking-widest transition-colors"
              >
                Cancel
              </button>
              <button
                onclick={saveEdgeLabel}
                class="px-6 py-2 bg-theme-primary text-theme-bg text-[10px] font-bold uppercase tracking-widest hover:bg-theme-secondary transition-colors"
              >
                Sync Data
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  {/if}

  {#if cy}
    <ContextMenu {cy} />
    <SelectionConnector {cy} />
  {/if}
  <FeatureHint hintId="graph-controls" />
</div>

<svelte:window onkeydown={handleKeyDown} />

<style>
  :global(.selected-source) {
    box-shadow: 0 0 20px #facc15;
    z-index: 1000 !important;
  }
</style>
