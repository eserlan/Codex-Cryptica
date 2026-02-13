<script lang="ts">
  import { ui } from "$lib/stores/ui.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { parserService } from "$lib/services/parser";
  import DOMPurify from "isomorphic-dompurify";
  import { getIconClass } from "$lib/utils/icon";
  import { categories } from "$lib/stores/categories.svelte";

  const close = () => ui.closeReadMode();

  const entity = $derived(
    ui.readModeNodeId ? vault.entities[ui.readModeNodeId] : null,
  );

  let renderedContent = $state("");
  let copyStatus = $state<"idle" | "success" | "error">("idle");
  let renderTimeout: ReturnType<typeof setTimeout> | null = null;
  const renderCache = new Map<string, string>();

  $effect(() => {
    // Clear any pending render when the entity/content changes
    if (renderTimeout) {
      clearTimeout(renderTimeout);
      renderTimeout = null;
    }

    const currentEntity = entity;
    const content = currentEntity?.content ?? "";

    if (!content) {
      renderedContent = "";
      return;
    }

    // Use a simple cache key based on entity id and content length
    const cacheKey =
      currentEntity && typeof currentEntity.id === "string"
        ? `${currentEntity.id}:${content.length}`
        : `content:${content.length}:${content.slice(0, 64)}`;

    const cached = renderCache.get(cacheKey);
    if (cached) {
      renderedContent = cached;
      return;
    }

    // Debounce rendering to avoid blocking on rapid navigation
    renderTimeout = setTimeout(async () => {
      try {
        const html = await parserService.parse(content);
        const sanitized = DOMPurify.sanitize(html);
        renderCache.set(cacheKey, sanitized);

        // Only update if the entity/content is still the same
        if (
          entity &&
          currentEntity &&
          entity.id === currentEntity.id &&
          entity.content === content
        ) {
          renderedContent = sanitized;
        }
      } catch (err) {
        console.error("Parsing failed:", err);
      }
    }, 100);
  });

  const connections = $derived.by(() => {
    if (!entity) return [];

    const outbound = (entity.connections || []).map((c) => ({
      ...c,
      isOutbound: true,
      displayTitle: vault.entities[c.target]?.title || c.target,
      targetId: c.target,
    }));

    const inbound = (vault.inboundConnections[entity.id] || []).map((item) => ({
      ...item.connection,
      isOutbound: false,
      displayTitle: vault.entities[item.sourceId]?.title || item.sourceId,
      targetId: item.sourceId,
    }));

    return [...outbound, ...inbound];
  });

  const navigate = (id: string) => {
    ui.openReadMode(id);
  };

  const copyToClipboard = async () => {
    if (!entity || !renderedContent) return;

    try {
      const typeHtml = "text/html";
      const typeText = "text/plain";

      const blobHtml = new Blob([renderedContent], { type: typeHtml });
      const blobText = new Blob([entity.content || ""], { type: typeText });

      const data = [
        new ClipboardItem({
          [typeHtml]: blobHtml,
          [typeText]: blobText,
        }),
      ];

      await navigator.clipboard.write(data);
      copyStatus = "success";
      setTimeout(() => (copyStatus = "idle"), 2000);
    } catch (err) {
      console.error("Failed to copy", err);
      copyStatus = "error";
      setTimeout(() => (copyStatus = "idle"), 2000);
    }
  };
</script>

{#if ui.readModeNodeId}
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div
    class="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
    onclick={(event) => {
      if (event.target === event.currentTarget) close();
    }}
    role="dialog"
    aria-modal="true"
    tabindex="-1"
    onkeydown={(e) => e.key === "Escape" && close()}
  >
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div
      class="bg-[#0c0c0c] border border-green-900/50 w-full max-w-3xl h-[85vh] flex flex-col shadow-2xl relative rounded-sm"
      onclick={(e) => e.stopPropagation()}
      role="document"
    >
      <!-- Header -->
      <div
        class="p-6 border-b border-green-900/30 flex justify-between items-start bg-[#0a0a0a]"
      >
        <div>
          {#if entity}
            <div class="flex items-center gap-3 mb-2">
              <span
                class="{getIconClass(
                  categories.getCategory(entity.type)?.icon,
                )} text-green-500 w-5 h-5"
              ></span>
              <span
                class="text-xs font-bold tracking-widest text-green-600 uppercase"
                >{entity.type}</span
              >
            </div>
            <h2
              class="text-2xl md:text-3xl font-bold text-gray-100 font-serif tracking-wide"
            >
              {entity.title}
            </h2>
          {:else}
            <h2 class="text-2xl text-red-500 font-mono">Entity Not Found</h2>
          {/if}
        </div>

        <div class="flex items-center gap-2 absolute top-4 right-4">
          {#if entity}
            <button
              onclick={copyToClipboard}
              class="p-2 text-green-700 hover:text-green-500 transition rounded hover:bg-green-900/20"
              title="Copy Content"
            >
              {#if copyStatus === "success"}
                <span class="icon-[lucide--check] w-6 h-6"></span>
              {:else if copyStatus === "error"}
                <span class="icon-[lucide--alert-triangle] w-6 h-6 text-red-500"
                ></span>
              {:else}
                <span class="icon-[lucide--copy] w-6 h-6"></span>
              {/if}
            </button>
          {/if}

          <button
            onclick={close}
            class="text-green-700 hover:text-green-500 transition p-2 hover:bg-green-900/20 rounded"
            aria-label="Close"
          >
            <span class="icon-[heroicons--x-mark] w-6 h-6"></span>
          </button>
        </div>
      </div>

      <!-- Body -->
      <div class="flex-1 overflow-y-auto p-8 custom-scrollbar">
        {#if entity}
          <!-- Metadata / Tags -->
          {#if entity.tags && entity.tags.length > 0}
            <div class="flex flex-wrap gap-2 mb-6">
              {#each entity.tags as tag}
                <span
                  class="text-[10px] font-mono px-2 py-1 bg-green-900/20 text-green-400 border border-green-900/30 rounded"
                  >#{tag}</span
                >
              {/each}
            </div>
          {/if}

          <!-- Lore / Metadata Fields -->
          {#if entity.lore}
            <div
              class="mb-8 p-4 bg-green-900/10 border-l-2 border-green-500 rounded-r"
            >
              <h4
                class="text-green-400 font-bold text-xs uppercase tracking-widest mb-2 font-mono"
              >
                Lore & Context
              </h4>
              <div class="prose prose-invert prose-sm max-w-none text-gray-300">
                {#await parserService.parse(entity.lore) then html}
                  {@html DOMPurify.sanitize(html)}
                {/await}
              </div>
            </div>
          {/if}

          <!-- Main Content -->
          <div
            class="prose prose-invert prose-lg max-w-none text-gray-200 mb-12"
          >
            {#if renderedContent}
              {@html renderedContent}
            {:else}
              <p class="text-gray-500 italic">No content available</p>
            {/if}
          </div>

          <!-- Connections -->
          <div class="border-t border-green-900/30 pt-6">
            <h3 class="text-green-500 font-serif italic text-xl mb-4">
              Connections
            </h3>
            {#if connections.length > 0}
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                {#each connections as conn}
                  <button
                    onclick={() => navigate(conn.targetId)}
                    class="flex items-center gap-3 p-3 rounded border border-green-900/20 bg-green-900/5 hover:bg-green-900/10 hover:border-green-700 transition text-left group"
                  >
                    <span
                      class="w-4 h-4 shrink-0 {conn.isOutbound
                        ? 'text-green-500 icon-[lucide--arrow-up-right]'
                        : 'text-blue-500 icon-[lucide--arrow-down-left]'}"
                    ></span>
                    <div class="flex-1 min-w-0">
                      <div
                        class="text-sm font-bold text-gray-200 group-hover:text-green-400 transition truncate"
                      >
                        {conn.displayTitle}
                      </div>
                      <div class="text-xs text-gray-500 truncate">
                        {conn.label || conn.type}
                      </div>
                    </div>
                  </button>
                {/each}
              </div>
            {:else}
              <p class="text-gray-600 italic">No linked entities.</p>
            {/if}
          </div>
        {:else}
          <p class="text-gray-500 font-mono">
            The requested node could not be loaded.
          </p>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: #000;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #15803d;
    border-radius: 3px;
  }
</style>
