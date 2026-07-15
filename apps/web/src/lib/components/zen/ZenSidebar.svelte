<script lang="ts">
  import { vault } from "$lib/stores/vault.svelte";
  import { oracle } from "$lib/stores/oracle.svelte";
  import { guestChatStore } from "$lib/stores/guest-chat.svelte";
  import LabelBadge from "$lib/components/labels/LabelBadge.svelte";
  import LabelInput from "$lib/components/labels/LabelInput.svelte";
  import AliasInput from "$lib/components/labels/AliasInput.svelte";
  import ConnectionEditor from "$lib/components/connections/ConnectionEditor.svelte";
  import ConnectionCreator from "$lib/components/connections/ConnectionCreator.svelte";
  import { revisionService } from "$lib/services/RevisionService.svelte";
  import { isEntityVisible, resolveArtDirection, type Entity } from "schema";
  import { themeStore } from "$lib/stores/theme.svelte";
  import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
  import { discoveryPolicyStore } from "$lib/stores/ui/discovery-policy.svelte";
  import { notificationStore } from "$lib/stores/ui/notification.svelte";

  import { debugStore } from "$lib/stores/debug.svelte";

  let editingConnectionTarget = $state<string | null>(null);
  let isAddingConnection = $state(false);
  let prefillConnectionTargetId = $state<string | null>(null);
  let prefillConnectionTargetName = $state("");

  let {
    entity,
    editState = $bindable(),
    resolvedImageUrl,
    onShowLightbox,
    onNavigate,
    onDelete,
    isPopout = false,
  } = $props<{
    entity: Entity | null;
    editState: any;
    resolvedImageUrl: string;
    onShowLightbox: (
      rect?: { x: number; y: number; width: number; height: number } | null,
    ) => void;
    onNavigate: (id: string) => void;
    onDelete: () => Promise<void>;
    isPopout?: boolean;
  }>();

  let isImageLoaded = $state(false);
  let isDraggingOver = $state(false);

  const handleDragOver = (e: DragEvent) => {
    if (vault.isGuest) return;
    e.preventDefault();
    if (
      e.dataTransfer?.types.includes("application/codex-image-id") ||
      e.dataTransfer?.types.includes("Files")
    ) {
      isDraggingOver = true;
      e.dataTransfer.dropEffect = "copy";
    }
  };

  const handleDragLeave = () => {
    if (vault.isGuest) return;
    isDraggingOver = false;
  };

  const handleDrop = async (e: DragEvent) => {
    if (vault.isGuest) return;
    e.preventDefault();
    isDraggingOver = false;

    if (!entity) return;

    const customId = e.dataTransfer?.getData("application/codex-image-id");
    const message = customId
      ? oracle.messages.find((m) => m.id === customId)
      : null;

    if (message?.imageBlob) {
      try {
        const { image, thumbnail } = await vault.saveImageToVault(
          message.imageBlob,
          entity.id,
        );
        await vault.updateEntity(entity.id, { image, thumbnail });
      } catch (err) {
        debugStore.error("[ZenSidebar] Failed to save Oracle image:", err);
        notificationStore.notify(
          "Failed to archive image from Oracle. Check the console for details.",
          "error",
        );
      }
      return;
    }

    // Fallback to standard file drop
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      await handleFileDrop(e.dataTransfer.files[0]);
    }
  };

  async function handleFileDrop(file: File) {
    if (!entity || !file) return;
    if (file.type.startsWith("image/")) {
      try {
        const { image, thumbnail } = await vault.saveImageToVault(
          file,
          entity.id,
        );
        await vault.updateEntity(entity.id, { image, thumbnail });
      } catch (err) {
        debugStore.error("[ZenSidebar] Failed to save external file:", err);
        notificationStore.notify(
          "Failed to save image. Check the console for details.",
          "error",
        );
      }
    }
  }

  const artDirectionPrompt = $derived.by(() => {
    if (!entity) return "";
    const res = resolveArtDirection({
      surface: "entity",
      subject: entity.title,
      categoryId: entity.type,
      themeId: themeStore.activeTheme?.id || "default",
      entityArtDirection: entity.artDirection,
    });
    return res.prompt;
  });

  $effect(() => {
    // Reset loaded state when image URL changes
    if (resolvedImageUrl) {
      isImageLoaded = false;
    }
  });

  interface ConnectionListItem {
    id: string;
    key: string;
    displayLabel: string;
    rawLabel?: string;
    title: string;
    type: string;
    isOutbound: boolean;
    isChild?: boolean;
    isParent?: boolean;
    strength?: number;
  }

  let allConnections = $derived.by(() => {
    if (!entity) return [] as ConnectionListItem[];

    const checkVisibility = (targetId: string) => {
      const targetEntity = vault.entities[targetId];
      if (!targetEntity) return false;
      if (!vault.isGuest) return true;
      return isEntityVisible(targetEntity, {
        sharedMode: vault.isGuest,
        defaultVisibility: vault.defaultVisibility,
      });
    };

    const result: ConnectionListItem[] = [];
    const connections = entity?.connections || [];
    const connectionsLength = connections.length;
    for (let i = 0; i < connectionsLength; i++) {
      const c = connections[i];
      if (checkVisibility(c.target)) {
        result.push({
          id: c.target,
          key: `${c.target}-out-${c.type}-${i}`,
          displayLabel: c.label || c.type,
          rawLabel: c.label,
          title: vault.entities[c.target]?.title || c.target,
          type: c.type,
          isOutbound: true,
          strength: c.strength,
        });
      }
    }

    const inboundConnections = vault.inboundConnections[entity?.id || ""] || [];
    const inboundLength = inboundConnections.length;
    for (let i = 0; i < inboundLength; i++) {
      const item = inboundConnections[i];
      if (checkVisibility(item.sourceId)) {
        result.push({
          id: item.sourceId,
          key: `${item.sourceId}-in-${item.connection.type}-${i}`,
          displayLabel: item.connection.label || item.connection.type,
          rawLabel: item.connection.label,
          title: vault.entities[item.sourceId]?.title || item.sourceId,
          type: item.connection.type,
          isOutbound: false,
          strength: item.connection.strength,
        });
      }
    }

    // Add children if exist
    const entityId = entity?.id || "";
    // ⚡ Bolt Optimization: Use vault.allEntities instead of allocating Object.values()
    const allEntities = vault.allEntities || [];
    const children = allEntities.filter(
      (e) => e.parent && e.parent.toLowerCase() === entityId.toLowerCase(),
    );
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (checkVisibility(child.id)) {
        const alreadyConnected = result.some((c) => c.id === child.id);
        if (!alreadyConnected) {
          result.push({
            id: child.id,
            key: `${child.id}-child-${i}`,
            displayLabel: "Child",
            rawLabel: "Child",
            title: child.title,
            type: "child",
            isOutbound: false,
            isChild: true,
          });
        }
      }
    }

    return result;
  });

  // Check if this entity is visible in guest/shared mode
  const isVisible = $derived.by(() => {
    if (!entity) return false;
    if (!vault.isGuest) return true;
    return isEntityVisible(entity, {
      sharedMode: vault.isGuest,
      defaultVisibility: vault.defaultVisibility,
    });
  });

  const isVisualizing = $derived(oracle.isVisualizingEntity(entity?.id));
</script>

<div
  style="background-image: var(--bg-texture-overlay)"
  class="w-full md:w-80 lg:w-96 md:border-r border-theme-border p-4 md:p-5 md:overflow-y-auto custom-scrollbar bg-theme-surface shrink-0"
  data-testid="zen-sidebar"
>
  <!-- Guest Character Chat -->
  {#if vault.isGuest && entity?.type === "character" && entity?.guestChatConfig?.isEnabled && entity.guestChatConfig.extraInstructions?.trim()}
    <div class="mb-6">
      <button
        type="button"
        onclick={() => guestChatStore.openChat(entity.id, entity.title)}
        class="w-full text-center py-2.5 bg-theme-primary text-theme-bg font-bold tracking-widest uppercase text-xs rounded-xl hover:bg-theme-secondary transition flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(var(--color-theme-primary-rgb),0.15)] cursor-pointer"
        data-testid="zen-sidebar-guest-chat-button"
      >
        <span class="icon-[lucide--messages-square] w-4 h-4"></span>
        Chat with {entity.title}
      </button>
    </div>
  {/if}

  <!-- Labels & Aliases -->
  <div class="mb-4 space-y-4">
    {#if !editState.isEditing}
      <div class="space-y-2">
        {#if entity?.labels?.length || !vault.isGuest}
          <div class="space-y-1">
            {#if entity?.labels?.length}
              <div class="flex flex-wrap gap-1.5">
                {#each entity.labels as label}
                  <LabelBadge
                    {label}
                    removable={!vault.isGuest}
                    onRemove={() => {
                      if (entity) {
                        vault.removeLabel(entity.id, label).catch((err) => {
                          console.error(
                            `[ZenSidebar] Failed to remove label: ${err}`,
                          );
                        });
                      }
                    }}
                  />
                {/each}
              </div>
            {/if}
            {#if !vault.isGuest}
              <LabelInput
                entityId={entity?.id || ""}
                ariaLabel="Quick add label"
              />
            {/if}
          </div>
        {/if}

        {#if entity?.aliases?.length}
          <div class="flex flex-wrap gap-1.5">
            {#each entity.aliases as alias}
              <div
                class="px-2 py-0.5 rounded bg-theme-primary/5 border border-theme-primary/10 text-[10px] font-bold text-theme-secondary uppercase tracking-wider"
              >
                {alias}
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {:else if !vault.isGuest}
      <div class="space-y-4">
        <div class="space-y-1">
          <label
            class="block text-[10px] tracking-widest uppercase font-header text-theme-secondary font-bold"
            for="zen-labels">Labels</label
          >
          <LabelInput entityId={entity?.id || ""} ariaLabel="Labels" />
        </div>

        <div class="space-y-1">
          <label
            class="block text-[10px] tracking-widest uppercase font-header text-theme-secondary font-bold"
            for="zen-aliases">Aliases</label
          >
          <AliasInput bind:aliases={editState.aliases} />
        </div>
      </div>
    {/if}
  </div>

  <!-- Image -->
  <div
    class="relative mb-4 {isDraggingOver
      ? 'ring-2 ring-oracle-primary ring-offset-4 ring-offset-black bg-oracle-primary/10'
      : ''} transition-all rounded-lg"
    ondragover={handleDragOver}
    ondragleave={handleDragLeave}
    ondrop={handleDrop}
    role="region"
    aria-label="Image drop zone"
  >
    {#if !isVisible && vault.isGuest}
      <div
        class="w-full py-2 md:py-4 md:aspect-square rounded-lg border border-dashed border-theme-border flex flex-col items-center justify-center gap-2 md:gap-4 text-theme-muted bg-theme-primary/5 relative overflow-hidden"
      >
        <span class="icon-[lucide--lock] w-6 h-6 md:w-8 md:h-8 opacity-30"
        ></span>
        <span
          class="text-xs font-bold uppercase font-header tracking-widest opacity-40"
          >Hidden</span
        >
      </div>
    {:else if editState.isEditing}
      <div class="mb-4">
        <label
          class="block text-xs tracking-widest uppercase font-header text-theme-secondary font-bold mb-1"
          for="zen-entity-image-url">IMAGE URL</label
        >
        <input
          id="zen-entity-image-url"
          type="text"
          bind:value={editState.image}
          class="bg-theme-bg border border-theme-border text-theme-text px-2 py-1.5 text-xs focus:outline-none focus:border-theme-primary w-full placeholder-theme-muted rounded"
          placeholder="https://..."
        />
      </div>
    {:else if entity?.image}
      <button
        type="button"
        disabled={!resolvedImageUrl}
        onclick={(e) => {
          if (!resolvedImageUrl) return;
          const rect = e.currentTarget.getBoundingClientRect();
          onShowLightbox({
            x: rect.left,
            y: rect.top,
            width: rect.width,
            height: rect.height,
          });
        }}
        class="w-full aspect-square rounded-lg border border-theme-border overflow-hidden relative group cursor-pointer hover:border-theme-primary transition block shadow-lg bg-theme-bg/50 focus-visible:ring-2 focus-visible:ring-theme-primary focus-visible:outline-none disabled:cursor-wait"
        aria-label="View full size image"
      >
        {#if !isImageLoaded}
          <div
            class="absolute inset-0 flex flex-col items-center justify-center bg-theme-bg/40 animate-pulse text-theme-muted gap-2"
          >
            <span class="icon-[lucide--image] w-8 h-8 opacity-30"></span>
            <span
              class="text-[10px] font-mono uppercase tracking-wider opacity-40"
              >Resolving Neural Visual...</span
            >
          </div>
        {/if}
        <img
          src={resolvedImageUrl}
          alt={entity.title}
          loading="lazy"
          decoding="async"
          onload={() => {
            isImageLoaded = true;
          }}
          onerror={() => {
            isImageLoaded = true;
          }}
          class="w-full h-full object-contain transition-all duration-300 mx-auto {isImageLoaded
            ? 'opacity-90 group-hover:opacity-100 scale-100'
            : 'opacity-0 scale-95'}"
        />
        <div
          class="absolute bottom-2 right-2 bg-theme-bg/70 text-theme-primary text-xs font-header tracking-widest uppercase px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition"
        >
          Zoom
        </div>
      </button>
    {:else}
      {#if !discoveryPolicyStore.aiDisabled && !vault.isGuest}
        <div
          class="w-full py-2 md:py-4 md:aspect-square rounded-lg border border-dashed border-theme-border flex flex-col items-center justify-center gap-2 md:gap-4 text-theme-muted bg-theme-primary/5 relative overflow-hidden"
        >
          <div class="flex flex-col items-center justify-center gap-1 md:gap-2">
            <span
              class="icon-[lucide--image] w-6 h-6 md:w-12 md:h-12 opacity-30 md:opacity-50"
            ></span>
            <span
              class="text-xs font-bold uppercase font-header tracking-widest opacity-40"
              >No Image</span
            >
          </div>

          {#if isVisualizing || revisionService.isRevising}
            <div
              class="absolute inset-0 bg-theme-bg/75 backdrop-blur-[2px] flex flex-col items-center justify-center gap-3 border border-theme-primary/20"
            >
              <span
                class="icon-[lucide--loader-2] w-6 h-6 animate-spin text-theme-primary"
                aria-hidden="true"
              ></span>
              <div
                class="text-[9px] md:text-[10px] font-bold uppercase tracking-[0.2em] font-header text-theme-primary text-center px-6"
                aria-live="polite"
              >
                {#if isVisualizing}
                  {#if oracle.activeStyleTitle}
                    Visualizing in {oracle.activeStyleTitle}
                  {:else}
                    Building Visual
                  {/if}
                {:else}
                  Expanding Lore
                {/if}
              </div>
            </div>
          {/if}
        </div>
      {:else}
        <button
          type="button"
          onclick={async () => {
            await navigator.clipboard.writeText(artDirectionPrompt);
            notificationStore.notify(
              "Copied image prompt to clipboard",
              "success",
            );
          }}
          class="w-full aspect-square rounded-lg border border-theme-border overflow-hidden relative flex flex-col shadow-inner bg-theme-bg/30 group text-left cursor-pointer hover:border-theme-primary transition focus:outline-none focus:border-theme-primary"
        >
          <div
            class="absolute top-2 left-2 flex items-center gap-2 opacity-30 text-theme-muted select-none pointer-events-none transition-opacity group-hover:opacity-100"
          >
            <span class="icon-[lucide--pen-tool] w-4 h-4"></span>
            <span
              class="text-[8px] font-header uppercase tracking-widest font-bold"
              >Image Prompt</span
            >
          </div>
          <div
            class="absolute top-2 right-2 flex items-center gap-1 opacity-0 text-theme-primary select-none pointer-events-none transition-opacity group-hover:opacity-100 group-focus:opacity-100"
          >
            <span class="icon-[lucide--copy] w-3 h-3"></span>
            <span
              class="text-[8px] font-header uppercase tracking-widest font-bold"
              >Click to Copy</span
            >
          </div>
          <div
            class="flex-1 overflow-y-auto custom-scrollbar p-6 pt-8 flex items-center justify-center h-full w-full"
          >
            <p
              class="text-xs md:text-sm text-theme-muted/80 italic font-serif text-center leading-relaxed"
            >
              {artDirectionPrompt}
            </p>
          </div>
        </button>
      {/if}
    {/if}

    {#if !discoveryPolicyStore.aiDisabled && entity && !editState.isEditing && !vault.isGuest}
      <div class="flex flex-row md:flex-col gap-2 mt-2 md:mt-4 w-full px-0">
        <button
          onclick={() => oracle.drawEntity(entity.id)}
          disabled={isVisualizing}
          class="bg-theme-surface/50 hover:bg-theme-surface border border-theme-primary/30 hover:border-theme-primary transition-all flex items-center justify-center gap-2 px-2 py-1 md:px-4 md:py-2 rounded shadow-sm group/btn relative overflow-hidden"
          aria-label={oracle.apiKey
            ? `Draw visualization for ${entity.title}`
            : `Generate image prompt for ${entity.title}`}
          aria-busy={isVisualizing}
        >
          {#if isVisualizing}
            <span
              class="icon-[lucide--loader-2] w-3 h-3 md:w-5 md:h-5 animate-spin text-theme-primary"
              aria-hidden="true"
            ></span>
            <span
              class="text-[10px] md:text-xs font-bold tracking-widest text-theme-primary text-center font-header uppercase"
              aria-live="polite"
            >
              {#if oracle.activeStyleTitle}
                STYLE: {oracle.activeStyleTitle.toUpperCase()}
              {:else}
                {oracle.apiKey ? "VISUALIZING..." : "GENERATING..."}
              {/if}
            </span>
          {:else}
            <div
              class="absolute inset-0 bg-theme-primary/10 opacity-0 group-hover/btn:opacity-100 transition-opacity"
            ></div>
            <span
              class="icon-[lucide--palette] w-3 h-3 md:w-4 md:h-4 text-theme-primary"
              aria-hidden="true"
            ></span>
            <span
              class="text-[10px] md:text-xs font-bold tracking-widest font-header text-theme-primary relative z-10 uppercase"
              >{oracle.apiKey ? "DRAW VISUAL" : "GENERATE PROMPT"}</span
            >
          {/if}
        </button>

        <button
          type="button"
          onclick={() => modalUIStore.openRevisionDialog(entity.id)}
          class="bg-theme-surface/50 hover:bg-theme-surface border border-theme-primary/30 hover:border-theme-primary transition-all flex items-center justify-center gap-2 px-2 py-1 md:px-4 md:py-2 rounded shadow-sm group/btn relative overflow-hidden"
          aria-label="Revise Chronicle and Lore"
          title="Revise Chronicle and Lore"
        >
          <span
            class="icon-[lucide--sparkles] w-3 h-3 md:w-4 md:h-4 text-theme-primary"
            aria-hidden="true"
          ></span>
          <span
            class="text-[10px] md:text-xs font-bold tracking-widest font-header text-theme-primary relative z-10 uppercase pointer-events-none"
            >REGENERATE</span
          >
        </button>
      </div>
    {/if}
  </div>

  <!-- Sidebar Content -->
  <div class="block space-y-4" data-testid="zen-sidebar-content">
    {#if !(isPopout && vault.isGuest)}
      <div
        class="hidden md:block space-y-4 pt-6 border-t border-theme-border md:border-t-0 md:pt-0"
      >
        <div
          class="flex items-center justify-between border-b border-theme-border pb-2"
        >
          <h3
            class="text-xs font-bold text-theme-secondary uppercase font-header tracking-widest"
          >
            Connections
          </h3>
          {#if !vault.isGuest && !isAddingConnection}
            <button
              type="button"
              onclick={() => (isAddingConnection = true)}
              class="text-[10px] font-bold text-theme-primary hover:text-theme-secondary flex items-center gap-1 transition"
              aria-label="Add new connection"
            >
              <span class="icon-[lucide--plus] w-3.5 h-3.5"></span>
              ADD
            </button>
          {/if}
        </div>

        {#if isAddingConnection}
          <ConnectionCreator
            entityId={entity.id}
            initialTargetId={prefillConnectionTargetId}
            initialTargetName={prefillConnectionTargetName}
            onCancel={() => {
              isAddingConnection = false;
              prefillConnectionTargetId = null;
              prefillConnectionTargetName = "";
            }}
            onConnectionAdded={() => {
              isAddingConnection = false;
              prefillConnectionTargetId = null;
              prefillConnectionTargetName = "";
            }}
          />
        {/if}

        {#if allConnections.length > 0}
          <div class="space-y-2">
            {#each allConnections as conn (conn.key)}
              {#if editingConnectionTarget === conn.id && conn.isOutbound && !conn.isChild}
                <div class="p-1">
                  <ConnectionEditor
                    sourceId={entity?.id || ""}
                    connection={{
                      target: conn.id,
                      type: conn.type,
                      strength: conn.strength ?? 1,
                      label: conn.rawLabel || "",
                    }}
                    onSave={() => (editingConnectionTarget = null)}
                    onCancel={() => (editingConnectionTarget = null)}
                  />
                </div>
              {:else}
                <div
                  class="[content-visibility:auto] [contain-intrinsic-size:0_44px] w-full flex items-center gap-3 p-2 rounded border border-transparent hover:border-theme-border hover:bg-theme-primary/10 transition text-left group"
                >
                  <button
                    type="button"
                    onclick={() => onNavigate(conn.id)}
                    class="flex-1 min-w-0 flex items-center gap-3 text-left"
                  >
                    <span
                      class="w-1.5 h-1.5 rounded-full shrink-0 {conn.isChild
                        ? 'bg-emerald-500'
                        : conn.isOutbound
                          ? 'bg-theme-primary'
                          : 'bg-blue-500'}"
                    ></span>
                    <div class="flex-1 min-w-0">
                      <div
                        class="text-xs text-theme-muted uppercase tracking-widest font-header"
                      >
                        {conn.displayLabel}
                      </div>
                      <div
                        class="text-sm font-bold text-theme-text group-hover:text-theme-primary truncate transition font-body"
                      >
                        {conn.title}
                      </div>
                    </div>
                  </button>

                  {#if !vault.isGuest}
                    <div class="flex items-center gap-1">
                      {#if conn.isOutbound && !conn.isChild}
                        <button
                          type="button"
                          onclick={() => (editingConnectionTarget = conn.id)}
                          class="text-theme-muted hover:text-theme-primary transition p-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 shrink-0"
                          aria-label="Edit connection"
                          title="Edit connection"
                        >
                          <span
                            class="icon-[lucide--pencil] w-3.5 h-3.5"
                            aria-hidden="true"
                          ></span>
                        </button>
                      {/if}
                      {#if conn.isChild}
                        <button
                          type="button"
                          onclick={() => {
                            prefillConnectionTargetId = conn.id;
                            prefillConnectionTargetName = conn.title;
                            isAddingConnection = true;
                          }}
                          class="text-theme-muted hover:text-theme-primary transition p-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 shrink-0"
                          aria-label="Establish custom connection"
                          title="Establish custom connection"
                        >
                          <span
                            class="icon-[lucide--plus] w-3.5 h-3.5"
                            aria-hidden="true"
                          ></span>
                        </button>
                      {/if}
                      <button
                        type="button"
                        onclick={() => {
                          const entityId = entity?.id;
                          if (!entityId) return;
                          if (conn.isChild) {
                            vault.updateEntity(conn.id, { parent: undefined });
                          } else if (conn.isOutbound) {
                            vault.removeConnection(
                              entityId,
                              conn.id,
                              conn.type,
                            );
                          } else {
                            vault.removeConnection(
                              conn.id,
                              entityId,
                              conn.type,
                            );
                          }
                        }}
                        class="text-theme-muted hover:text-theme-danger transition p-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 shrink-0"
                        aria-label="Delete connection"
                        title="Delete connection"
                      >
                        <span
                          class="icon-[lucide--trash-2] w-3.5 h-3.5"
                          aria-hidden="true"
                        ></span>
                      </button>
                    </div>
                  {/if}

                  <button
                    type="button"
                    onclick={() => onNavigate(conn.id)}
                    class="icon-[lucide--chevron-right] w-4 h-4 text-theme-muted group-hover:text-theme-primary group-focus-within:text-theme-primary focus-visible:text-theme-primary opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 transition shrink-0"
                    aria-label="Navigate to {conn.title}"
                  ></button>
                </div>
              {/if}
            {/each}
          </div>
        {:else}
          <p class="text-xs text-theme-muted italic">No known connections.</p>
        {/if}
      </div>
    {/if}

    {#if editState.isEditing && !vault.isGuest}
      <div class="mt-6 pt-6 border-t border-theme-border">
        <button
          type="button"
          onclick={onDelete}
          class="w-full border border-red-900/30 text-red-800 hover:text-red-500 hover:border-red-600 hover:bg-red-950/30 text-xs font-bold px-4 py-2 rounded tracking-widest transition flex items-center justify-center gap-2"
        >
          <span class="icon-[lucide--trash-2] w-3 h-3"></span>
          DELETE ENTITY
        </button>
      </div>
    {/if}
  </div>
</div>
