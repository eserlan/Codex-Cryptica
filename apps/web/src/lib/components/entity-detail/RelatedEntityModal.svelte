<script lang="ts">
  import { fade, scale } from "svelte/transition";
  import { categories } from "$lib/stores/categories.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { oracle } from "$lib/stores/oracle.svelte";
  import { notificationStore } from "$lib/stores/ui/notification.svelte";
  import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
  import { textGenerationService } from "@codex/ai-engine";
  import { entityTemplateService } from "$lib/services/EntityTemplateService.svelte";
  import { discoveryPolicyStore } from "$lib/stores/ui/discovery-policy.svelte";
  import type { ConnectedEntityPromptContext } from "schema";
  import DecorativeGlowFrame from "$lib/components/ui/DecorativeGlowFrame.svelte";

  let {
    isOpen,
    sourceEntityId,
    onClose,
  }: {
    isOpen: boolean;
    sourceEntityId: string | null;
    onClose: () => void;
  } = $props();

  const sourceEntity = $derived(
    sourceEntityId ? vault.entities[sourceEntityId] : null,
  );

  // Form State
  let targetType = $state("character");
  let selectedRelationship = $state("related to");
  let customRelationship = $state("");
  let customInstructions = $state("");

  // Wizard Stages: 'configure' | 'loading' | 'review'
  let stage = $state<"configure" | "loading" | "review">("configure");
  let loadingStatus = $state("Compiling entity context...");
  let generationError = $state<string | null>(null);

  // Draft Entity State (Review stage)
  let draftName = $state("");
  let draftType = $state("");
  let draftSummary = $state("");
  let draftDescription = $state("");
  let draftLabelsStr = $state("");
  let draftPlotHook = $state("");
  let draftRelationshipBack = $state("");
  let isSaving = $state(false);

  // Relationships mapping
  const RELATIONSHIP_SUGGESTIONS: Record<string, Record<string, string[]>> = {
    character: {
      character: [
        "rival",
        "ally",
        "mentor",
        "student",
        "spouse",
        "sibling",
        "parent",
        "child",
        "enemy",
      ],
      item: ["signature item", "heirloom", "creator of", "wielder of"],
      location: ["resident of", "ruler of", "born in", "explorer of"],
      faction: ["leader of", "founder of", "member of", "enemy of"],
      event: ["instigator of", "survivor of", "hero of"],
    },
    location: {
      character: ["ruled by", "discovered by", "birthplace of"],
      item: ["site of discovery", "housed item", "treasury of"],
      location: ["neighboring", "capital of", "province of"],
      faction: ["controlled by", "headquarters of", "contested by"],
      event: ["site of event"],
    },
    faction: {
      character: ["led by", "founded by", "allied character"],
      location: ["headquarters", "stronghold in"],
      faction: [
        "allied with",
        "rival of",
        "sub-faction of",
        "parent faction of",
      ],
      event: ["instigator of", "dissolved by"],
    },
  };

  // Compute relationship suggestions based on source and target types
  const relationshipSuggestions = $derived.by(() => {
    if (!sourceEntity) return ["related to", "ally", "rival"];
    const sType = sourceEntity.type.toLowerCase();
    const tType = targetType.toLowerCase();
    const suggestions = RELATIONSHIP_SUGGESTIONS[sType]?.[tType] || [
      "related to",
      "ally",
      "rival",
      "servant",
      "master",
    ];
    return [...suggestions, "custom"];
  });

  // Watch for change in suggestions list and reset default selected relationship
  $effect(() => {
    if (
      relationshipSuggestions.length > 0 &&
      !relationshipSuggestions.includes(selectedRelationship)
    ) {
      selectedRelationship = relationshipSuggestions[0];
    }
  });

  const activeRelationship = $derived(
    selectedRelationship === "custom"
      ? customRelationship
      : selectedRelationship,
  );

  const aiEnabled = $derived(!discoveryPolicyStore.aiDisabled);

  function gatherNeighborsContext(): ConnectedEntityPromptContext[] {
    if (!sourceEntity) return [];
    const neighbors: ConnectedEntityPromptContext[] = [];
    const seen = new Set<string>();

    if (sourceEntity.connections) {
      for (const conn of sourceEntity.connections) {
        const targetEntity = vault.entities[conn.target];
        if (targetEntity && !seen.has(conn.target)) {
          seen.add(conn.target);
          neighbors.push({
            title: targetEntity.title,
            type: targetEntity.type,
            relation: conn.label || conn.type || "related to",
            content: targetEntity.content || "",
          });
        }
      }
    }

    const inbound = vault.inboundConnections[sourceEntity.id];
    if (inbound) {
      for (const item of inbound) {
        const sourceId = item.sourceId;
        const sEntity = vault.entities[sourceId];
        if (sEntity && !seen.has(sourceId)) {
          seen.add(sourceId);
          neighbors.push({
            title: sEntity.title,
            type: sEntity.type,
            relation:
              item.connection.label || item.connection.type || "related from",
            content: sEntity.content || "",
          });
        }
      }
    }
    return neighbors.slice(0, 15); // Limit context size
  }

  async function handleGenerate() {
    if (!sourceEntityId || !sourceEntity) return;
    if (vault.isGuest) {
      notificationStore.notify(
        "Only the host can generate related entities.",
        "error",
      );
      return;
    }
    if (!aiEnabled) {
      notificationStore.notify("AI features are currently disabled.", "error");
      return;
    }

    stage = "loading";
    generationError = null;

    try {
      loadingStatus = "Compiling entity context...";
      const neighbors = gatherNeighborsContext();

      loadingStatus = "Resolving templates...";
      // Resolve layout templates to pass down structures
      const templateOutline =
        targetType !== "Surprise Me"
          ? await entityTemplateService.resolveTemplate(targetType)
          : "";

      loadingStatus = "Generating related entity...";
      const result = await textGenerationService.generateRelatedEntity!(
        oracle.effectiveApiKey || "",
        oracle.settingsManager.modelName,
        {
          title: sourceEntity.title,
          type: sourceEntity.type,
          content: sourceEntity.content,
          lore: sourceEntity.lore,
        },
        targetType,
        activeRelationship,
        customInstructions.trim(),
        neighbors,
        categories.list.map((c) => ({ id: c.id, label: c.label })),
        templateOutline,
        { isGuest: vault.isGuest, aiDisabled: discoveryPolicyStore.aiDisabled },
      );

      // Populate draft preview form
      draftName = result.name;
      draftType = result.type;
      draftSummary = result.summary;
      draftDescription = result.description;
      draftLabelsStr = result.labels ? result.labels.join(", ") : "";
      draftPlotHook = result.plotHook || "";
      draftRelationshipBack = result.relationshipBack || activeRelationship;

      stage = "review";
    } catch (err: any) {
      console.error(err);
      generationError = err.message || "Failed to generate related entity.";
      notificationStore.notify(generationError || "", "error");
      stage = "configure";
    }
  }

  async function handleSave() {
    if (!sourceEntityId || !sourceEntity) return;
    if (!draftName.trim() || !draftType.trim()) {
      notificationStore.notify("Name and type are required.", "error");
      return;
    }
    if (isSaving) return;

    try {
      isSaving = true;
      const parsedLabels = draftLabelsStr
        .split(",")
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      // 1. Create Entity
      const initialData: any = {
        content: draftSummary.trim(),
        lore: draftDescription.trim(),
        labels: parsedLabels,
      };

      if (draftPlotHook.trim()) {
        initialData.plot_hook = draftPlotHook.trim();
      }

      const newId = await vault.createEntity(
        draftType,
        draftName.trim(),
        initialData,
      );

      // 2. Establish directed connection: Source -> New Entity
      const relationshipLabel =
        draftRelationshipBack.trim() || activeRelationship;
      await vault.addConnection(
        sourceEntityId,
        newId,
        "related_to",
        relationshipLabel,
      );

      notificationStore.notify(
        `Entity "${draftName}" created successfully!`,
        "success",
      );
      onClose();
    } catch (err: any) {
      console.error(err);
      notificationStore.notify(
        err.message || "Failed to create entity.",
        "error",
      );
    } finally {
      isSaving = false;
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (!isOpen) return;
    if (e.key === "Escape") {
      onClose();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
  <!-- Backdrop -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto"
    transition:fade={{ duration: 200 }}
    onclick={onClose}
  >
    <!-- Modal Container -->
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="related-modal-title"
      tabindex="-1"
      class="relative w-full max-w-2xl my-8 overflow-hidden rounded-[2rem] border border-theme-border bg-theme-surface shadow-2xl transition-all"
      transition:scale={{ duration: 250, start: 0.95 }}
      onclick={(e) => e.stopPropagation()}
    >
      <DecorativeGlowFrame />

      <!-- HEADER -->
      <div class="relative px-8 pt-8 pb-4 border-b border-theme-border/40">
        <div class="flex items-center justify-between">
          <div>
            <h3
              id="related-modal-title"
              class="font-header text-lg font-bold uppercase tracking-widest text-theme-text"
            >
              Generate Related Entity
            </h3>
            {#if sourceEntity}
              <p class="text-xs text-theme-muted mt-1">
                Branching from: <span class="text-theme-primary font-bold"
                  >{sourceEntity.title}</span
                >
                ({sourceEntity.type})
              </p>
            {/if}
          </div>
          <button
            class="text-theme-muted hover:text-theme-text transition-colors p-1"
            onclick={onClose}
            aria-label="Close"
          >
            <span class="icon-[lucide--x] h-6 w-6"></span>
          </button>
        </div>
      </div>

      <!-- CONTENT STAGES -->
      <div class="px-8 py-6 max-h-[70vh] overflow-y-auto">
        {#if stage === "configure"}
          {#if !aiEnabled}
            <div
              class="rounded-xl border border-red-500/30 bg-red-950/20 p-6 text-center"
            >
              <span
                class="icon-[lucide--alert-triangle] text-red-400 h-10 w-10 mx-auto mb-3"
              ></span>
              <h4 class="font-bold text-red-200">AI Features Disabled</h4>
              <p class="text-xs text-red-300/80 mt-1 max-w-md mx-auto">
                AI features are currently disabled. Please enable them in the
                settings panel to generate related entities.
              </p>
              <button
                class="mt-4 rounded-lg bg-red-600/35 border border-red-500/50 hover:bg-red-600/50 px-4 py-2 text-xs font-bold text-white uppercase tracking-wider transition-all"
                onclick={() => {
                  onClose();
                  modalUIStore.openSettings("intelligence");
                }}
              >
                Open Settings
              </button>
            </div>
          {:else if vault.isGuest}
            <div
              class="rounded-xl border border-theme-border bg-theme-bg/40 p-6 text-center"
            >
              <span
                class="icon-[lucide--lock] text-theme-muted h-10 w-10 mx-auto mb-3"
              ></span>
              <h4 class="font-bold text-theme-text">Host Only</h4>
              <p class="text-xs text-theme-muted mt-1 max-w-md mx-auto">
                Only the host can generate related entities.
              </p>
            </div>
          {:else}
            <!-- Config Form -->
            <div class="flex flex-col gap-5">
              <!-- Target Type Selector -->
              <div class="flex flex-col gap-2">
                <label
                  for="target-type"
                  class="text-xs font-bold uppercase tracking-wider text-theme-text"
                >
                  Target Entity Type
                </label>
                <select
                  id="target-type"
                  bind:value={targetType}
                  class="w-full rounded-xl border border-theme-border bg-theme-bg px-4 py-3 text-sm text-theme-text focus:outline-none focus:border-theme-primary"
                >
                  {#each categories.list as cat}
                    <option value={cat.id}>{cat.label || cat.id}</option>
                  {/each}
                  <option value="Surprise Me">🎲 Surprise Me</option>
                </select>
              </div>

              <!-- Relationship Selector -->
              <div class="flex flex-col gap-2">
                <label
                  for="relationship"
                  class="text-xs font-bold uppercase tracking-wider text-theme-text"
                >
                  Relationship / Role
                </label>
                <select
                  id="relationship"
                  bind:value={selectedRelationship}
                  class="w-full rounded-xl border border-theme-border bg-theme-bg px-4 py-3 text-sm text-theme-text focus:outline-none focus:border-theme-primary"
                >
                  {#each relationshipSuggestions as suggestion}
                    <option value={suggestion}>
                      {suggestion === "custom"
                        ? "✏️ Custom Label..."
                        : suggestion}
                    </option>
                  {/each}
                </select>
              </div>

              {#if selectedRelationship === "custom"}
                <!-- Custom Relationship Input -->
                <div
                  class="flex flex-col gap-2"
                  transition:fade={{ duration: 150 }}
                >
                  <label
                    for="custom-relationship"
                    class="text-xs font-bold uppercase tracking-wider text-theme-text"
                  >
                    Custom Relationship Label
                  </label>
                  <input
                    id="custom-relationship"
                    type="text"
                    bind:value={customRelationship}
                    placeholder="e.g. arch-nemesis"
                    class="w-full rounded-xl border border-theme-border bg-theme-bg px-4 py-3 text-sm text-theme-text focus:outline-none focus:border-theme-primary"
                  />
                </div>
              {/if}

              <!-- Custom Instructions -->
              <div class="flex flex-col gap-2">
                <label
                  for="custom-instructions"
                  class="text-xs font-bold uppercase tracking-wider text-theme-text"
                >
                  Custom Instructions (Optional)
                </label>
                <textarea
                  id="custom-instructions"
                  bind:value={customInstructions}
                  rows="3"
                  placeholder="e.g. Make them slightly mysterious, or mention their past association with the source entity."
                  class="w-full rounded-xl border border-theme-border bg-theme-bg px-4 py-3 text-sm text-theme-text focus:outline-none focus:border-theme-primary resize-none"
                ></textarea>
              </div>
            </div>
          {/if}
        {:else}
          <!-- Stage: Loading -->
          {#if stage === "loading"}
            <div
              class="flex flex-col items-center justify-center py-12 text-center"
            >
              <div class="relative h-16 w-16 mb-6">
                <!-- Outer Ring -->
                <div
                  class="absolute inset-0 rounded-full border-4 border-theme-primary/20"
                ></div>
                <!-- Spin Ring -->
                <div
                  class="absolute inset-0 rounded-full border-4 border-t-theme-primary animate-spin"
                ></div>
              </div>
              <p
                class="font-header text-sm font-semibold tracking-wider text-theme-text animate-pulse"
              >
                {loadingStatus}
              </p>
              <p class="text-xs text-theme-muted mt-2">
                Please hold while the Lore synthesis settles...
              </p>
            </div>
          {:else if stage === "review"}
            <!-- Stage: Review & Edit Draft -->
            <div class="flex flex-col gap-5">
              <!-- Name & Type -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="flex flex-col gap-2">
                  <label
                    for="draft-name"
                    class="text-xs font-bold uppercase tracking-wider text-theme-text"
                  >
                    Entity Name
                  </label>
                  <input
                    id="draft-name"
                    type="text"
                    bind:value={draftName}
                    class="w-full rounded-xl border border-theme-border bg-theme-bg px-4 py-3 text-sm text-theme-text focus:outline-none focus:border-theme-primary"
                  />
                </div>
                <div class="flex flex-col gap-2">
                  <label
                    for="draft-type"
                    class="text-xs font-bold uppercase tracking-wider text-theme-text"
                  >
                    Category Type
                  </label>
                  <select
                    id="draft-type"
                    bind:value={draftType}
                    class="w-full rounded-xl border border-theme-border bg-theme-bg px-4 py-3 text-sm text-theme-text focus:outline-none focus:border-theme-primary"
                  >
                    {#each categories.list as cat}
                      <option value={cat.id}>{cat.label || cat.id}</option>
                    {/each}
                  </select>
                </div>
              </div>

              <!-- Summary -->
              <div class="flex flex-col gap-2">
                <label
                  for="draft-summary"
                  class="text-xs font-bold uppercase tracking-wider text-theme-text"
                >
                  Summary (Player-facing chronicle snippet)
                </label>
                <textarea
                  id="draft-summary"
                  bind:value={draftSummary}
                  rows="2"
                  class="w-full rounded-xl border border-theme-border bg-theme-bg px-4 py-3 text-sm text-theme-text focus:outline-none focus:border-theme-primary resize-none"
                ></textarea>
              </div>

              <!-- Description -->
              <div class="flex flex-col gap-2">
                <label
                  for="draft-desc"
                  class="text-xs font-bold uppercase tracking-wider text-theme-text"
                >
                  Description / Lore (GM-facing details)
                </label>
                <textarea
                  id="draft-desc"
                  bind:value={draftDescription}
                  rows="6"
                  class="w-full rounded-xl border border-theme-border bg-theme-bg px-4 py-3 text-sm text-theme-text focus:outline-none focus:border-theme-primary font-mono text-xs"
                ></textarea>
              </div>

              <!-- Labels (comma-separated list) -->
              <div class="flex flex-col gap-2">
                <label
                  for="draft-labels"
                  class="text-xs font-bold uppercase tracking-wider text-theme-text"
                >
                  Labels (Comma-separated)
                </label>
                <input
                  id="draft-labels"
                  type="text"
                  bind:value={draftLabelsStr}
                  placeholder="e.g. faction-member, mysterious, elite"
                  class="w-full rounded-xl border border-theme-border bg-theme-bg px-4 py-3 text-sm text-theme-text focus:outline-none focus:border-theme-primary"
                />
              </div>

              <!-- Plot Hook -->
              <div class="flex flex-col gap-2">
                <label
                  for="draft-hook"
                  class="text-xs font-bold uppercase tracking-wider text-theme-text"
                >
                  Plot Hook (Optional)
                </label>
                <textarea
                  id="draft-hook"
                  bind:value={draftPlotHook}
                  rows="2"
                  placeholder="e.g. Rumored to hold the key to the vault..."
                  class="w-full rounded-xl border border-theme-border bg-theme-bg px-4 py-3 text-sm text-theme-text focus:outline-none focus:border-theme-primary resize-none"
                ></textarea>
              </div>

              <!-- Relationship Back Label -->
              <div class="flex flex-col gap-2">
                <label
                  for="draft-relation-back"
                  class="text-xs font-bold uppercase tracking-wider text-theme-text"
                >
                  Relationship Label (Source → New Entity)
                </label>
                <input
                  id="draft-relation-back"
                  type="text"
                  bind:value={draftRelationshipBack}
                  class="w-full rounded-xl border border-theme-border bg-theme-bg px-4 py-3 text-sm text-theme-text focus:outline-none focus:border-theme-primary"
                />
              </div>
            </div>
          {/if}
        {/if}
      </div>

      <!-- FOOTER ACTIONS -->
      <div
        class="px-8 py-6 border-t border-theme-border/40 flex items-center justify-end gap-3 bg-theme-bg/10"
      >
        {#if stage === "configure"}
          <button
            class="rounded-xl border border-theme-border bg-theme-bg/50 px-6 py-3 text-xs font-bold uppercase tracking-widest text-theme-muted transition-all hover:bg-theme-bg hover:text-theme-text"
            onclick={onClose}
          >
            Cancel
          </button>
          {#if aiEnabled && !vault.isGuest}
            <button
              class="rounded-xl bg-theme-primary text-theme-bg border border-theme-primary hover:bg-theme-secondary hover:border-theme-secondary px-6 py-3 text-xs font-bold uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(var(--color-theme-primary-rgb),0.25)]"
              onclick={handleGenerate}
            >
              Generate
            </button>
          {/if}
        {:else if stage === "review"}
          <button
            class="rounded-xl border border-theme-border bg-theme-bg/50 px-4 py-3 text-xs font-bold uppercase tracking-widest text-theme-muted transition-all hover:bg-theme-bg hover:text-theme-text flex items-center gap-2"
            onclick={() => {
              stage = "configure";
            }}
          >
            <span class="icon-[lucide--arrow-left] h-4 w-4"></span>
            Configure
          </button>
          <button
            class="rounded-xl border border-theme-border bg-theme-bg/50 px-4 py-3 text-xs font-bold uppercase tracking-widest text-theme-muted transition-all hover:bg-theme-bg hover:text-theme-text flex items-center gap-2"
            onclick={handleGenerate}
          >
            <span class="icon-[lucide--rotate-cw] h-4 w-4 animate-spin-reverse"
            ></span>
            Revise
          </button>
          <button
            class="rounded-xl bg-theme-primary text-theme-bg border border-theme-primary hover:bg-theme-secondary hover:border-theme-secondary px-6 py-3 text-xs font-bold uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(var(--color-theme-primary-rgb),0.25)] flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            onclick={handleSave}
            disabled={isSaving}
          >
            <span class="icon-[lucide--check] h-4 w-4"></span>
            Create Entity
          </button>
        {/if}
      </div>
    </div>
  </div>
{/if}
