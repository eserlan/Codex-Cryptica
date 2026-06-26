<script module>
  export { clearPlotCache } from "$lib/stores/plot-cache";
</script>

<script lang="ts">
  import { fade, fly } from "svelte/transition";
  import { marked } from "marked";
  import { plotCache } from "$lib/stores/plot-cache";
  import { vault } from "$lib/stores/vault.svelte";
  import { oracle } from "$lib/stores/oracle.svelte";
  import { categories } from "$lib/stores/categories.svelte";
  import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
  import { searchService } from "$lib/services/search.svelte";
  import type { PlotAnalysisEntity } from "schema";

  const entityId = $derived(modalUIStore.plotDialog.entityId);
  const entity = $derived(entityId ? vault.entities[entityId] : null);

  let status = $state<"idle" | "loading" | "done" | "error">("idle");
  let result = $state<string>("");
  let errorMsg = $state<string>("");

  // --- Plot section selector ---
  interface PlotSection {
    title: string;
    raw: string;
  }

  const plotSections = $derived.by<PlotSection[]>(() => {
    if (!result) return [];
    // Split on ## headings — each h2 is one plot hook
    const parts = result.split(/(?=^## )/m).filter((s) => s.trim());
    return parts.map((raw) => {
      const titleMatch = raw.match(/^## (.+)/m);
      return { title: titleMatch ? titleMatch[1].trim() : "Plot Hook", raw };
    });
  });

  let selectedPlotIndex = $state<number | null>(null);

  // --- Entity extraction ---
  type ExtractStatus = "idle" | "extracting" | "creating" | "done" | "error";
  let extractStatus = $state<ExtractStatus>("idle");
  let extractError = $state<string>("");
  let createdEntityTitles = $state<string[]>([]);

  async function generateEntitiesFromSelectedPlot() {
    if (selectedPlotIndex === null || !entity) return;
    const hook = plotSections[selectedPlotIndex];
    if (!hook) return;

    extractStatus = "extracting";
    extractError = "";
    createdEntityTitles = [];

    try {
      const apiKey = oracle.effectiveApiKey ?? "";
      const modelName = oracle.modelName;
      const catIds = categories.list.map((c) => c.id);

      const stubs = await oracle.textGeneration.generateEntitiesFromPlot!(
        apiKey,
        modelName,
        hook.raw,
        entity.title,
        catIds,
      );

      extractStatus = "creating";

      for (const stub of stubs) {
        const newId = await vault.createEntity(stub.type, stub.title, {
          content: stub.content,
        });
        // Connect source entity → new entity
        await vault.addConnection(entity.id, newId, "related", "from plot");
        createdEntityTitles = [...createdEntityTitles, stub.title];
      }

      extractStatus = "done";
    } catch (err: any) {
      extractError = err?.message ?? "Entity generation failed.";
      extractStatus = "error";
    }
  }

  function buildLoadingMsgs(
    name: string,
    type: string,
    connectedNames: string[],
  ): string[] {
    const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
    const conn = connectedNames.length > 0 ? pick(connectedNames) : null;

    const typeMessages: Record<string, string[]> = {
      character: [
        `Trailing ${name} through the shadows…`,
        `Reading ${name}'s letters by candlelight…`,
        `Asking what ${name} really wants…`,
        `Digging up ${name}'s past…`,
        `Counting ${name}'s enemies…`,
      ],
      faction: [
        `Infiltrating ${name}'s inner circle…`,
        `Mapping ${name}'s web of influence…`,
        `Listening at ${name}'s closed doors…`,
        `Tracing ${name}'s money…`,
        `Finding the cracks within ${name}…`,
      ],
      location: [
        `Surveying the dark corners of ${name}…`,
        `Unearthing what's buried beneath ${name}…`,
        `Listening to the rumours around ${name}…`,
        `Charting the dangers of ${name}…`,
        `Asking who controls ${name}…`,
      ],
      item: [
        `Tracing ${name}'s chain of ownership…`,
        `Deciphering the markings on ${name}…`,
        `Sensing the power hidden within ${name}…`,
        `Asking who wants ${name} back…`,
        `Following the trail ${name} left behind…`,
      ],
      creature: [
        `Tracking ${name}'s movements at dusk…`,
        `Studying the lair of ${name}…`,
        `Counting the signs of ${name}'s passage…`,
        `Asking the locals about ${name}…`,
        `Mapping the territory ${name} claims…`,
      ],
      settlement: [
        `Eavesdropping at ${name}'s market…`,
        `Reading the mood in ${name}'s streets…`,
        `Counting the guards at ${name}'s gates…`,
        `Listening to ${name}'s grievances…`,
        `Tracing the tensions brewing in ${name}…`,
      ],
    };

    const typeMsgs = typeMessages[type.toLowerCase()] ?? [
      `Pulling the threads around ${name}…`,
      `Consulting those who know ${name}…`,
      `Weighing what ${name} means for the story…`,
      `Tracing ${name}'s place in the world…`,
      `Asking what happens because of ${name}…`,
    ];

    const connMsgs = conn
      ? [
          `Cross-referencing ${name} with ${conn}…`,
          `Wondering what ${conn} knows about ${name}…`,
          `Mapping the tension between ${name} and ${conn}…`,
          `Asking how ${conn} fits into ${name}'s story…`,
        ]
      : [];

    const fallbackMsgs = [
      "Weaving threads of fate…",
      "Rolling for inspiration…",
      "Bribing the story gods…",
      "Reading entrails (metaphorically)…",
      "Unleashing narrative chaos…",
    ];

    const pool = [...typeMsgs, ...connMsgs, ...fallbackMsgs];
    // Shuffle
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool;
  }

  let loadingMsgs = $state<string[]>([]);
  let loadingMsgIndex = $state(0);
  let loadingInterval: ReturnType<typeof setInterval> | null = null;

  function startLoadingMessages(connectedNames: string[]) {
    if (!entity) return;
    loadingMsgs = buildLoadingMsgs(
      entity.title,
      entity.type ?? "",
      connectedNames,
    );
    loadingMsgIndex = 0;
    loadingInterval = setInterval(() => {
      loadingMsgIndex = (loadingMsgIndex + 1) % loadingMsgs.length;
    }, 2200);
  }

  function stopLoadingMessages() {
    if (loadingInterval) {
      clearInterval(loadingInterval);
      loadingInterval = null;
    }
  }

  const renderedHtml = $derived(result ? (marked.parse(result) as string) : "");

  $effect(() => {
    if (modalUIStore.plotDialog.open && entity) {
      const cached = plotCache.get(entity.id);
      if (cached) {
        result = cached;
        status = "done";
      } else {
        void generate();
      }
    }
  });

  function resetExtractState() {
    extractStatus = "idle";
    extractError = "";
    createdEntityTitles = [];
    selectedPlotIndex = null;
  }

  async function generate(bust = false) {
    if (!entity) return;
    if (bust) plotCache.delete(entity.id);
    resetExtractState();
    status = "loading";
    result = "";
    errorMsg = "";

    try {
      const apiKey = oracle.effectiveApiKey ?? "";
      const modelName = oracle.modelName;

      // Gather explicit graph connections
      const seen = new Set<string>();
      const connected: PlotAnalysisEntity[] = [];

      for (const conn of entity.connections ?? []) {
        if (!seen.has(conn.target)) {
          const e = vault.entities[conn.target];
          if (e) {
            seen.add(conn.target);
            connected.push({
              entity: e,
              connectionType: conn.type,
              label: conn.label,
              direction: "outbound",
            });
          }
        }
      }

      const inbound = vault.inboundConnections?.[entity.id] ?? [];
      for (const { sourceId, connection } of inbound) {
        if (!seen.has(sourceId)) {
          const e = vault.entities[sourceId];
          if (e) {
            seen.add(sourceId);
            connected.push({
              entity: e,
              connectionType: connection.type,
              label: connection.label,
              direction: "inbound",
            });
          }
        }
      }

      // Also search for entities that mention this one but aren't linked
      const searchResults = await searchService.search(entity.title, {
        limit: 10,
      });
      for (const r of searchResults) {
        if (r.id !== entity.id && !seen.has(r.id)) {
          const e = vault.entities[r.id];
          if (e) {
            seen.add(r.id);
            connected.push({
              entity: e,
              connectionType: "mention",
              direction: "inbound",
            });
          }
        }
      }

      startLoadingMessages(connected.map((c) => c.entity.title));

      // Svelte $state proxies can't cross the worker postMessage boundary —
      // strip them to plain objects before the Comlink call.
      const plainEntity = JSON.parse(JSON.stringify(entity));
      const plainConnected = JSON.parse(JSON.stringify(connected));

      result = await oracle.textGeneration.generatePlotAnalysis(
        apiKey,
        modelName,
        plainEntity,
        plainConnected,
        `/plot ${entity.title}`,
      );
      plotCache.set(entity.id, result);
      stopLoadingMessages();
      status = "done";
    } catch (err: any) {
      stopLoadingMessages();
      errorMsg = err?.message ?? "Plot generation failed.";
      status = "error";
    }
  }

  async function handleCopy() {
    if (!result) return;
    await navigator.clipboard.writeText(result);
  }

  function handleClose() {
    stopLoadingMessages();
    modalUIStore.closePlotDialog();
    resetExtractState();
    status = "idle";
    result = "";
    errorMsg = "";
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) handleClose();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (modalUIStore.plotDialog.open && e.key === "Escape") handleClose();
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if modalUIStore.plotDialog.open && entity}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 z-[110] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm"
    transition:fade={{ duration: 150 }}
    onclick={handleBackdropClick}
  >
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Plot — {entity.title}"
      tabindex="-1"
      class="relative z-10 w-full max-w-xl mx-0 md:mx-4 rounded-t-2xl md:rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
      style:background-color="var(--theme-panel-fill)"
      style:background-image="var(--bg-theme-surface)"
      in:fly={{ y: 40, duration: 250 }}
      out:fly={{ y: 40, duration: 180 }}
      onclick={(e) => e.stopPropagation()}
    >
      <!-- Header -->
      <div
        class="flex items-center justify-between gap-3 px-5 py-4 border-b border-theme-border shrink-0"
      >
        <div class="flex items-center gap-2 min-w-0">
          <span
            class="icon-[lucide--scroll] w-4 h-4 text-theme-primary shrink-0"
          ></span>
          <span
            class="text-[10px] font-bold tracking-widest text-theme-muted uppercase shrink-0"
            >Plot —</span
          >
          <span class="text-sm font-semibold text-theme-text truncate"
            >{entity.title}</span
          >
        </div>
        <button
          onclick={handleClose}
          aria-label="Close"
          class="text-theme-muted hover:text-theme-text transition shrink-0"
        >
          <span class="icon-[lucide--x] w-4 h-4"></span>
        </button>
      </div>

      <!-- Body -->
      <div class="flex-1 min-h-0 overflow-y-auto px-5 py-4 custom-scrollbar">
        {#if status === "loading"}
          <div
            class="flex flex-col items-center justify-center gap-4 py-12 text-theme-muted"
          >
            <span
              class="icon-[lucide--loader-2] w-6 h-6 animate-spin text-theme-primary"
            ></span>
            {#key loadingMsgIndex}
              <span
                class="text-xs tracking-wide text-center italic loading-msg"
              >
                {loadingMsgs[loadingMsgIndex] ?? ""}
              </span>
            {/key}
          </div>
        {:else if status === "error"}
          <p class="text-sm text-red-500">{errorMsg}</p>
        {:else if status === "done"}
          <div class="prose prose-sm max-w-none plot-modal-prose">
            {@html renderedHtml}
          </div>

          {#if plotSections.length > 1}
            <!-- Plot selector + entity generation panel -->
            <div class="mt-5 pt-4 border-t border-theme-border">
              <p
                class="text-[10px] font-bold uppercase tracking-widest text-theme-muted mb-3"
              >
                Generate &amp; Connect Entities
              </p>
              <div class="flex flex-col gap-2 mb-3">
                {#each plotSections as section, i (i)}
                  <button
                    type="button"
                    onclick={() =>
                      (selectedPlotIndex = selectedPlotIndex === i ? null : i)}
                    class="text-left px-3 py-2 rounded border text-xs transition {selectedPlotIndex ===
                    i
                      ? 'border-theme-primary bg-theme-primary/10 text-theme-primary font-semibold'
                      : 'border-theme-border text-theme-secondary hover:border-theme-primary/50 hover:text-theme-text'}"
                  >
                    {section.title.replace(/^\[|\]$/g, "")}
                  </button>
                {/each}
              </div>

              {#if selectedPlotIndex !== null}
                {#if extractStatus === "idle" || extractStatus === "error"}
                  {#if extractStatus === "error"}
                    <p class="text-xs text-red-500 mb-2">{extractError}</p>
                  {/if}
                  <button
                    onclick={generateEntitiesFromSelectedPlot}
                    class="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-theme-primary border border-theme-primary/40 hover:bg-theme-primary/10 px-3 py-2 rounded transition"
                  >
                    <span class="icon-[lucide--wand-2] w-3.5 h-3.5"></span>
                    Generate &amp; Connect Entities
                  </button>
                {:else if extractStatus === "extracting" || extractStatus === "creating"}
                  <div class="flex items-center gap-2 text-xs text-theme-muted">
                    <span
                      class="icon-[lucide--loader-2] w-3.5 h-3.5 animate-spin text-theme-primary"
                    ></span>
                    {extractStatus === "extracting"
                      ? "Extracting entities from plot…"
                      : `Creating ${createdEntityTitles.length > 0 ? createdEntityTitles[createdEntityTitles.length - 1] + "…" : "entities…"}`}
                  </div>
                {:else if extractStatus === "done"}
                  <div class="flex flex-col gap-1">
                    <div
                      class="flex items-center gap-1.5 text-xs text-theme-primary mb-1"
                    >
                      <span class="icon-[lucide--check-circle] w-3.5 h-3.5"
                      ></span>
                      Created and connected {createdEntityTitles.length} entities
                    </div>
                    {#each createdEntityTitles as title (title)}
                      <span
                        class="text-[10px] text-theme-muted pl-5 before:content-['·'] before:mr-1.5 before:text-theme-primary"
                        >{title}</span
                      >
                    {/each}
                  </div>
                {/if}
              {/if}
            </div>
          {/if}
        {/if}
      </div>

      <!-- Footer -->
      <div
        class="flex items-center justify-end gap-2 px-5 py-3 border-t border-theme-border shrink-0"
      >
        {#if status === "done"}
          <button
            onclick={handleCopy}
            class="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-theme-secondary hover:text-theme-primary border border-theme-border hover:border-theme-primary px-3 py-2 rounded transition"
          >
            <span class="icon-[lucide--copy] w-3.5 h-3.5"></span>
            Copy
          </button>
        {/if}
        {#if status === "done" || status === "error"}
          <button
            onclick={() => generate(true)}
            class="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-theme-secondary hover:text-theme-primary border border-theme-border hover:border-theme-primary px-3 py-2 rounded transition"
          >
            <span class="icon-[lucide--refresh-cw] w-3.5 h-3.5"></span>
            Regenerate
          </button>
        {/if}
        <button
          onclick={handleClose}
          class="text-[10px] font-bold uppercase tracking-widest text-theme-muted hover:text-theme-text px-3 py-2 rounded transition"
        >
          Close
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .loading-msg {
    animation: msg-fade 0.5s ease-in-out;
  }

  @keyframes msg-fade {
    from {
      opacity: 0;
      transform: translateY(4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .custom-scrollbar::-webkit-scrollbar {
    width: 4px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: var(--theme-border);
    border-radius: 2px;
  }

  .plot-modal-prose :global(h2) {
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--theme-text);
    margin-top: 1.25rem;
    margin-bottom: 0.35rem;
    letter-spacing: 0.01em;
  }
  .plot-modal-prose :global(h3) {
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--theme-primary);
    margin-top: 1rem;
    margin-bottom: 0.25rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .plot-modal-prose :global(p) {
    font-size: 0.8rem;
    line-height: 1.65;
    color: var(--theme-text-secondary, var(--theme-text));
    margin-bottom: 0.5rem;
  }
  .plot-modal-prose :global(strong) {
    font-weight: 700;
    color: var(--theme-text);
  }
  .plot-modal-prose :global(ul) {
    margin: 0.4rem 0 0.6rem 1rem;
    list-style-type: disc;
  }
  .plot-modal-prose :global(li) {
    font-size: 0.8rem;
    line-height: 1.6;
    color: var(--theme-text-secondary, var(--theme-text));
    margin-bottom: 0.25rem;
  }
  .plot-modal-prose :global(hr) {
    border-color: var(--theme-border);
    margin: 1rem 0;
  }
  /* First element — no top margin */
  .plot-modal-prose :global(h2:first-child),
  .plot-modal-prose :global(h3:first-child),
  .plot-modal-prose :global(p:first-child) {
    margin-top: 0;
  }
</style>
