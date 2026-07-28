<script lang="ts">
  import type { AdventureNode } from "generator-engine";

  let {
    node,
    isOpen = false,
    onClose,
    onSave,
  }: {
    node: AdventureNode | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: (updatedNode: AdventureNode) => void;
  } = $props();

  let title = $state("");
  let description = $state("");
  let role = $state("");
  let relation = $state("");
  let leverage = $state("");
  let dilemma = $state("");
  let wants = $state("");
  let secret = $state("");

  $effect(() => {
    if (node) {
      title = node.data.title || "";
      description = node.data.description || node.data.summary || "";
      role = node.data.role || "";
      relation = node.data.relation || "";
      leverage = node.data.leverage || "";
      dilemma = node.data.dilemma || "";
      wants = node.data.wants || "";
      secret = node.data.secret || "";
    }
  });

  function handleSave() {
    if (!node) return;
    const updated: AdventureNode = {
      ...node,
      data: {
        ...node.data,
        title,
        description,
        role: role || undefined,
        relation: relation || undefined,
        leverage: leverage || undefined,
        dilemma: dilemma || undefined,
        wants: wants || undefined,
        secret: secret || undefined,
      },
    };
    onSave(updated);
    onClose();
  }
</script>

{#if isOpen && node}
  <div
    class="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-theme-bg border-l border-theme-border shadow-2xl p-5 overflow-y-auto flex flex-col gap-4"
  >
    <div
      class="flex items-center justify-between border-b border-theme-border/50 pb-3"
    >
      <h3
        class="font-header font-bold text-sm text-theme-text flex items-center gap-2"
      >
        <span
          class="icon-[lucide--edit-3] h-4 w-4 text-theme-primary"
          aria-hidden="true"
        ></span>
        Edit Node: {node.data.type.toUpperCase()}
      </h3>
      <button
        type="button"
        onclick={onClose}
        aria-label="Close drawer"
        class="text-theme-muted hover:text-theme-text p-1 rounded-md transition-colors"
      >
        <span class="icon-[lucide--x] h-4 w-4" aria-hidden="true"></span>
      </button>
    </div>

    <div class="space-y-3 flex-1 text-xs">
      <div>
        <label
          for="adv-node-title"
          class="block font-semibold text-theme-text mb-1">Title</label
        >
        <input
          id="adv-node-title"
          type="text"
          bind:value={title}
          class="w-full px-2.5 py-1.5 rounded-md border border-theme-border bg-theme-bg/60 text-theme-text focus:outline-none focus:ring-1 focus:ring-theme-primary"
        />
      </div>

      <div>
        <label
          for="adv-node-desc"
          class="block font-semibold text-theme-text mb-1"
          >Description / Summary</label
        >
        <textarea
          id="adv-node-desc"
          rows="3"
          bind:value={description}
          class="w-full px-2.5 py-1.5 rounded-md border border-theme-border bg-theme-bg/60 text-theme-text focus:outline-none focus:ring-1 focus:ring-theme-primary"
        ></textarea>
      </div>

      {#if node.data.type === "location"}
        <div>
          <label
            for="adv-node-role"
            class="block font-semibold text-theme-text mb-1"
            >Role in Scenario</label
          >
          <input
            id="adv-node-role"
            type="text"
            bind:value={role}
            class="w-full px-2.5 py-1.5 rounded-md border border-theme-border bg-theme-bg/60 text-theme-text focus:outline-none focus:ring-1 focus:ring-theme-primary"
          />
        </div>
      {/if}

      {#if node.data.type === "npc"}
        <div>
          <label
            for="adv-node-wants"
            class="block font-semibold text-theme-text mb-1">Wants / Goal</label
          >
          <input
            id="adv-node-wants"
            type="text"
            bind:value={wants}
            class="w-full px-2.5 py-1.5 rounded-md border border-theme-border bg-theme-bg/60 text-theme-text focus:outline-none focus:ring-1 focus:ring-theme-primary"
          />
        </div>

        <div>
          <label
            for="adv-node-secret"
            class="block font-semibold text-theme-text mb-1">Secret</label
          >
          <input
            id="adv-node-secret"
            type="text"
            bind:value={secret}
            class="w-full px-2.5 py-1.5 rounded-md border border-theme-border bg-theme-bg/60 text-theme-text focus:outline-none focus:ring-1 focus:ring-theme-primary"
          />
        </div>
      {/if}

      <div>
        <label
          for="adv-node-leverage"
          class="block font-semibold text-theme-text mb-1"
          >Player Leverage</label
        >
        <input
          id="adv-node-leverage"
          type="text"
          bind:value={leverage}
          class="w-full px-2.5 py-1.5 rounded-md border border-theme-border bg-theme-bg/60 text-theme-text focus:outline-none focus:ring-1 focus:ring-theme-primary"
        />
      </div>

      <div>
        <label
          for="adv-node-dilemma"
          class="block font-semibold text-theme-text mb-1"
          >Dilemma / Priority Conflict</label
        >
        <input
          id="adv-node-dilemma"
          type="text"
          bind:value={dilemma}
          class="w-full px-2.5 py-1.5 rounded-md border border-theme-border bg-theme-bg/60 text-theme-text focus:outline-none focus:ring-1 focus:ring-theme-primary"
        />
      </div>
    </div>

    <div
      class="flex items-center justify-end gap-2 border-t border-theme-border/50 pt-3"
    >
      <button
        type="button"
        onclick={onClose}
        class="px-3 py-1.5 rounded-md border border-theme-border text-theme-muted hover:text-theme-text text-xs transition-colors"
      >
        Cancel
      </button>
      <button
        type="button"
        onclick={handleSave}
        class="px-3 py-1.5 rounded-md bg-theme-primary text-theme-bg font-semibold text-xs hover:bg-theme-primary/90 transition-colors"
      >
        Save Changes
      </button>
    </div>
  </div>
{/if}
