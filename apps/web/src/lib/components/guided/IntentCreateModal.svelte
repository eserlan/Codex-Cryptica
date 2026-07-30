<script lang="ts">
  import type { IntentCategory } from "generator-engine";
  import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { resolveIntentContext } from "./contextual-intent-helper";
  import ModalShell from "$lib/components/ui/ModalShell.svelte";

  let initialPrompt = $state("");

  const INTENTS: Array<{
    category: IntentCategory;
    label: string;
    icon: string;
  }> = [
    { category: "character", label: "Character", icon: "icon-[lucide--user]" },
    { category: "place", label: "Place", icon: "icon-[lucide--map-pin]" },
    { category: "faction", label: "Faction", icon: "icon-[lucide--users]" },
    { category: "event", label: "Event", icon: "icon-[lucide--calendar]" },
    { category: "item", label: "Item", icon: "icon-[lucide--package]" },
    { category: "custom", label: "Custom", icon: "icon-[lucide--sparkles]" },
  ];

  function close() {
    modalUIStore.closeIntentCreateMenu();
  }

  function selectIntent(category: IntentCategory) {
    const selectedId = vault.selectedEntityId;
    const activeEntity = selectedId ? vault.entities[selectedId] : null;
    const context = resolveIntentContext(category, {
      activeEntity: activeEntity
        ? {
            id: activeEntity.id,
            title: activeEntity.title,
            type: activeEntity.type,
          }
        : null,
    });

    close();

    const promptText = initialPrompt.trim() || null;

    if (context.generatorId) {
      modalUIStore.openIntentGeneratorWorkflow(
        context.generatorId,
        context.sourceEntityId,
        promptText,
      );
    } else if (context.sourceEntityId) {
      modalUIStore.openGeneratorWorkflowForEntity(context.sourceEntityId);
    } else {
      modalUIStore.openGeneratorWorkflow();
    }
  }
</script>

<ModalShell
  open={true}
  onClose={close}
  labelledBy="intent-create-title"
  backdropClass="bg-black/60 backdrop-blur-md"
  zIndexClass="z-[200]"
  class="bg-theme-surface border border-theme-border rounded-xl"
  maxWidthClass="max-w-md"
>
  <div data-testid="intent-create-modal" class="contents">
    <div
      class="p-4 border-b border-theme-border flex items-center justify-between"
    >
      <h2
        id="intent-create-title"
        class="text-sm font-bold uppercase tracking-widest text-theme-text font-header"
      >
        What do you want to create?
      </h2>
      <button
        type="button"
        onclick={close}
        class="p-1.5 rounded-lg hover:bg-theme-bg text-theme-muted hover:text-theme-text transition-colors"
        aria-label="Close"
      >
        <span class="icon-[lucide--x] w-4 h-4" aria-hidden="true"></span>
      </button>
    </div>

    <div class="p-4 space-y-4">
      <div>
        <label for="intent-prompt-input" class="sr-only"
          >Prompt or concept</label
        >
        <div class="relative">
          <span
            class="icon-[lucide--sparkles] w-4 h-4 text-theme-muted absolute left-3 top-1/2 -translate-y-1/2"
            aria-hidden="true"
          ></span>
          <input
            id="intent-prompt-input"
            type="text"
            bind:value={initialPrompt}
            placeholder="Optional prompt, name, or keywords..."
            data-testid="intent-prompt-input"
            class="w-full pl-9 pr-3 py-2 text-sm bg-theme-bg border border-theme-border rounded-lg text-theme-text placeholder:text-theme-muted focus:outline-none focus:border-theme-primary transition-colors"
            onkeydown={(e) => e.key === "Enter" && selectIntent("character")}
          />
        </div>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {#each INTENTS as intent (intent.category)}
          <button
            type="button"
            onclick={() => selectIntent(intent.category)}
            data-testid={`intent-${intent.category}`}
            class="flex flex-col items-center gap-2 p-4 rounded-xl border border-theme-border bg-theme-bg/40 hover:border-theme-primary hover:bg-theme-primary/10 transition-colors text-theme-text"
          >
            <span class="{intent.icon} w-6 h-6 text-theme-primary"></span>
            <span class="text-xs font-bold uppercase tracking-wider"
              >{intent.label}</span
            >
          </button>
        {/each}
      </div>
    </div>
  </div>
</ModalShell>
