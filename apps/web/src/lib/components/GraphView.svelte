<script lang="ts">
  import { fade, fly } from "svelte/transition";
  import { onMount, onDestroy, untrack } from "svelte";
  import { initGraph } from "graph-engine";
  import { graph } from "$lib/stores/graph.svelte";
  import { vault } from "$lib/stores/vault.svelte";
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
  import Minimap from "$lib/components/graph/Minimap.svelte";
  import TimelineControls from "$lib/components/graph/TimelineControls.svelte";
  import TimelineOverlay from "$lib/components/graph/TimelineOverlay.svelte";
  import OrbitControls from "$lib/components/graph/OrbitControls.svelte";
  import ContextMenu from "$lib/components/graph/ContextMenu.svelte";
  import SelectionConnector from "$lib/components/graph/SelectionConnector.svelte";
  import FeatureHint from "$lib/components/help/FeatureHint.svelte";
  import { setCentralNode } from "graph-engine";
  import LabelFilter from "$lib/components/labels/LabelFilter.svelte";
  import CategoryFilter from "$lib/components/labels/CategoryFilter.svelte";
  import { layoutService } from "$lib/services/layout";

  let container: HTMLElement;
  let cy: Core | undefined = $state();
  let currentLayout: any;
  let stabilizationTimeout: number | undefined;
  let isLayoutRunning = $state(false);

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
              label: "", // Labels handled by TimelineOverlay or toggled off
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
            // If the target node no longer exists, clear focus/dimming.
            allEles.removeClass("dimmed neighborhood secondary-neighborhood");
          }
        }
      });
    } catch {
      // Ignore if cy is partially destroyed
    }
  };

  // Hover state
  let hoveredEntityId = $state<string | null>(null);
  let hoverPosition = $state<{ x: number; y: number } | null>(null);
  let hoverTimeout: number | undefined;
  let selectionCount = $state(0);
  const HOVER_DELAY = 800; // ms

  // Edge editing state
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
    allowMovement = false,
  ) => {
    const currentCy = cy;
    if (!currentCy) return;
    if (currentLayout) {
      try {
        currentLayout.stop();
      } catch {
        /* ignore */
      }
    }

    if (vault.isGuest) {
      // For guests, we rely entirely on synced positions.
      // Simply fit to view initially if needed.
      if (isInitial) {
        currentCy.fit(currentCy.elements(), 40);
      }
      isLayoutRunning = false;
      return;
    }

    if (graph.timelineMode) {
      isLayoutRunning = true;
      try {
        const nodes = graph.elements.filter(
          (e) => e.group === "nodes",
        ) as any[];

        const positions = await layoutService.runTimeline(
          $state.snapshot(nodes),
          {
            axis: graph.timelineAxis,
            scale: graph.timelineScale,
            jitter: 150,
          },
        );

        if (!cy || currentCy.destroyed()) return;

        currentCy
          .layout({
            name: "preset",
            positions: positions,
            animate: true,
            animationDuration: 500,
            animationEasing: "ease-out-cubic",
          })
          .run();
      } catch (err) {
        console.error("Timeline layout failed:", err);
      } finally {
        isLayoutRunning = false;
      }
    } else if (graph.orbitMode && graph.centralNodeId) {
      setCentralNode(currentCy, graph.centralNodeId);
      if (isInitial) {
        currentCy.resize();
        currentCy.animate({
          fit: { eles: currentCy.elements(), padding: 40 },
          duration: 800,
          easing: "ease-out-cubic",
        });
      }
    } else {
      // Background FCOSE Layout
      isLayoutRunning = true;
      try {
        // Use live dimensions from Cytoscape if available, otherwise fallback to store
        // This ensures the layout accounts for resolved image sizes
        const snapshotElements = $state.snapshot(graph.elements);
        let elements = snapshotElements;

        if (currentCy) {
          // Optimization: Create a map of node dimensions to avoid repetitive cy.$id() calls
          // This reduces complexity from O(N*logN) to O(N) for dimension sync
          const nodeDimensions = new Map<
            string,
            { width: number | undefined; height: number | undefined }
          >();

          currentCy.nodes().forEach((node) => {
            const w = node.data("width");
            const h = node.data("height");
            if (w !== undefined || h !== undefined) {
              nodeDimensions.set(node.id(), { width: w, height: h });
            }
          });

          if (nodeDimensions.size > 0) {
            elements = snapshotElements.map((el: any) => {
              if (el.group === "nodes") {
                const dims = nodeDimensions.get(el.data.id);
                if (dims) {
                  return {
                    ...el,
                    data: {
                      ...el.data,
                      width: dims.width ?? el.data.width,
                      height: dims.height ?? el.data.height,
                    },
                  };
                }
              }
              return el;
            });
          }
        }

        const elementByNodeId = new Map<string, any>();
        elements.forEach((el: any) => {
          if (el.group === "nodes" && el.data?.id) {
            if (!elementByNodeId.has(el.data.id)) {
              elementByNodeId.set(el.data.id, el);
            }
          }
        });

        const fixedNodeConstraint =
          graph.stableLayout && !isInitial && !allowMovement
            ? elements
                .filter((el: any) => el.group === "nodes" && el.position)
                .map((el: any) => ({
                  nodeId: el.data.id,
                  position: el.position,
                }))
            : undefined;

        // If in stable mode and not forced (isInitial), and we have no new nodes to place,
        // and movement is not allowed (e.g. by showImages toggle),
        // we can skip the layout engine entirely and just snap positions.
        const hasNewNodes = elements.some(
          (el: any) => el.group === "nodes" && !el.position,
        );

        if (
          graph.stableLayout &&
          !isInitial &&
          !hasNewNodes &&
          !allowMovement
        ) {
          // Just ensure all nodes are in sync with their metadata positions
          currentCy.nodes().forEach((n) => {
            const el = elementByNodeId.get(n.id());
            if (el?.position) {
              n.position(el.position);
            }
          });
          isLayoutRunning = false;
          return;
        }

        const positions = await layoutService.runFcose(elements, {
          ...DEFAULT_LAYOUT_OPTIONS,
          showImages: graph.showImages,
          randomize: isInitial ? true : !graph.stableLayout,
          fixedNodeConstraint,
          animate: false, // Math only in worker
        });

        if (!cy || currentCy.destroyed()) return;

        // Apply positions. In stable mode, we snap immediately to avoid layout jitter.
        // If it's a forced layout (isInitial), we always animate for visual feedback.
        if (graph.stableLayout && !isInitial) {
          currentCy.nodes().forEach((n) => {
            const pos = positions[n.id()];
            if (pos) n.position(pos);
          });
        } else {
          currentCy
            .layout({
              name: "preset",
              positions: positions,
              animate: true,
              animationDuration: DEFAULT_LAYOUT_OPTIONS.animationDuration,
              animationEasing: "ease-out-quad",
              stop: () => {
                if (isInitial && currentCy) {
                  currentCy.fit(currentCy.elements(), 40);
                }
              },
            })
            .run();
        }

        // SYNC: Update vault with new positions
        // We do this after the layout is calculated so guests get the data.
        {
          const updates: Record<string, Partial<Entity>> = {};
          for (const [id, pos] of Object.entries(positions)) {
            updates[id] = {
              metadata: {
                ...(vault.entities[id]?.metadata || {}),
                coordinates: { x: Math.round(pos.x), y: Math.round(pos.y) },
              },
            };
          }
          if (Object.keys(updates).length > 0) {
            vault.batchUpdateEntities(updates as any);
          }
        }
      } catch (err) {
        console.error("Background layout failed:", err);
        // Fallback to main thread
        if (cy && !currentCy.destroyed()) {
          currentLayout = currentCy.layout({
            ...DEFAULT_LAYOUT_OPTIONS,
            stop: () => {
              // Sync fallback layout too
              if (!vault.isGuest && currentCy) {
                const updates: Record<string, Partial<Entity>> = {};
                currentCy.nodes().forEach((node) => {
                  updates[node.id()] = {
                    metadata: {
                      ...(vault.entities[node.id()]?.metadata || {}),
                      coordinates: node.position(),
                    },
                  };
                });
                if (Object.keys(updates).length > 0) {
                  vault.batchUpdateEntities(updates as any);
                }
              }
            },
          });
          currentLayout.run();
        }
      } finally {
        isLayoutRunning = false;
      }
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
    if (e.key.toLowerCase() === "t" && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const target = document.activeElement;
      if (
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        (target as HTMLElement)?.isContentEditable
      )
        return;
      graph.toggleTimeline();
      applyCurrentLayout();
    }
    if (e.key.toLowerCase() === "c" && !e.ctrlKey && !e.metaKey && !e.altKey) {
      if (vault.isGuest) return;
      // Don't toggle if user is typing in an input (though we don't have many here yet)
      const target = document.activeElement;
      if (
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        (target as HTMLElement)?.isContentEditable
      )
        return;
      toggleConnectMode();
    }
    if (e.key.toLowerCase() === "l" && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const target = document.activeElement;
      if (
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        (target as HTMLElement)?.isContentEditable
      )
        return;
      graph.toggleLabels();
    }
    if (e.key.toLowerCase() === "i" && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const target = document.activeElement;
      if (
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        (target as HTMLElement)?.isContentEditable
      )
        return;
      graph.toggleImages();
    }
    if (e.key === "Escape" && connectMode) {
      toggleConnectMode();
    }
  };

  let initTimer: ReturnType<typeof setTimeout> | null = null;

  onMount(() => {
    if (container) {
      // Defer graph initialization to next task queue tick.
      // This yields the main thread back to the browser so Svelte can completely
      // remove the "Initiating Neural Interface..." screen and paint the empty frame
      // BEFORE Cytoscape synchronously locks up the main thread with 1000s of elements.
      initTimer = setTimeout(async () => {
        if (!container) return; // Guard against rapid unmounts

        try {
          const instance = (await initGraph({
            container,
            elements: untrack(() => graph.elements), // Initialize with current elements
            style: untrack(() => graphStyle),
          })) as any;

          // If the timer was cleared by onDestroy, cleanup the orphan instance
          if (initTimer === null) {
            instance.destroy();
            return;
          }

          cy = instance;

          // Expose for E2E testing
          if (import.meta.env.DEV || (window as any).__E2E__) {
            (window as any).cy = instance;
          }

          // Hover events
          instance.on("mouseover", "node", (evt: any) => {
            const node = evt.target;
            clearTimeout(hoverTimeout);
            hoverTimeout = window.setTimeout(() => {
              const renderedPos = node.renderedPosition();
              hoverPosition = {
                x: renderedPos.x,
                y: renderedPos.y,
              };
              hoveredEntityId = node.id();
            }, HOVER_DELAY);
          });

          instance.on("mouseout", "node", (_evt: any) => {
            clearTimeout(hoverTimeout);
            hoveredEntityId = null;
            hoverPosition = null;
          });

          // Update hover position on drag/pan/zoom to keep it attached (optional but nice)
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
                // Create the connection in the store
                await vault.addConnection(sourceId, targetId, "neutral");

                instance?.$(".selected-source").removeClass("selected-source");
                sourceId = null;
                connectMode = false; // Auto exit connect mode
              }
            } else if (graph.orbitMode) {
              // US2: Switch center if clicked in orbit mode
              graph.setCentralNode(targetId);
              // Also show the detail panel for the node
              selectedId = targetId;
            } else {
              // Selection Logic for Detail Panel
              selectedId = targetId;
            }
          });

          // Right-click on edge to edit label
          instance.on("cxttap", "edge", (evt: any) => {
            if (vault.isGuest) return;
            const edge = evt.target;
            const sourceId = edge.data("source");
            const targetId = edge.data("target");
            const currentLabel = edge.data("label") || "";
            const currentType = edge.data("connectionType") || "neutral";

            editingEdge = {
              source: sourceId,
              target: targetId,
              label: currentLabel,
              type: currentType,
            };
            edgeEditInput = currentLabel;
            edgeEditType = currentType;
          });

          instance.on("tap", (evt: any) => {
            if (evt.target === instance) {
              // Only clear selection if we clicked strictly on background, not on node
              if (!connectMode) {
                selectedId = null;
              }
              // Close edge editor on background tap
              editingEdge = null;
            }
          });

          instance.on("select unselect", "node", () => {
            selectionCount = instance?.$("node:selected").length || 0;
          });

          // Save position on drag end
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
          console.error("Failed to initialize graph:", error);
        }
      }, 0);
    }
  });

  onDestroy(() => {
    if (currentLayout) {
      try {
        currentLayout.stop();
      } catch {
        // Ignore
      }
    }
    if (cy) {
      cy.destroy();
      cy = undefined;
    }
    if (initTimer) {
      clearTimeout(initTimer);
      initTimer = null;
    }
    if (import.meta.env.DEV) {
      delete (window as any).cy;
    }
    clearTimeout(hoverTimeout);
  });

  // Reactive effect to update graph when store changes
  let initialLoaded = $state(false);

  let lastStyle: any[] = [];
  $effect(() => {
    const currentStyle = graphStyle;
    const currentCy = cy;
    if (currentCy && currentStyle) {
      const _isNewRef = currentStyle !== lastStyle;
      lastStyle = currentStyle;
      untrack(() => {
        currentCy.style(currentStyle);
      });
    }
  });

  $effect(() => {
    const currentCy = cy;
    if (currentCy && graph.activeLabels) {
      const active = Array.from(graph.activeLabels).map((l) => l.toLowerCase());
      currentCy.batch(() => {
        currentCy.nodes().forEach((node) => {
          const entity = vault.entities[node.id()];
          if (!entity) return;

          const hasMatch =
            active.length === 0 ||
            (entity.labels || []).some((l) => active.includes(l.toLowerCase()));

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
      const active = Array.from(graph.activeCategories);
      const entities = vault.entities;
      currentCy.batch(() => {
        currentCy.nodes().forEach((node) => {
          const entity = entities[node.id()];
          if (!entity) return;

          const hasMatch = active.length === 0 || active.includes(entity.type);

          if (hasMatch) {
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
    const isTimelineMode = graph.timelineMode;
    const _elements = graph.elements;
    if (!currentCy) return;
    currentCy.batch(() => {
      currentCy.nodes().forEach((node) => {
        const data = node.data() as GraphNode["data"];
        const hasDate = hasTimelineDate({ group: "nodes", data });
        if (isTimelineMode && !hasDate) {
          node.addClass("timeline-hidden");
        } else {
          node.removeClass("timeline-hidden");
        }
      });
    });
  });

  // Reactive effect to resolve node images
  $effect(() => {
    const currentCy = cy;
    if (currentCy && graph.elements) {
      const currentElements = graph.elements;
      const timeout = setTimeout(async () => {
        try {
          // Optimization: Pre-calculate resolved images map for O(1) lookups
          const resolvedImages = new Map<string, string>();
          if (currentCy) {
            currentCy.nodes("[resolvedImage]").forEach((node) => {
              const resolvedImagePath = node.data("resolvedImagePath");
              if (typeof resolvedImagePath === "string") {
                resolvedImages.set(node.id(), resolvedImagePath);
              }
            });
          }

          const nodesToResolve = currentElements.filter((el): el is any => {
            if (el.group !== "nodes") return false;
            const imagePath = el.data.thumbnail || el.data.image;
            if (!imagePath) return false;

            // Check if already resolved in Cytoscape
            const resolvedPath = resolvedImages.get(el.data.id);
            if (resolvedPath === imagePath) {
              return false;
            }
            return true;
          });

          // CHUNK_SIZE processing
          const CHUNK_SIZE = 20;
          let hasUpdates = false;
          for (let i = 0; i < nodesToResolve.length; i += CHUNK_SIZE) {
            const chunk = nodesToResolve.slice(i, i + CHUNK_SIZE);
            await Promise.all(
              chunk.map(async (el) => {
                const data = el.data as any;
                const imagePath = data.thumbnail || data.image;
                if (!imagePath) return;

                const resolvedUrl = await vault.resolveImageUrl(imagePath);

                if (resolvedUrl && currentCy) {
                  // Race condition guard: verify the node still exists and
                  // its image path hasn't changed while we were resolving
                  const node = currentCy.$id(data.id);
                  if (node.length === 0) return;
                  const currentNodeData = node.data();
                  const currentPath =
                    currentNodeData.thumbnail || currentNodeData.image;
                  if (currentPath !== imagePath) return;

                  let w = data.width;
                  let h = data.height;

                  if (!w || !h) {
                    // Detect image dimensions only if missing
                    const img = new Image();
                    img.crossOrigin = "anonymous";
                    img.src = resolvedUrl;
                    await new Promise((resolve) => {
                      img.onload = resolve;
                      img.onerror = resolve; // Continue even if image fails to load
                    });

                    w = img.naturalWidth || 100;
                    h = img.naturalHeight || 100;
                  }

                  // Calculate scaled dimensions (max aspect 2.0, max size 64)
                  const maxDim = 64;
                  const ratio = w / h;

                  if (w > h) {
                    w = maxDim;
                    h = maxDim / ratio;
                  } else {
                    h = maxDim;
                    w = maxDim * ratio;
                  }

                  // Hard constraints to prevent extreme boxes
                  if (w / h > 2.5) {
                    w = h * 2.5;
                  }
                  if (h / w > 2.5) {
                    h = w * 2.5;
                  }

                  currentCy.batch(() => {
                    // Revoke previous blob URL to prevent memory leaks
                    const oldUrl = node.data("resolvedImage");
                    if (
                      oldUrl &&
                      oldUrl.startsWith("blob:") &&
                      oldUrl !== resolvedUrl
                    ) {
                      URL.revokeObjectURL(oldUrl);
                    }

                    node.data({
                      resolvedImage: resolvedUrl,
                      resolvedImagePath: imagePath,
                      width: Math.round(w),
                      height: Math.round(h),
                    });
                    hasUpdates = true;
                  });
                }
              }),
            );
          }

          if (hasUpdates && cy && !cy.destroyed()) {
            // Re-run layout now that node dimensions are accurate
            // Use a slight delay to allow batching if multiple chunks finish close together
            setTimeout(() => {
              if (cy && !cy.destroyed())
                applyCurrentLayout(false, graph.showImages);
            }, 200);
          }
        } catch (error) {
          console.error("Failed to resolve node images", error);
        }
      }, 100); // 100ms debounce

      return () => clearTimeout(timeout);
    }
  });

  // Center on selection when it changes externally
  $effect(() => {
    if (cy) {
      // Re-apply orbit layout if params change
      const _orbit = graph.orbitMode;
      const _center = graph.centralNodeId;
      const _timeline = graph.timelineMode;

      untrack(() => {
        if (!initialLoaded) return;
        // Defer layout application to break synchronous reactive cycles
        // preventing 'effect_update_depth_exceeded' errors
        setTimeout(() => {
          applyCurrentLayout(false, false);
        }, 0);
      });
    }
  });

  $effect(() => {
    const currentCy = cy;
    const _id = selectedId; // Track selection state
    const _findTrigger = ui.findNodeCounter; // Trigger effect when findInGraph is called

    if (currentCy) {
      applyFocus(selectedId);

      // Small delay to allow flex layout to settle before resizing
      const timer = setTimeout(() => {
        currentCy.resize();
        if (selectedId) {
          const node = currentCy.$id(selectedId);
          if (node.length > 0) {
            currentCy.animate({
              center: { eles: node },
              duration: 500,
              easing: "ease-out-cubic",
            });
          }
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  });

  // Manual fit request listener
  $effect(() => {
    const currentCy = cy;
    if (currentCy && graph.fitRequest > 0) {
      const _req = graph.fitRequest; // track dependency
      untrack(() => {
        currentCy.animate({
          fit: {
            eles: currentCy.elements(),
            padding: 50,
          },
          duration: 800,
          easing: "ease-out-cubic",
        });
      });
    }
  });

  let lastShowImages = graph.showImages;
  $effect(() => {
    const currentCy = cy;
    if (currentCy && graph.elements) {
      const showImagesChanged = lastShowImages !== graph.showImages;
      lastShowImages = graph.showImages;
      const _images = graph.showImages; // Re-run layout when images are toggled
      try {
        currentCy.resize(); // Ensure viewport is up to date

        // 0. Take a consistent snapshot of the entire elements array
        // This breaks reactivity and prevents infinite loops/DataCloneErrors
        const snapshotElements = $state.snapshot(graph.elements);

        // 1. Build Set of target IDs (avoiding map allocation)
        const targetIds = new Set<string>();
        const snapshotLength = snapshotElements.length;
        for (let i = 0; i < snapshotLength; i++) {
          targetIds.add(snapshotElements[i].data.id);
        }

        // 2. Build map of current elements AND identify removals in one pass
        const elementMap = new Map<string, any>();
        const elementsToRemove: any[] = [];

        // Iterating cy.elements() directly avoids Array.from overhead
        const currentElements = currentCy.elements();
        const currentLength = currentElements.length;
        for (let i = 0; i < currentLength; i++) {
          const el = currentElements[i];
          const id = el.id();
          if (!targetIds.has(id)) {
            elementsToRemove.push(el);
          } else {
            elementMap.set(id, el);
          }
        }

        if (elementsToRemove.length > 0) {
          currentCy.remove(currentCy.collection(elementsToRemove));
        }

        // 3. Add new elements safely
        // OPTIMIZATION: Single pass to filter and classify new elements
        // Avoids multiple filter passes and intermediate array allocations
        const newNodes: GraphNode[] = [];
        const newEdges: GraphEdge[] = [];

        // Use cached snapshotLength for consistency and minor performance gains
        for (let i = 0; i < snapshotLength; i++) {
          const el = snapshotElements[i];
          if (!elementMap.has(el.data.id)) {
            // Use 'in' check to match original behavior strictly
            if (!("source" in el.data)) {
              newNodes.push(el as GraphNode);
            } else {
              newEdges.push(el as GraphEdge);
            }
          }
        }

        if (newNodes.length > 0 || newEdges.length > 0) {
          // Always add nodes first
          if (newNodes.length > 0) {
            const addedNodes = currentCy.add(newNodes);
            // OPTIMIZATION: Hydrate elementMap with ONLY the newly added nodes
            // Avoids O(N) full graph scan
            addedNodes.forEach((n) => {
              elementMap.set(n.id(), n);
            });
          }

          // Then add edges, but ONLY if both source and target exist in the graph
          const validEdges = newEdges.filter((edge) => {
            const edgeData = edge.data as {
              source?: string;
              target?: string;
              id: string;
            };
            const sourceId = edgeData.source!;
            const targetId = edgeData.target!;

            if (!currentCy) return false;

            const sourceExists = currentCy.$id(sourceId).nonempty();
            const targetExists = currentCy.$id(targetId).nonempty();

            if (!sourceExists || !targetExists) {
              console.warn(
                `Skipping orphan edge ${edge.data.id}: ${sourceId} -> ${targetId} (${sourceExists ? "target missing" : "source missing"})`,
              );
              return false;
            }
            return true;
          });

          if (validEdges.length > 0) {
            try {
              const addedEdges = currentCy.add(validEdges);
              // OPTIMIZATION: Hydrate elementMap with ONLY the newly added edges
              addedEdges.forEach((e) => {
                elementMap.set(e.id(), e);
              });
            } catch (e) {
              console.warn("Failed to add some edges to graph", e);
            }
          }
        }

        // 4. Update existing elements (labels, etc) - Data Sync only
        currentCy.batch(() => {
          snapshotElements.forEach((el) => {
            const node = elementMap.get(el.data.id);
            if (node) {
              const currentData = node.data() as Record<string, any>;
              const newData = el.data as Record<string, any>;

              // Robust equality check to prevent unnecessary style recalculations
              let changed = false;
              for (const k in newData) {
                // Skip ID as it's the lookup key
                if (k === "id" || !Object.hasOwn(newData, k)) continue;

                const newVal = newData[k];
                const curVal = currentData[k];

                // Performance optimized check for TemporalMetadata objects
                let isMatch: boolean;
                if (
                  el.group === "nodes" &&
                  (k === "date" || k === "start_date" || k === "end_date")
                ) {
                  isMatch = isTemporalMetadataEqual(newVal, curVal);
                } else if (typeof newVal === "object" && newVal !== null) {
                  // OPTIMIZATION: Assume object inequality to avoid expensive JSON.stringify in hot loop.
                  // Only TemporalMetadata (handled above) is expected to be an object in this context.
                  isMatch = false;
                } else {
                  isMatch = curVal === newVal;
                }

                if (!isMatch) {
                  changed = true;
                  break;
                }
              }

              if (changed) {
                // Cytoscape merges data objects automatically
                node.data(newData);
              }

              // Sync position for guests (Host relies on local layout)
              if (
                vault.isGuest &&
                el.group === "nodes" &&
                el.position?.x !== undefined
              ) {
                const currentPos = node.position();
                // Check if position changed significantly (> 1px) to avoid jitter
                if (
                  Math.abs(currentPos.x - el.position.x) > 1 ||
                  Math.abs(currentPos.y - el.position.y) > 1
                ) {
                  node.position(el.position);
                }
              }
            }
          });
        });

        // 4. Force layout ONLY if structural changes occurred OR if first load
        const structuralChange =
          newNodes.length > 0 ||
          newEdges.length > 0 ||
          elementsToRemove.length > 0;
        const isFirstElements = !initialLoaded && graph.elements.length > 0;

        let shouldRunLayout =
          structuralChange || isFirstElements || showImagesChanged;
        if (graph.stableLayout && !isFirstElements && !showImagesChanged) {
          // Run layout for new nodes or to fill gaps from removals
          shouldRunLayout = newNodes.length > 0 || elementsToRemove.length > 0;
        }

        if (shouldRunLayout && !isLayoutRunning) {
          if (isFirstElements) {
            // Debounce the initial "fit" layout to allow more nodes to arrive
            clearTimeout(stabilizationTimeout);
            stabilizationTimeout = window.setTimeout(() => {
              if (!initialLoaded) {
                applyCurrentLayout(true, showImagesChanged);
                untrack(() => {
                  initialLoaded = true;
                });
              }
            }, 500); // 500ms window for more nodes to appear
          } else {
            applyCurrentLayout(false, showImagesChanged);
          }
        } else {
          // If no layout run, still might need focus update if elements were updated
          if (selectedId) applyFocus(selectedId);
        }

        return () => {
          if (currentLayout) {
            try {
              currentLayout.stop();
            } catch {
              // Ignore
            }
          }
        };
      } catch (err) {
        console.error("Cytoscape Error:", err);
      }
    }
  });

  // Save edge label logic
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

  // Derived state for breadcrumbs
  let selectedEntity = $derived(selectedId ? vault.entities[selectedId] : null);
  let parentEntity = $derived(
    selectedId
      ? vault.inboundConnections[selectedId]?.[0]?.sourceId
        ? vault.entities[vault.inboundConnections[selectedId][0].sourceId]
        : null
      : null,
  );

  // Derived state for tooltip
  let hoveredEntity = $derived(
    hoveredEntityId ? vault.entities[hoveredEntityId] : null,
  );

  // Memoize markdown parsing to prevent re-computation on every render (e.g. tooltip position updates)
  let tooltipContent = $derived(
    hoveredEntity?.content
      ? DOMPurify.sanitize(marked.parse(hoveredEntity.content) as string)
      : '<span class="italic text-theme-muted">No data available</span>',
  );
</script>

<div
  class="absolute inset-0 w-full h-full bg-theme-bg overflow-hidden shadow-2xl border-y border-theme-border/30"
>
  <!-- Decorative Grid Overlay -->
  <div
    class="absolute inset-0 pointer-events-none opacity-20"
    style="background-image: radial-gradient(var(--color-theme-secondary) 1px, transparent 1px); background-size: 30px 30px;"
  ></div>

  <!-- Top Left Overlay (Breadcrumbs & Minimap) -->
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
      <LabelFilter
        activeLabels={graph.activeLabels}
        onToggle={(l) => graph.toggleLabelFilter(l)}
        onClear={() => graph.clearLabelFilters()}
      />
    </div>

    <div class="pointer-events-auto">
      <CategoryFilter
        activeCategories={graph.activeCategories}
        onToggle={(id) => graph.toggleCategoryFilter(id)}
        onClear={() => graph.clearCategoryFilters()}
      />
    </div>
    <!-- Real Mini-map -->
    {#if cy}
      <Minimap {cy} absolute={false} width={192} height={128} />
    {/if}

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

  <!-- Zoom Controls (Bottom Left) -->
  <div class="absolute bottom-6 left-6 z-20 flex flex-col gap-2 items-start">
    <div class="flex gap-1 items-center">
      <TimelineControls onApply={applyCurrentLayout} />
      <div class="h-6 w-px bg-theme-border/30 mx-2"></div>
      <button
        class="w-8 h-8 flex items-center justify-center border border-theme-border bg-theme-surface/80 text-theme-primary hover:bg-theme-primary/20 hover:text-theme-text transition"
        onclick={() => cy?.zoom(cy.zoom() * 1.2)}
        title="Zoom In"
        aria-label="Zoom In"
      >
        <span class="icon-[lucide--zoom-in] w-4 h-4"></span>
      </button>
      <button
        class="w-8 h-8 flex items-center justify-center border border-theme-border bg-theme-surface/80 text-theme-primary hover:bg-theme-primary/20 hover:text-theme-text transition"
        onclick={() => cy?.zoom(cy.zoom() / 1.2)}
        title="Zoom Out"
        aria-label="Zoom Out"
      >
        <span class="icon-[lucide--zoom-out] w-4 h-4"></span>
      </button>
      <button
        class="w-8 h-8 flex items-center justify-center border border-theme-border bg-theme-surface/80 text-theme-primary hover:bg-theme-primary/20 hover:text-theme-text transition"
        onclick={() => graph.requestFit()}
        title="Fit to Screen"
        aria-label="Fit to Screen"
      >
        <span class="icon-[lucide--maximize] w-4 h-4"></span>
      </button>
      <button
        class="w-8 h-8 flex items-center justify-center border transition {graph.stableLayout
          ? 'border-theme-primary bg-theme-primary/20 text-theme-primary'
          : 'border-theme-border bg-theme-surface/80 text-theme-muted hover:text-theme-primary'}"
        onclick={() =>
          void graph
            .toggleStableLayout()
            .catch((error) =>
              console.error("Failed to toggle stable layout", error),
            )}
        title={graph.stableLayout ? "Stable Layout: ON" : "Stable Layout: OFF"}
        aria-label="Toggle Stable Layout"
        aria-pressed={graph.stableLayout}
      >
        <span
          class="{graph.stableLayout
            ? 'icon-[lucide--pin]'
            : 'icon-[lucide--pin-off]'} w-4 h-4"
        ></span>
      </button>
      <button
        class="w-8 h-8 flex items-center justify-center border border-theme-border bg-theme-surface/80 text-theme-primary hover:bg-theme-primary/20 hover:text-theme-text transition"
        onclick={() => applyCurrentLayout(true)}
        title="Redraw Layout"
        aria-label="Redraw Layout"
      >
        <span
          class="icon-[lucide--refresh-cw] w-4 h-4 {isLayoutRunning
            ? 'animate-spin'
            : ''}"
        ></span>
      </button>

      <div class="h-6 w-px bg-theme-border/30 mx-2 hidden md:block"></div>

      <button
        class="w-8 h-8 flex items-center justify-center border transition {ui.sharedMode
          ? 'bg-amber-500/20 border-amber-500/50 text-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
          : 'border-theme-border bg-theme-surface/80 text-theme-primary hover:bg-theme-primary/20 hover:text-theme-text'}"
        onclick={() => (ui.sharedMode = !ui.sharedMode)}
        title={ui.sharedMode
          ? "Exit Shared Mode (Admin View)"
          : "Enter Shared Mode (Player Preview)"}
        aria-label={ui.sharedMode
          ? "Exit Shared Mode (Admin View)"
          : "Enter Shared Mode (Player Preview)"}
        aria-pressed={ui.sharedMode}
        data-testid="shared-mode-toggle"
      >
        <span
          class={ui.sharedMode
            ? "icon-[lucide--eye] w-4 h-4"
            : "icon-[lucide--eye-off] w-4 h-4"}
        ></span>
      </button>

      <button
        class="w-8 h-8 flex items-center justify-center border border-theme-border bg-theme-surface/80 text-theme-primary hover:bg-theme-primary/20 hover:text-theme-text transition"
        onclick={() => graph.toggleLabels()}
        title="Toggle Labels (L)"
        aria-label="Toggle Labels"
      >
        <span
          class="icon-[lucide--tag] w-4 h-4 {graph.showLabels
            ? 'opacity-100'
            : 'opacity-50'}"
        ></span>
      </button>

      <button
        class="w-8 h-8 flex items-center justify-center border border-theme-border bg-theme-surface/80 text-theme-primary hover:bg-theme-primary/20 hover:text-theme-text transition"
        onclick={() => graph.toggleImages()}
        title="Toggle Node Images (I)"
        aria-label="Toggle Node Images"
      >
        <span
          class="w-4 h-4 {graph.showImages
            ? 'icon-[lucide--image] opacity-100'
            : 'icon-[lucide--image-off] opacity-50'}"
        ></span>
      </button>

      <!-- Connect Mode Toggle (Gated) -->
      {#if !vault.isGuest}
        <button
          class="w-8 h-8 flex items-center justify-center border transition {connectMode
            ? 'border-theme-accent bg-theme-accent/20 text-theme-accent shadow-[0_0_10px_var(--color-theme-accent)] shadow-theme-accent/30'
            : 'border-theme-border bg-theme-surface/80 text-theme-primary hover:bg-theme-primary/20 hover:text-theme-text'}"
          onclick={toggleConnectMode}
          title="Connect Mode (C)"
        >
          <span class="icon-[lucide--link] w-4 h-4"></span>
        </button>
      {/if}

      <div class="h-6 w-px bg-theme-border/30 mx-2 hidden md:block"></div>
      <div class="hidden md:block">
        <FeatureHint hintId="lore-oracle" />
      </div>
    </div>
  </div>

  <!-- Graph Canvas -->
  <div
    class="absolute inset-0 z-10 w-full h-full"
    bind:this={container}
    data-testid="graph-canvas"
  ></div>

  {#if cy}
    <TimelineOverlay {cy} />
    <OrbitControls />
    <ContextMenu {cy} />
    <SelectionConnector {cy} />
  {/if}

  <!-- Hover Tooltip -->
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

        <!-- Decorative corner bits -->
        <div
          class="absolute -top-px -left-px w-2 h-2 border-t border-l border-theme-primary"
        ></div>
        <div
          class="absolute -bottom-px -right-px w-2 h-2 border-b border-r border-theme-primary"
        ></div>
      </div>
      <!-- Arrow/Stem -->
      <div
        class="absolute left-1/2 -translate-x-1/2 bottom-[-6px] w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-theme-primary/50"
      ></div>
    </div>
  {/if}

  <!-- Connection Hints -->
  {#if connectMode}
    <div
      class="absolute top-20 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-4 pointer-events-auto"
    >
      {#if !sourceId}
        <div
          class="bg-green-500/10 border border-green-500/50 text-green-200 px-4 py-1 rounded-full text-xs font-mono animate-bounce"
        >
          > SELECT SOURCE NODE
        </div>
      {:else}
        <div
          class="bg-yellow-500/10 border border-yellow-500/50 text-yellow-200 px-4 py-1 rounded-full text-xs font-mono animate-bounce"
        >
          > SELECT TARGET TO LINK
        </div>
      {/if}

      <FeatureHint hintId="connect-mode" />
    </div>
  {/if}

  <!-- Merge Hint -->
  {#if selectionCount >= 2 && !connectMode}
    <div
      class="absolute top-20 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-4 pointer-events-auto"
    >
      <FeatureHint hintId="node-merging" />
    </div>
  {/if}

  <!-- Edge Edit Modal -->
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
            <option value="related_to">Default (Grey)</option>
            <option value="neutral">Neutral (Amber)</option>
            <option value="friendly">Friendly (Blue)</option>
            <option value="enemy">Enemy (Red)</option>
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
            onclick={saveEdgeLabel}
          >
            Save
          </button>
          <button
            class="flex-1 px-3 py-1.5 text-xs font-mono uppercase bg-theme-surface border border-theme-border text-theme-muted hover:text-theme-primary transition rounded"
            onclick={() => (editingEdge = null)}
          >
            Cancel
          </button>
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
          }}
        >
          Delete Connection
        </button>
      </div>
    </div>
  {/if}
</div>

<svelte:window onkeydown={handleKeyDown} />
