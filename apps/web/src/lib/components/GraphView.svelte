<script lang="ts">
  import { fade, fly } from "svelte/transition";
  import { onMount, onDestroy, untrack } from "svelte";
  import { initGraph } from "graph-engine";
  import { graph } from "$lib/stores/graph.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { categories } from "$lib/stores/categories.svelte";
  import { marked } from "marked";
  import DOMPurify from "isomorphic-dompurify";
  import type { Core, NodeSingular } from "cytoscape";
  import cytoscape from "cytoscape";
  import fcose from "cytoscape-fcose";
  import { getGraphStyle, DEFAULT_LAYOUT_OPTIONS } from "graph-engine";

  cytoscape.use(fcose);
  import { themeStore } from "$lib/stores/theme.svelte";
  import Minimap from "$lib/components/graph/Minimap.svelte";
  import TimelineControls from "$lib/components/graph/TimelineControls.svelte";
  import TimelineOverlay from "$lib/components/graph/TimelineOverlay.svelte";
  import OrbitControls from "$lib/components/graph/OrbitControls.svelte";
  import ContextMenu from "$lib/components/graph/ContextMenu.svelte";
  import FeatureHint from "$lib/components/help/FeatureHint.svelte";
  import { setCentralNode } from "graph-engine";
  import LabelFilter from "$lib/components/labels/LabelFilter.svelte";

  let container: HTMLElement;
  let cy: Core | undefined = $state();
  let currentLayout: any;
  let stabilizationTimeout: number | undefined;

  let graphStyle = $derived([
    ...getGraphStyle(themeStore.activeTheme, categories.list),
    {
      selector: ".filtered-out",
      style: {
        display: "none",
      },
    },
    ...(graph.timelineMode
      ? [
          {
            selector: "node",
            style: {
              label: "", // Labels handled by TimelineOverlay
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

  let skipNextCenter = false;

  const applyFocus = (id: string | null) => {
    const currentCy = cy;
    if (!currentCy) return;
    try {
      currentCy.batch(() => {
        if (!id) {
          currentCy.elements().removeClass("dimmed");
          currentCy.elements().removeClass("neighborhood");
        } else {
          const node = currentCy.$id(id);
          if (node.length > 0) {
            const neighborhood = node.neighborhood().add(node);
            currentCy.elements().addClass("dimmed");
            currentCy.elements().removeClass("neighborhood");
            neighborhood.removeClass("dimmed");
            neighborhood.addClass("neighborhood");
          } else {
            // If the target node no longer exists, clear focus/dimming.
            currentCy.elements().removeClass("dimmed");
            currentCy.elements().removeClass("neighborhood");
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

  const applyCurrentLayout = (isInitial = false) => {
    if (!cy) return;
    if (currentLayout) {
      try {
        currentLayout.stop();
      } catch {
        /* ignore */
      }
    }

    if (graph.timelineMode) {
      graph.applyTimelineLayout(cy);
    } else if (graph.orbitMode && graph.centralNodeId) {
       setCentralNode(cy, graph.centralNodeId);
      if (isInitial) {
        cy.resize();
        cy.animate({
          fit: { eles: cy.elements(), padding: 40 },
          duration: 800,
          easing: "ease-out-cubic",
        });
      }
    } else {
        // Not in timeline or orbit mode: intentionally reset to a fresh 'cose' layout,
        // which also replaces any previous orbit layout. We do not call clearOrbit(cy)
        // here, because its effect is equivalent to re-running 'cose' with these options.
      currentLayout = cy.layout({
        ...DEFAULT_LAYOUT_OPTIONS,
      });

      currentLayout.one("layoutstop", () => {
        if (isInitial && cy) {
          cy.resize();
          // Snap fit immediately to ensure visibility
          cy.fit(cy.elements(), 40);

          setTimeout(() => {
            if (!cy) return;
            cy.animate({
              fit: { eles: cy.elements(), padding: 40 },
              duration: 800,
              easing: "ease-out-cubic",
            });
          }, 50);
        }
        currentLayout = undefined;
      });
      currentLayout.run();
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
    if (vault.isGuest) return;
    if (e.key.toLowerCase() === "t" && !e.ctrlKey && !e.metaKey && !e.altKey) {
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      )
        return;
      graph.toggleTimeline();
      applyCurrentLayout();
    }
    if (e.key.toLowerCase() === "c" && !e.ctrlKey && !e.metaKey && !e.altKey) {
      // Don't toggle if user is typing in an input (though we don't have many here yet)
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      )
        return;
      toggleConnectMode();
    }
    if (e.key === "Escape" && connectMode) {
      toggleConnectMode();
    }
  };

  onMount(() => {
    if (container) {
      cy = initGraph({
        container,
        elements: graph.elements,
        style: graphStyle,
      });

      // Expose for E2E testing
      if (import.meta.env.DEV) {
        (window as any).cy = cy;
      }

      // Hover events
      cy.on("mouseover", "node", (evt) => {
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

      cy.on("mouseout", "node", () => {
        clearTimeout(hoverTimeout);
        hoveredEntityId = null;
        hoverPosition = null;
      });

      // Update hover position on drag/pan/zoom to keep it attached (optional but nice)
      cy.on("position", "node", (evt) => {
        if (hoveredEntityId === evt.target.id()) {
          const renderedPos = evt.target.renderedPosition();
          hoverPosition = { x: renderedPos.x, y: renderedPos.y };
        }
      });
      cy.on("pan zoom", () => {
        if (hoveredEntityId && cy) {
          const node = cy.$id(hoveredEntityId);
          if (node.length > 0) {
            const renderedPos = node.renderedPosition();
            hoverPosition = { x: renderedPos.x, y: renderedPos.y };
          }
        }
      });

      cy.on("tap", "node", (evt) => {
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
            vault.addConnection(sourceId, targetId);
            cy?.$(".selected-source").removeClass("selected-source");
            sourceId = null;
            connectMode = false; // Auto exit connect mode
          }
        } else if (graph.orbitMode) {
            // US2: Switch center if clicked in orbit mode
            graph.setCentralNode(targetId);
        } else {
          // Selection Logic for Detail Panel
          skipNextCenter = true;
          selectedId = targetId;
        }
      });

      // Right-click on edge to edit label
      cy.on("cxttap", "edge", (evt) => {
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

      cy.on("tap", (evt) => {
        if (evt.target === cy) {
          // Only clear selection if we clicked strictly on background, not on node
          if (!connectMode) {
            selectedId = null;
          }
          // Close edge editor on background tap
          editingEdge = null;
        }
      });
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
    if (import.meta.env.DEV) {
      delete (window as any).cy;
    }
    clearTimeout(hoverTimeout);
  });

  // Reactive effect to update graph when store changes
  let initialLoaded = $state(false);

  $effect(() => {
    if (cy && graphStyle) {
      cy.style(graphStyle);
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

  // Reactive effect to resolve node images
  $effect(() => {
    if (cy && graph.elements) {
      const currentElements = graph.elements;
      const timeout = setTimeout(async () => {
        try {
          const nodesToResolve = currentElements.filter(
            (el): el is any =>
              el.group === "nodes" && !!(el.data.thumbnail || el.data.image),
          );

          // CHUNK_SIZE processing
          const CHUNK_SIZE = 20;
          for (let i = 0; i < nodesToResolve.length; i += CHUNK_SIZE) {
            const chunk = nodesToResolve.slice(i, i + CHUNK_SIZE);
            await Promise.all(
              chunk.map(async (el) => {
                const data = el.data as any;
                const resolvedUrl = await vault.resolveImagePath(
                  (data.thumbnail || data.image)!,
                );
                if (resolvedUrl) {
                  // Detect image dimensions
                  const img = new Image();
                  img.src = resolvedUrl;
                  await new Promise((resolve) => {
                    img.onload = resolve;
                    img.onerror = resolve; // Continue even if image fails to load
                  });

                  // Calculate scaled dimensions (max aspect 2.0, max size 64)
                  let w = img.naturalWidth || 100;
                  let h = img.naturalHeight || 100;
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

                  const currentCy = cy;
                  if (currentCy) {
                    currentCy.batch(() => {
                      const node = currentCy.$id(data.id);
                      node.data("resolvedImage", resolvedUrl);
                      node.data("width", Math.round(w));
                      node.data("height", Math.round(h));
                    });
                  }
                }
              }),
            );
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
      
      untrack(() => {
        // Defer layout application to break synchronous reactive cycles
        // preventing 'effect_update_depth_exceeded' errors
        setTimeout(() => {
          applyCurrentLayout(false);
        }, 0);
      });
    }
  });

  $effect(() => {
    if (cy) {
      applyFocus(selectedId);
    }
    if (cy && selectedId) {
      const node = cy.$id(selectedId);
      if (node.length > 0) {
        // Select the node in Cytoscape if not already selected
        if (!node.selected()) {
          cy.$(":selected").unselect(); // Optional: clear other selections
          node.select();
        }

        if (skipNextCenter) {
          skipNextCenter = false;
        } else {
          cy.animate({
            center: { eles: node },
            duration: 500,
            easing: "ease-out-cubic",
          });
        }
      }
    }
  });

  // Manual fit request listener
  $effect(() => {
    if (cy && graph.fitRequest > 0) {
      const _req = graph.fitRequest; // track dependency
      cy.animate({
        fit: {
          eles: cy.elements(),
          padding: 50,
        },
        duration: 800,
        easing: "ease-out-cubic",
      });
    }
  });

  $effect(() => {
    if (cy && graph.elements) {
      // console.log("GraphView Effect Triggered. Elements:", graph.elements.length);

      try {
        cy.resize(); // Ensure viewport is up to date

        const currentElements = cy.elements();
        const currentIds = new Set(currentElements.map((el) => el.id()));
        const targetIds = new Set(graph.elements.map((el) => el.data.id));

        // 1. Remove elements no longer in the store
        const removedElements = currentElements.filter(
          (el) => !targetIds.has(el.id()),
        );
        if (removedElements.length > 0) {
          cy.remove(removedElements);
        }

        // 2. Add new elements safely
        const newElements = graph.elements.filter(
          (el) => !currentIds.has(el.data.id),
        );

        if (newElements.length > 0) {
          // Split into nodes and edges
          const newNodes = newElements.filter((el) => !("source" in el.data));
          const newEdges = newElements.filter((el) => "source" in el.data);

          // Always add nodes first
          if (newNodes.length > 0) {
            cy.add(newNodes);
          }

          // Then add edges, but ONLY if both source and target exist in the graph
          // (either they were already there, or we just added them)
          const validEdges = newEdges.filter((edge) => {
            // Force type check or cast to access source/target safely
            const edgeData = edge.data as {
              source?: string;
              target?: string;
              id: string;
            };
            const sourceId = edgeData.source!;
            const targetId = edgeData.target!;

            if (!cy) return false;

            const sourceExists = cy.$id(sourceId).nonempty();
            const targetExists = cy.$id(targetId).nonempty();

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
              cy.add(validEdges);
            } catch (e) {
              console.warn("Failed to add some edges to graph", e);
            }
          }
        }

        // 3. Update existing elements (labels, etc) - Data Sync only
        graph.elements.forEach((el) => {
          if (currentIds.has(el.data.id)) {
            const node = cy?.$id(el.data.id);
            if (node) {
              // Only update if data actually changed to avoid style recalc?
              // Cytoscape handles this reasonably well, but we can be explicit if needed.
              // For now, blind update is cheap enough compared to layout.
              node.data(el.data);
            }
          }
        });

        // 4. Force layout ONLY if structural changes occurred OR if first load
        const structuralChange =
          newElements.length > 0 || removedElements.length > 0;
        const isFirstElements = !initialLoaded && graph.elements.length > 0;
        const shouldRunLayout = structuralChange || isFirstElements;

        if (shouldRunLayout) {
          if (isFirstElements) {
            // Debounce the initial "fit" layout to allow more nodes to arrive
            clearTimeout(stabilizationTimeout);
            stabilizationTimeout = window.setTimeout(() => {
              if (!initialLoaded) {
                applyCurrentLayout(true);
                initialLoaded = true;
              }
            }, 500); // 500ms window for more nodes to appear
          } else {
            applyCurrentLayout(false);
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

  // Save edge label
  const saveEdgeLabel = () => {
    if (editingEdge) {
      vault.updateConnection(editingEdge.source, editingEdge.target, {
        label: edgeEditInput || undefined,
        type: edgeEditType,
      });
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
        <span class="text-theme-muted">SYSTEM</span>
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
    <!-- Real Mini-map -->
    {#if cy}
      <Minimap {cy} absolute={false} width={192} height={128} />
    {/if}

    {#if graph.timelineMode}
      <div
        class="bg-purple-900/40 backdrop-blur border border-purple-500/30 px-3 py-1 flex items-center gap-2 text-[9px] font-mono tracking-[0.2em] text-purple-300 shadow-lg uppercase pointer-events-auto"
        transition:fade
      >
        <span class="icon-[lucide--history] w-3 h-3 animate-pulse"></span>
        Chronological Synchrony Active ({graph.timelineAxis === "x"
          ? "Horizontal"
          : "Vertical"})
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

      <!-- Connect Mode Toggle -->
      {#if !vault.isGuest}
        <button
          class="w-8 h-8 flex items-center justify-center border transition {connectMode
            ? 'border-theme-accent bg-theme-accent/20 text-theme-accent shadow-[0_0_10px_var(--color-theme-accent)] shadow-theme-accent/30'
            : 'border-theme-border bg-theme-surface/80 text-theme-primary hover:bg-theme-primary/20 hover:text-theme-text transition'}"
          onclick={toggleConnectMode}
          title="Connect Mode (C)"
        >
          <span class="icon-[lucide--link] w-4 h-4"></span>
        </button>
      {/if}
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
          class="text-xs font-bold text-theme-primary tracking-wider uppercase mb-2 border-b border-theme-border/50 pb-1 flex justify-between"
        >
          <span>{hoveredEntity.title}</span>
          <span class="text-[10px] text-theme-muted">{hoveredEntity.type}</span>
        </div>
        <div
          class="text-sm text-theme-text/90 font-mono leading-relaxed prose prose-p:my-1 prose-headings:text-theme-primary prose-headings:text-xs prose-strong:text-theme-primary prose-em:text-theme-secondary"
        >
          {@html hoveredEntity.content
            ? DOMPurify.sanitize(marked.parse(hoveredEntity.content) as string)
            : '<span class="italic text-theme-muted">No data available</span>'}
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
          onclick={() => {
            if (editingEdge) {
              vault.removeConnection(editingEdge.source, editingEdge.target);
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
