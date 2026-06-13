<script lang="ts">
  import type { Entity, GuestChatConfig } from "schema";
  import { vault } from "$lib/stores/vault.svelte";
  import { guestChatStore } from "$lib/stores/guest-chat.svelte";
  import { isEntityVisible } from "schema";
  import MarkdownEditor from "$lib/components/MarkdownEditor.svelte";
  import type { EntityIndexEntry } from "$lib/utils/entity-mention-detector";
  import TemporalEditor from "$lib/components/timeline/TemporalEditor.svelte";
  import ConnectionEditor from "$lib/components/connections/ConnectionEditor.svelte";
  import Autocomplete from "$lib/components/ui/Autocomplete.svelte";
  import DetailProposals from "./proposals/DetailProposals.svelte";
  import { themeStore } from "$lib/stores/theme.svelte";
  import { revisionService } from "$lib/services/RevisionService.svelte";
  import { layoutUIStore } from "$lib/stores/ui/layout-ui.svelte";
  import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
  import { getTemporalLabel } from "./detail-tabs";
  import { oracle } from "$lib/stores/oracle.svelte";
  import { oracleBridge } from "$lib/cloud-bridge/oracle-bridge";
  import * as Comlink from "comlink";

  let isGeneratingPersonality = $state(false);
  let personalityError = $state<string | null>(null);
  const personalitySectionTitle = "Personality & Voice";

  const hasPersonalitySection = $derived.by(() => {
    const lore = isEditing ? editLore || entity.lore || "" : entity.lore || "";
    return /(?:^|\n)##\s+Personality\s*&\s*Voice\s*\n/i.test(lore);
  });

  function upsertMarkdownSection(
    content: string | undefined,
    title: string,
    sectionMarkdown: string,
  ): string {
    const body = (content || "").trimEnd();
    const section = `## ${title}\n${sectionMarkdown.trim()}`;
    const escapedTitle = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const sectionPattern = new RegExp(
      `(^|\\n)##\\s+${escapedTitle}\\s*\\n[\\s\\S]*?(?=\\n##\\s+|$)`,
      "i",
    );

    if (sectionPattern.test(body)) {
      return body.replace(sectionPattern, `$1${section}`);
    }

    return body ? `${body}\n\n${section}` : section;
  }

  async function generatePersonality(): Promise<boolean> {
    if (isGeneratingPersonality) return false;
    isGeneratingPersonality = true;
    personalityError = null;
    try {
      if (!oracle.textGeneration.generateResponse) {
        personalityError =
          "AI generation is unavailable. Add personality rules manually before saving.";
        return false;
      }

      const prompt = `Create only personality and voice notes for "${entity.title}".

Use this character context:
${editContent || entity.content || "No public character description yet."}

Private GM notes for tone only:
${editLore || entity.lore || "None"}

Return only markdown for a "${personalitySectionTitle}" section body.
Use 3-5 concise bullets.
Cover temperament, conversational habits, speech rhythm, word choice, and at least one in-character behavior rule.
Do not write a full character profile.
Do not include a heading, preamble, summary, stat block, lore rewrite, secrets, or unrelated biography.`;

      let generatedText = "";
      const handlePartial = (partial: string) => {
        generatedText = partial.trim();
        editLore = upsertMarkdownSection(
          editLore || entity.lore || "",
          personalitySectionTitle,
          generatedText,
        );
      };

      await oracle.textGeneration.generateResponse(
        oracle.effectiveApiKey || "",
        prompt,
        [],
        "",
        oracle.modelName || "gemini-3-flash-preview",
        oracleBridge.isReady ? Comlink.proxy(handlePartial) : handlePartial,
        false,
        [],
        {
          systemInstructionOverride:
            "You write only concise markdown personality and voice notes for tabletop RPG characters. Never rewrite the full character.",
        },
      );
      return !!generatedText.trim();
    } catch (err) {
      console.error("Failed to generate personality instructions:", err);
      personalityError =
        "AI generation failed. Add personality rules manually before saving.";
      return false;
    } finally {
      isGeneratingPersonality = false;
    }
  }

  let {
    entity,
    isEditing,
    editType,
    editContent = $bindable(),
    editLore = $bindable(),
    editStartDate = $bindable(),
    editEndDate = $bindable(),
    editGuestChatConfig = $bindable(),
  } = $props<{
    entity: Entity;
    isEditing: boolean;
    editType: string;
    editContent: string;
    editLore?: string;
    editStartDate: Entity["start_date"];
    editEndDate: Entity["end_date"];
    editGuestChatConfig?: GuestChatConfig;
  }>();

  let editingConnectionTarget = $state<string | null>(null);

  let isAddingConnection = $state(false);
  let newConnectionTargetName = $state("");
  let newConnectionTargetId = $state<string | null>(null);
  let newConnectionType = $state("related_to");
  let newConnectionLabel = $state("");
  let addConnectionError = $state<string | null>(null);
  let isConnecting = $state(false);

  async function handleAddConnection() {
    if (!newConnectionTargetId) {
      addConnectionError = "Please select a target entity.";
      return;
    }
    if (newConnectionTargetId === entity.id) {
      addConnectionError = "Cannot connect an entity to itself.";
      return;
    }
    if (isConnecting) return;

    try {
      isConnecting = true;
      const success = await vault.addConnection(
        entity.id,
        newConnectionTargetId,
        newConnectionType,
        newConnectionLabel.trim() || undefined,
      );

      if (success) {
        // Reset state
        isAddingConnection = false;
        newConnectionTargetName = "";
        newConnectionTargetId = null;
        newConnectionType = "related_to";
        newConnectionLabel = "";
        addConnectionError = null;
      } else {
        addConnectionError = "Failed to add connection.";
      }
    } catch (err: any) {
      addConnectionError = err.message || "Failed to add connection.";
    } finally {
      isConnecting = false;
    }
  }

  // Check if this entity is visible in guest/shared mode
  const isVisible = $derived.by(() => {
    if (!vault.isGuest) return true;
    return isEntityVisible(entity, {
      sharedMode: vault.isGuest,
      defaultVisibility: vault.defaultVisibility,
    });
  });

  let allConnections = $derived.by(() => {
    if (!entity) return [];

    const checkVisibility = (targetId: string) => {
      const targetEntity = vault.entities[targetId];
      if (!targetEntity) return false;
      if (!vault.isGuest) return true;
      return isEntityVisible(targetEntity, {
        sharedMode: vault.isGuest,
        defaultVisibility: vault.defaultVisibility,
      });
    };

    // ⚡ Bolt Optimization: Replace multiple .map() calls and array spread
    // with imperative loops using .push() to eliminate intermediate array
    // allocations and reduce GC overhead on reactive updates.
    const result = [];

    for (const c of entity.connections) {
      if (checkVisibility(c.target)) {
        result.push({
          ...c,
          isOutbound: true,
          displayTitle: vault.entities[c.target]?.title || c.target,
          targetId: c.target,
          hasPastLabel:
            vault.entities[c.target]?.labels?.some(
              (l) => l.toLowerCase() === "past",
            ) ?? false,
        });
      }
    }

    const inboundList = vault.inboundConnections[entity.id];
    if (inboundList) {
      for (const item of inboundList) {
        if (checkVisibility(item.sourceId)) {
          result.push({
            ...item.connection,
            isOutbound: false,
            displayTitle: vault.entities[item.sourceId]?.title || item.sourceId,
            targetId: item.sourceId,
            hasPastLabel:
              vault.entities[item.sourceId]?.labels?.some(
                (l) => l.toLowerCase() === "past",
              ) ?? false,
          });
        }
      }
    }

    // Add children if exist
    const entityId = entity.id;
    const allEntities = Object.values(vault.entities);
    const children = allEntities.filter(
      (e) => e.parent && e.parent.toLowerCase() === entityId.toLowerCase(),
    );
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (checkVisibility(child.id)) {
        const alreadyConnected = result.some((c) => c.targetId === child.id);
        if (!alreadyConnected) {
          result.push({
            targetId: child.id,
            type: "child",
            label: "Child",
            isOutbound: false,
            isChild: true,
            displayTitle: child.title,
            hasPastLabel:
              child.labels?.some((l) => l.toLowerCase() === "past") ?? false,
          });
        }
      }
    }

    return result;
  });

  // Entity auto-link: build flat index of titles + aliases for mention detection.
  // vault.entities is available to both host and guest sessions (FR-011).
  const entityIndex = $derived<EntityIndexEntry[]>(
    Object.values(vault.entities).flatMap((e) => [
      { text: e.title.toLowerCase(), id: e.id },
      ...(e.aliases || []).map((a) => ({ text: a.toLowerCase(), id: e.id })),
    ]),
  );

  const isFantasyTheme = $derived(themeStore.activeTheme.id === "fantasy");
  const draft = $derived(
    revisionService.pendingDraft?.entityId === entity.id
      ? revisionService.pendingDraft
      : null,
  );
</script>

<div class="space-y-4 md:space-y-6">
  {#if !isEditing}
    {#if !vault.isGuest}
      <div class="flex justify-end">
        <button
          type="button"
          onclick={() => modalUIStore.openGeneratorWorkflowForEntity(entity.id)}
          class="text-xs font-bold uppercase tracking-widest bg-theme-primary text-theme-bg border border-theme-primary hover:bg-theme-secondary hover:border-theme-secondary px-4 py-2 rounded-xl flex items-center gap-1.5 transition shadow-[0_0_15px_rgba(var(--color-theme-primary-rgb),0.15)] cursor-pointer"
        >
          <span class="icon-[lucide--sparkles] w-4 h-4"></span>
          Generate Related
        </button>
      </div>
    {:else if entity.type === "character" && entity.guestChatConfig?.isEnabled && hasPersonalitySection}
      <div class="flex justify-end">
        <button
          type="button"
          onclick={() => guestChatStore.openChat(entity.id, entity.title)}
          class="text-xs font-bold uppercase tracking-widest bg-theme-primary text-theme-bg border border-theme-primary hover:bg-theme-secondary hover:border-theme-secondary px-4 py-2 rounded-xl flex items-center gap-1.5 transition shadow-[0_0_15px_rgba(var(--color-theme-primary-rgb),0.15)] cursor-pointer"
          data-testid="status-tab-guest-chat-button"
        >
          <span class="icon-[lucide--messages-square] w-4 h-4"></span>
          Chat with {entity.title}
        </button>
      </div>
    {/if}
  {/if}
  <!-- Temporal Metadata -->
  {#if isEditing}
    <div class="space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TemporalEditor
          bind:value={editStartDate}
          label={getTemporalLabel(editType, "start")}
          referenceValue={editEndDate}
        />
        <TemporalEditor
          bind:value={editEndDate}
          label={getTemporalLabel(editType, "end")}
          referenceValue={editStartDate}
        />
      </div>
    </div>
  {/if}

  <!-- Chronicle -->
  {#if isEditing || isVisible}
    <div>
      <div
        class="prose-content {draft
          ? 'bg-theme-primary/5 ring-1 ring-theme-primary/20 p-3 -m-3 rounded-lg relative overflow-hidden'
          : ''}"
      >
        {#if draft}
          <div
            class="absolute top-0 right-0 p-2 text-[8px] font-bold text-theme-primary uppercase tracking-[0.2em]"
          >
            Proposed
          </div>
        {/if}
        {#if !isVisible && vault.isGuest}
          <div
            class="text-theme-muted italic text-sm flex items-center gap-2 py-4"
          >
            <span class="icon-[lucide--lock] w-4 h-4"></span>
            Chronicle is hidden in shared mode
          </div>
        {:else}
          <MarkdownEditor
            content={isEditing
              ? editContent
              : draft
                ? draft.chronicle
                : entity.content || "No content yet."}
            editable={isEditing && !draft}
            onUpdate={(val) => {
              if (isEditing) editContent = val;
            }}
            entityIndex={isEditing ? [] : entityIndex}
            currentEntityId={entity.id}
            onEntityClick={(id) => {
              vault.selectedEntityId = id;
            }}
          />
        {/if}
      </div>
    </div>
  {/if}

  <!-- Connections -->
  <div>
    <div
      class="flex items-center justify-between border-b border-theme-border pb-1 mb-3"
      style:border-color={isFantasyTheme
        ? "var(--theme-selected-border)"
        : undefined}
    >
      <h3
        class="font-header text-lg {isFantasyTheme
          ? 'uppercase tracking-[0.16em] text-sm font-bold'
          : 'italic'}"
        style:color="var(--theme-section-title)"
      >
        {themeStore.jargon.connections_header}
      </h3>
      {#if !vault.isGuest && !isAddingConnection}
        <button
          type="button"
          onclick={() => (isAddingConnection = true)}
          class="text-xs font-bold text-theme-primary hover:text-theme-secondary flex items-center gap-1 transition"
          aria-label="Add new connection"
        >
          <span class="icon-[lucide--plus] w-3.5 h-3.5"></span>
          ADD
        </button>
      {/if}
    </div>

    {#if isAddingConnection}
      <div
        class="mb-4 p-3 bg-theme-surface border border-theme-primary/30 rounded-md space-y-3 shadow-md"
      >
        <div class="flex items-center justify-between">
          <span
            class="text-xs font-bold text-theme-secondary uppercase tracking-widest font-header"
            >New Connection</span
          >
          <button
            type="button"
            onclick={() => {
              isAddingConnection = false;
              newConnectionTargetName = "";
              newConnectionTargetId = null;
              newConnectionType = "related_to";
              newConnectionLabel = "";
              addConnectionError = null;
            }}
            class="text-theme-muted hover:text-theme-text"
            aria-label="Cancel adding connection"
          >
            <span class="icon-[lucide--x] w-3.5 h-3.5"></span>
          </button>
        </div>

        <div class="space-y-1">
          <label
            for="new-connection-target"
            class="block text-[10px] font-bold text-theme-secondary uppercase tracking-wider"
            >Target Entity</label
          >
          <Autocomplete
            bind:value={newConnectionTargetName}
            bind:selectedId={newConnectionTargetId}
            placeholder="Search entities..."
            id="new-connection-target"
            ariaLabel="Search target entity"
          />
        </div>

        <div class="space-y-1">
          <label
            for="new-connection-type"
            class="block text-[10px] font-bold text-theme-secondary uppercase tracking-wider"
            >Relationship Type</label
          >
          <select
            id="new-connection-type"
            bind:value={newConnectionType}
            class="w-full bg-theme-bg text-theme-text border border-theme-border rounded px-2 py-1.5 text-xs focus:outline-none focus:border-theme-primary"
          >
            <option value="related_to">Default (Grey)</option>
            <option value="neutral">Neutral (Amber)</option>
            <option value="friendly">Friendly (Blue)</option>
            <option value="enemy">Enemy (Red)</option>
          </select>
        </div>

        <div class="space-y-1">
          <label
            for="new-connection-label"
            class="block text-[10px] font-bold text-theme-secondary uppercase tracking-wider"
            >Custom Label (Optional)</label
          >
          <input
            id="new-connection-label"
            type="text"
            bind:value={newConnectionLabel}
            placeholder="e.g. Ally, Rivalling, Secret"
            class="w-full bg-theme-bg text-theme-text border border-theme-border rounded px-2 py-1.5 text-xs focus:outline-none focus:border-theme-primary"
          />
        </div>

        {#if addConnectionError}
          <p class="text-xs text-theme-danger font-semibold">
            {addConnectionError}
          </p>
        {/if}

        <div class="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onclick={() => {
              isAddingConnection = false;
              newConnectionTargetName = "";
              newConnectionTargetId = null;
              newConnectionType = "related_to";
              newConnectionLabel = "";
              addConnectionError = null;
            }}
            class="text-[10px] font-bold text-theme-muted hover:text-theme-text tracking-wider uppercase px-3 py-1.5"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isConnecting}
            onclick={handleAddConnection}
            class="text-[10px] bg-theme-primary text-theme-bg font-bold tracking-wider uppercase px-3 py-1.5 rounded hover:bg-theme-secondary transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isConnecting ? "Connecting..." : "Connect"}
          </button>
        </div>
      </div>
    {/if}

    <ul class="space-y-3">
      {#each allConnections as conn}
        {#if editingConnectionTarget === conn.targetId && conn.isOutbound && !conn.isChild}
          <li>
            <ConnectionEditor
              sourceId={entity.id}
              connection={conn}
              onSave={() => (editingConnectionTarget = null)}
              onCancel={() => (editingConnectionTarget = null)}
            />
          </li>
        {:else}
          <li class="flex gap-3 text-sm text-theme-muted items-start group">
            <span
              class="mt-1 w-3 h-3 shrink-0 {conn.isChild
                ? 'icon-[lucide--chevron-down]'
                : conn.isOutbound
                  ? 'icon-[lucide--arrow-up-right]'
                  : 'icon-[lucide--arrow-down-left]'}"
              style:color={conn.isChild
                ? "#10b981"
                : conn.isOutbound
                  ? "var(--theme-icon-active)"
                  : "var(--theme-icon-default)"}
            ></span>
            <div class="flex-1 min-w-0 flex justify-between items-start gap-2">
              <button
                onclick={(e) => {
                  layoutUIStore.setLastSelectedNodePosition({
                    x: e.clientX,
                    y: e.clientY,
                  });
                  vault.selectedEntityId = conn.targetId;
                }}
                class="text-left hover:text-theme-primary transition flex items-center flex-wrap gap-y-1"
              >
                {#if conn.isChild}
                  <span class="text-theme-text"
                    >{conn.displayTitle}{#if conn.hasPastLabel}<sup>*</sup
                      >{/if}</span
                  >
                  <span class="relation-arrow icon-[lucide--move-right]"></span>
                  <strong
                    class="text-theme-text group-hover:text-theme-primary transition"
                    >Child</strong
                  >
                  <span class="relation-arrow icon-[lucide--move-right]"></span>
                  <span class="text-theme-secondary"
                    >{entity.title}{#if entity.labels?.some((l: string) => l.toLowerCase() === "past")}<sup
                        >*</sup
                      >{/if}</span
                  >
                {:else if conn.isOutbound}
                  <span class="text-theme-secondary"
                    >{entity.title}{#if entity.labels?.some((l: string) => l.toLowerCase() === "past")}<sup
                        >*</sup
                      >{/if}</span
                  >
                  <span class="relation-arrow icon-[lucide--move-right]"></span>
                  <strong
                    class="text-theme-text group-hover:text-theme-primary transition"
                    >{conn.label || conn.type}</strong
                  >
                  <span class="relation-arrow icon-[lucide--move-right]"></span>
                  <span class="text-theme-text"
                    >{conn.displayTitle}{#if conn.hasPastLabel}<sup>*</sup
                      >{/if}</span
                  >
                {:else}
                  <span class="text-theme-text"
                    >{conn.displayTitle}{#if conn.hasPastLabel}<sup>*</sup
                      >{/if}</span
                  >
                  <span class="relation-arrow icon-[lucide--move-right]"></span>
                  <strong
                    class="text-theme-text group-hover:text-theme-primary transition"
                    >{conn.label || conn.type}</strong
                  >
                  <span class="relation-arrow icon-[lucide--move-right]"></span>
                  <span class="text-theme-secondary"
                    >{entity.title}{#if entity.labels?.some((l: string) => l.toLowerCase() === "past")}<sup
                        >*</sup
                      >{/if}</span
                  >
                {/if}
              </button>

              {#if !vault.isGuest}
                <div class="flex items-center gap-1">
                  {#if conn.isOutbound && !conn.isChild}
                    <button
                      class="text-theme-muted hover:text-theme-primary transition p-1"
                      onclick={() => (editingConnectionTarget = conn.targetId)}
                      aria-label="Edit connection"
                      title="Edit connection"
                    >
                      <span class="icon-[lucide--pencil] w-3 h-3"></span>
                    </button>
                  {/if}
                  {#if conn.isChild}
                    <button
                      class="text-theme-muted hover:text-theme-primary transition p-1"
                      onclick={() => {
                        isAddingConnection = true;
                        newConnectionTargetId = conn.targetId;
                        newConnectionTargetName = conn.displayTitle;
                        newConnectionType = "related_to";
                        newConnectionLabel = "";
                      }}
                      aria-label="Establish custom connection"
                      title="Establish custom connection"
                    >
                      <span class="icon-[lucide--plus] w-3 h-3"></span>
                    </button>
                  {/if}
                  <button
                    class="text-theme-muted hover:text-theme-danger transition p-1"
                    onclick={() => {
                      if (conn.isChild) {
                        vault.updateEntity(conn.targetId, {
                          parent: undefined,
                        });
                      } else if (conn.isOutbound) {
                        vault.removeConnection(
                          entity.id,
                          conn.targetId,
                          conn.type,
                        );
                      } else {
                        vault.removeConnection(
                          conn.targetId,
                          entity.id,
                          conn.type,
                        );
                      }
                    }}
                    aria-label="Delete connection"
                    title="Delete connection"
                  >
                    <span class="icon-[lucide--trash-2] w-3 h-3"></span>
                  </button>
                </div>
              {/if}
            </div>
          </li>
        {/if}
      {/each}
      {#if allConnections.length === 0}
        <li class="text-sm text-theme-muted italic">No known connections.</li>
      {/if}
    </ul>
  </div>

  <!-- Guest Character Chat Settings (Host Only, Type must be character) -->
  {#if !vault.isGuest && (editType === "character" || entity.type === "character")}
    <div
      class="border border-theme-border rounded-xl p-4 bg-theme-surface/5 space-y-4"
    >
      <div
        class="flex items-center justify-between border-b border-theme-border pb-2"
      >
        <h4
          class="font-header text-sm uppercase tracking-widest font-bold text-theme-secondary flex items-center gap-1.5"
        >
          <span
            class="icon-[lucide--messages-square] w-4 h-4 text-theme-primary"
          ></span>
          Guest Character Chat
        </h4>
        {#if !isEditing}
          <span
            class="text-xs px-2 py-0.5 rounded font-bold uppercase tracking-wider {entity
              .guestChatConfig?.isEnabled
              ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
              : 'bg-theme-muted/10 text-theme-muted border border-theme-border'}"
          >
            {entity.guestChatConfig?.isEnabled ? "Enabled" : "Disabled"}
          </span>
        {/if}
      </div>

      {#if isEditing}
        <div class="space-y-4 text-sm">
          <!-- Toggle Availability -->
          <label class="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={!!editGuestChatConfig?.isEnabled}
              onchange={(e) => {
                if (editGuestChatConfig) {
                  editGuestChatConfig.isEnabled = e.currentTarget.checked;
                  editGuestChatConfig = { ...editGuestChatConfig };
                  if (editGuestChatConfig.isEnabled && !hasPersonalitySection) {
                    void generatePersonality();
                  }
                }
              }}
              class="w-4 h-4 accent-theme-primary rounded border-theme-border bg-theme-bg"
            />
            <span class="font-bold text-theme-text"
              >Enable Guest Character Chat</span
            >
          </label>

          {#if editGuestChatConfig?.isEnabled}
            <div
              class="pl-7 space-y-4 border-l-2 border-theme-border/50 transition-all"
            >
              <!-- Context Scope Option -->
              <div class="space-y-1">
                <span
                  class="block text-xs font-bold uppercase tracking-wider text-theme-muted"
                  >Context & Knowledge Scope</span
                >
                <div class="flex gap-4">
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="contextScope"
                      value="public"
                      checked={editGuestChatConfig?.contextScope === "public"}
                      onchange={() => {
                        if (editGuestChatConfig) {
                          editGuestChatConfig.contextScope = "public";
                          editGuestChatConfig = { ...editGuestChatConfig };
                        }
                      }}
                      class="accent-theme-primary"
                    />
                    <span>Public Lore Only</span>
                  </label>
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="contextScope"
                      value="hybrid"
                      checked={editGuestChatConfig?.contextScope === "hybrid"}
                      onchange={() => {
                        if (editGuestChatConfig) {
                          editGuestChatConfig.contextScope = "hybrid";
                          editGuestChatConfig = { ...editGuestChatConfig };
                        }
                      }}
                      class="accent-theme-primary"
                    />
                    <span>Public + Private Context</span>
                  </label>
                </div>
                <p class="text-xs text-theme-muted mt-1 leading-normal">
                  {editGuestChatConfig?.contextScope === "public"
                    ? "Guests can only query this character using their public description and tags/labels."
                    : "Allows the AI to guide hints/responses using hidden GM notes, but strictly prohibits repeating them directly."}
                </p>
              </div>

              <!-- Personality & Voice section status -->
              <div class="flex items-center justify-between text-xs">
                <span
                  class="font-bold uppercase tracking-wider text-theme-muted"
                  >Personality & Voice</span
                >
                {#if hasPersonalitySection}
                  <span
                    class="flex items-center gap-1 text-emerald-500 font-semibold"
                  >
                    <span class="icon-[lucide--check-circle] w-3.5 h-3.5"
                    ></span>
                    Found in character lore
                  </span>
                {:else}
                  <div class="flex items-center gap-2">
                    <span
                      class="flex items-center gap-1 text-amber-500 font-semibold"
                    >
                      <span class="icon-[lucide--alert-triangle] w-3.5 h-3.5"
                      ></span>
                      Missing from lore
                    </span>
                    <button
                      type="button"
                      onclick={generatePersonality}
                      disabled={isGeneratingPersonality}
                      class="text-[10px] font-bold text-theme-primary hover:text-theme-secondary flex items-center gap-1 transition disabled:opacity-50 cursor-pointer"
                    >
                      <span
                        class={isGeneratingPersonality
                          ? "icon-[lucide--loader-2] animate-spin w-3 h-3"
                          : "icon-[lucide--sparkles] w-3 h-3"}
                      ></span>
                      {isGeneratingPersonality ? "Generating..." : "Generate"}
                    </button>
                  </div>
                {/if}
              </div>
              {#if personalityError}
                <p
                  class="text-[10px] text-theme-danger flex items-center gap-1 font-semibold"
                >
                  <span class="icon-[lucide--circle-alert] w-3.5 h-3.5"></span>
                  {personalityError}
                </p>
              {/if}

              <!-- Additional Settings -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <label
                  class="flex items-center gap-2 cursor-pointer select-none"
                >
                  <input
                    type="checkbox"
                    checked={!!editGuestChatConfig?.isHostReviewable}
                    onchange={(e) => {
                      if (editGuestChatConfig) {
                        editGuestChatConfig.isHostReviewable =
                          e.currentTarget.checked;
                        editGuestChatConfig = { ...editGuestChatConfig };
                      }
                    }}
                    class="w-3.5 h-3.5 accent-theme-primary rounded border-theme-border bg-theme-bg"
                  />
                  <span class="text-xs text-theme-text"
                    >Host can review logs (P2P Sync)</span
                  >
                </label>

                <label
                  class="flex items-center gap-2 cursor-pointer select-none"
                >
                  <input
                    type="checkbox"
                    checked={!!editGuestChatConfig?.keepMemory}
                    onchange={(e) => {
                      if (editGuestChatConfig) {
                        editGuestChatConfig.keepMemory =
                          e.currentTarget.checked;
                        editGuestChatConfig = { ...editGuestChatConfig };
                      }
                    }}
                    class="w-3.5 h-3.5 accent-theme-primary rounded border-theme-border bg-theme-bg"
                  />
                  <span class="text-xs text-theme-text"
                    >Retain memory between guest visits</span
                  >
                </label>
              </div>
            </div>
          {/if}
        </div>
      {:else if entity.guestChatConfig?.isEnabled}
        <!-- Read-only Info for Host -->
        <div class="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span class="text-theme-muted block">Context Scope:</span>
            <span class="font-bold text-theme-text capitalize"
              >{entity.guestChatConfig.contextScope} Lore</span
            >
          </div>
          <div>
            <span class="text-theme-muted block">Synced Review:</span>
            <span class="font-bold text-theme-text"
              >{entity.guestChatConfig.isHostReviewable
                ? "Active"
                : "Disabled"}</span
            >
          </div>
        </div>
      {:else}
        <p class="text-xs text-theme-muted italic">
          Guest Character Chat is disabled. Click the "EDIT" button at the top
          of this panel to enable it and let invited players chat with this
          character.
        </p>
      {/if}
    </div>
  {/if}

  <DetailProposals {isEditing} />
</div>

<style>
  .prose-content :global(.markdown-editor) {
    background: transparent;
    border: none;
  }

  .relation-arrow {
    color: var(--theme-icon-active);
    width: 1.1rem;
    height: 1.1rem;
    display: inline-block;
    vertical-align: middle;
    margin: 0 0.4rem;
    flex-shrink: 0;
  }
</style>
