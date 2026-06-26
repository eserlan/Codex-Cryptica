<script lang="ts">
  import { fade, fly } from "svelte/transition";
  import { marked } from "marked";
  import { vault } from "$lib/stores/vault.svelte";
  import { oracle } from "$lib/stores/oracle.svelte";
  import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
  import { searchService } from "$lib/services/search.svelte";
  import type { PlotAnalysisEntity } from "schema";

  const entityId = $derived(modalUIStore.plotDialog.entityId);
  const entity = $derived(entityId ? vault.entities[entityId] : null);

  let status = $state<"idle" | "loading" | "done" | "error">("idle");
  let result = $state<string>("");
  let errorMsg = $state<string>("");

  const LOADING_MSGS = [
    "Consulting the ancient tomes…",
    "Weaving threads of fate…",
    "Summoning narrative spirits…",
    "Eavesdropping on the tavern…",
    "Bribing the story gods…",
    "Rolling for inspiration…",
    "Deciphering cryptic prophecies…",
    "Forging unlikely alliances…",
    "Unleashing narrative chaos…",
    "Reading entrails (metaphorically)…",
  ];
  let loadingMsgIndex = $state(0);
  let loadingInterval: ReturnType<typeof setInterval> | null = null;

  function startLoadingMessages() {
    loadingMsgIndex = Math.floor(Math.random() * LOADING_MSGS.length);
    loadingInterval = setInterval(() => {
      loadingMsgIndex = (loadingMsgIndex + 1) % LOADING_MSGS.length;
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
      void generate();
    }
  });

  async function generate() {
    if (!entity) return;
    status = "loading";
    result = "";
    errorMsg = "";
    startLoadingMessages();

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

      result = await oracle.textGeneration.generatePlotAnalysis(
        apiKey,
        modelName,
        entity,
        connected,
        `/plot ${entity.title}`,
      );
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
                {LOADING_MSGS[loadingMsgIndex]}
              </span>
            {/key}
          </div>
        {:else if status === "error"}
          <p class="text-sm text-red-500">{errorMsg}</p>
        {:else if status === "done"}
          <div class="prose prose-sm max-w-none plot-modal-prose">
            {@html renderedHtml}
          </div>
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
            onclick={generate}
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

  /* Tune prose colors to match theme */
  .plot-modal-prose :global(h1),
  .plot-modal-prose :global(h2),
  .plot-modal-prose :global(h3) {
    color: var(--theme-text);
  }
  .plot-modal-prose :global(p),
  .plot-modal-prose :global(li) {
    color: var(--theme-text-secondary, var(--theme-text));
  }
  .plot-modal-prose :global(strong) {
    color: var(--theme-text);
  }
</style>
