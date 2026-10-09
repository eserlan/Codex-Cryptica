<script lang="ts">
  import { Handle, Position, type NodeProps } from "@xyflow/svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { categories } from "$lib/stores/categories.svelte";
  import { getIconClass } from "$lib/utils/icon";
  import { renderMarkdown } from "$lib/utils/markdown";
  import CharacterCardBody from "./cards/CharacterCardBody.svelte";
  import FactionCardBody from "./cards/FactionCardBody.svelte";
  import FactionImageOnlyBody from "./cards/FactionImageOnlyBody.svelte";
  import FactionRosterCardBody from "./cards/FactionRosterCardBody.svelte";
  import LocationCardBody from "./cards/LocationCardBody.svelte";
  import {
    extractEntitySubtitle,
    extractQuote,
    formatCoordinates,
    getEntityPrimaryStance,
    getFactionRelations,
    getGroupedRelations,
    normalizeEntityCardViewPreference,
    resolveEntityCardVariant,
  } from "./cards/entity-card-variant";

  import {
    DEFAULT_CANVAS_TEXT_BACKGROUND,
    normalizeCanvasTextBackground,
  } from "@codex/canvas-engine";
  import { canvasTextBackgroundStyle } from "./canvas-workspace-helpers";
  import { connectionModeStore } from "$lib/stores/ui/connection-mode.svelte";
  import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";

  let { data, selected }: NodeProps = $props();

  const entityId = $derived(data?.entityId as string | undefined);
  const entity = $derived(entityId ? vault.entities[entityId] : undefined);
  const category = $derived(
    entity?.type ? categories.getCategory(entity.type) : undefined,
  );
  let imageUrl = $state<string | null>(null);

  // Access global state to detect if we are currently connecting anywhere on the canvas
  const isConnecting = $derived(connectionModeStore.isConnecting);

  $effect(() => {
    if (entity?.image) {
      vault.resolveImageUrl(entity.image).then((url) => {
        imageUrl = url;
      });
    } else {
      imageUrl = null;
    }
  });

  let isEditing = $state(false);
  let editContent = $state("");
  let isSaving = $state(false);

  // ⚡ Bolt Optimization: Memoize expensive markdown parsing.
  // Previously, `{@html renderMarkdown(entity.content)}` evaluated inline on every
  // reactive update (like hover state or connection dragging), blocking the main thread.
  const renderedContent = $derived.by(() => {
    try {
      return entity?.content ? renderMarkdown(entity.content) : "";
    } catch {
      return "";
    }
  });

  // Card variant is resolved at render time from the linked entity's type.
  // A per-node `cardView` override (set via the canvas context menu) wins
  // over the automatic mapping. The persisted canvas node stays
  // `type: "entity"`, so no migration.
  const variant = $derived(
    resolveEntityCardVariant(
      entity?.type,
      normalizeEntityCardViewPreference(
        (data as { cardView?: unknown } | undefined)?.cardView,
      ),
    ),
  );
  // Large is an explicit per-node opt-in (canvas context menu). Only the
  // special cards grow a grouped-links section; normal size stays quiet.
  const largeCard = $derived(
    (data as { largeCard?: unknown } | undefined)?.largeCard === true ||
      variant === "roster",
  );
  const linkGroups = $derived(
    largeCard && variant !== "default" && variant !== "faction"
      ? getGroupedRelations(entity?.connections, (id) => {
          const related = vault.entities[id];
          return related
            ? { title: related.title, type: related.type }
            : undefined;
        })
      : [],
  );
  const isFaction = $derived(
    (entity?.type ?? "").toLowerCase() === "faction" ||
      variant === "faction" ||
      variant === "roster",
  );
  const factionData = $derived.by(() => {
    if (!isFaction || !entity) {
      return {
        groups: [],
        members: [],
        memberCount: 0,
        leaders: [],
        allRosterMembers: [],
      };
    }
    return getFactionRelations(entity, vault.entities);
  });
  const isFactionImageOnly = $derived(
    variant === "image_only" && isFaction && factionData.memberCount > 0,
  );
  const coordinatesText = $derived(formatCoordinates(entity?.metadata));
  const connectionCount = $derived(entity?.connections?.length ?? 0);
  const quote = $derived(extractQuote(entity?.content, entity?.metadata));
  const subtitle = $derived(extractEntitySubtitle(entity));
  const primaryStance = $derived(getEntityPrimaryStance(entity));
  const backgroundKey = $derived(
    normalizeCanvasTextBackground(
      ((data as { background?: unknown } | undefined)?.background as string) ??
        "",
      DEFAULT_CANVAS_TEXT_BACKGROUND,
    ),
  );
  const backgroundColor = $derived(canvasTextBackgroundStyle(backgroundKey));
  const isTransparent = $derived(backgroundKey === "transparent");
  const showImageLabels = $derived(
    Boolean(
      (data as { showImageLabels?: boolean } | undefined)?.showImageLabels,
    ),
  );

  function startEdit(e: MouseEvent) {
    e.stopPropagation();
    editContent = entity?.content || "";
    isEditing = true;
  }

  function autoresize(node: HTMLTextAreaElement) {
    const resize = () => {
      node.style.height = "auto";
      node.style.height = node.scrollHeight + "px";
    };
    node.addEventListener("input", resize);
    const frame = requestAnimationFrame(resize);
    return {
      destroy: () => {
        node.removeEventListener("input", resize);
        cancelAnimationFrame(frame);
      },
    };
  }

  function cancelEdit(e: MouseEvent) {
    e.stopPropagation();
    isEditing = false;
  }

  async function saveEdit(e: MouseEvent) {
    e.stopPropagation();
    if (!entity) return;
    isSaving = true;
    try {
      await vault.updateEntity(entity.id, { content: editContent });
      isEditing = false;
    } catch (err) {
      console.error("Failed to inline save", err);
    } finally {
      isSaving = false;
    }
  }

  function toggleImageOnly(e: MouseEvent) {
    e.stopPropagation();
    const currentView = normalizeEntityCardViewPreference(
      (data as { cardView?: unknown } | undefined)?.cardView,
    );
    const newView = currentView === "image_only" ? "auto" : "image_only";
    (
      data as {
        onUpdateEntityNode?: (updates: Record<string, unknown>) => void;
      }
    )?.onUpdateEntityNode?.({ cardView: newView });
  }

  function toggleRosterView(e: MouseEvent) {
    e.stopPropagation();
    const currentView = normalizeEntityCardViewPreference(
      (data as { cardView?: unknown } | undefined)?.cardView,
    );
    const newView = currentView === "roster" ? "faction" : "roster";
    (
      data as {
        onUpdateEntityNode?: (updates: Record<string, unknown>) => void;
      }
    )?.onUpdateEntityNode?.({ cardView: newView });
  }

  const isCtrlPressed = $derived(connectionModeStore.isModifierPressed);
  let isHovered = $state(false);

  function onDoubleClick() {
    if (entity) {
      modalUIStore.openZenMode(entity.id);
    }
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="border rounded-xl transition-all group select-none flex flex-col focus:outline-none relative
    {isTransparent ? '' : 'shadow-lg'}
    {largeCard || isFactionImageOnly
    ? 'w-[580px] min-w-[500px] max-w-[660px]'
    : variant === 'compact'
      ? 'w-28 min-w-[100px] max-w-[120px]'
      : variant === 'image_only'
        ? 'w-48 min-w-[140px] max-w-[320px]'
        : 'min-w-[200px] max-w-[300px]'}
    {isConnecting &&
  isHovered &&
  connectionModeStore.connectingNodeId !== data?.id
    ? 'border-[3px] border-red-400 ring-4 ring-red-400/50 cursor-crosshair scale-[1.02]'
    : isCtrlPressed && isHovered
      ? 'nodrag border-[3px] border-amber-400 ring-4 ring-amber-400/50 cursor-crosshair'
      : isCtrlPressed
        ? 'nodrag border-theme-border'
        : selected
          ? 'border-2 border-[color:var(--theme-focus-border)] ring-2 ring-[color:var(--theme-focus-border)]/50'
          : variant === 'image_only' && primaryStance.stance === 'ally'
            ? 'border-emerald-400/80 ring-1 ring-emerald-500/30'
            : variant === 'image_only' && primaryStance.stance === 'enemy'
              ? 'border-rose-500/80 ring-1 ring-rose-500/30'
              : variant === 'image_only' && primaryStance.stance === 'friend'
                ? 'border-sky-400/80 ring-1 ring-sky-500/30'
                : variant === 'image_only' && primaryStance.stance === 'faction'
                  ? 'border-amber-400/80 ring-1 ring-amber-500/30'
                  : isTransparent
                    ? 'border-theme-border/40 border-dashed hover:border-theme-primary focus:ring-2 focus:ring-theme-primary'
                    : 'border-theme-border hover:border-theme-primary focus:ring-2 focus:ring-theme-primary'}"
  style:background-color={backgroundColor}
  style:box-shadow={selected
    ? "var(--theme-glow), 0 10px 15px -3px rgb(0 0 0 / 0.1)"
    : undefined}
  style:width={data?.width
    ? `${data.width}px`
    : largeCard || isFactionImageOnly
      ? "580px"
      : variant === "compact"
        ? "112px"
        : variant === "image_only"
          ? "192px"
          : "auto"}
  style:height={data?.height
    ? `${data.height}px`
    : variant === "image_only" && !isFactionImageOnly
      ? "256px"
      : "auto"}
  ondblclick={onDoubleClick}
  onkeydown={(e) => (e.key === "Enter" || e.key === " ") && onDoubleClick()}
  onmouseenter={() => (isHovered = true)}
  onmouseleave={() => (isHovered = false)}
  tabindex="0"
  role="button"
  aria-label={entity?.title || "Missing Entity"}
  title={entity?.title || "Missing Entity"}
>
  <!-- Invisible standard handles -->
  <Handle
    type="target"
    position={Position.Top}
    class="!bg-transparent !border-none target-test-handle"
    style="width: 1px; height: 1px; opacity: 0;"
  />

  <Handle
    type="source"
    position={Position.Top}
    class="full-card-handle !bg-transparent !border-none !rounded-none"
    style="position: absolute; inset: 0; width: 100%; height: 100%; z-index: 100; opacity: 0; transform: none !important; pointer-events: {isCtrlPressed
      ? 'auto'
      : 'none'}; cursor: crosshair;"
  />

  <div class="flex-1 flex flex-col min-h-0 rounded-lg">
    {#if variant === "compact"}
      <div
        class="flex flex-col items-center justify-center p-2 text-center select-none w-full"
        data-testid="compact-entity-node"
      >
        <div
          class="relative w-14 h-14 rounded-xl overflow-hidden border-2 {primaryStance.stance ===
          'ally'
            ? 'border-emerald-400 ring-2 ring-emerald-500/30'
            : primaryStance.stance === 'enemy'
              ? 'border-rose-500 ring-2 ring-rose-500/30'
              : primaryStance.stance === 'friend'
                ? 'border-sky-400 ring-2 ring-sky-500/30'
                : primaryStance.stance === 'faction'
                  ? 'border-amber-400/80 ring-2 ring-amber-500/30'
                  : 'border-theme-border'} bg-theme-bg shadow-md transition-transform duration-300 group-hover:scale-105"
        >
          {#if imageUrl}
            <img
              src={imageUrl}
              alt={entity?.title || "Entity"}
              class="w-full h-full object-cover object-[center_20%]"
            />
          {:else}
            <div
              class="w-full h-full flex items-center justify-center bg-theme-primary/10 text-theme-primary"
            >
              <span
                class="{getIconClass(category?.icon)} w-6 h-6"
                aria-hidden="true"
              ></span>
            </div>
          {/if}
        </div>

        <span
          class="mt-1.5 text-xs font-bold text-theme-text font-header truncate max-w-full leading-tight"
        >
          {entity?.title || "Missing Entity"}
        </span>

        {#if primaryStance.badgeText}
          <span
            class="text-nano font-semibold tracking-wider mt-0.5 truncate max-w-full {primaryStance.stance ===
            'ally'
              ? 'text-emerald-400'
              : primaryStance.stance === 'enemy'
                ? 'text-rose-400'
                : primaryStance.stance === 'friend'
                  ? 'text-sky-400'
                  : primaryStance.stance === 'faction'
                    ? 'text-amber-400'
                    : 'text-theme-muted'}"
          >
            ({primaryStance.badgeText})
          </span>
        {/if}
      </div>
    {:else if variant === "image_only"}
      <div
        class="relative w-full h-full rounded-xl overflow-hidden group/image flex flex-col items-center justify-center bg-theme-bg/40"
        data-testid="image-only-entity-node"
      >
        {#if isFactionImageOnly}
          <FactionImageOnlyBody {entity} {showImageLabels} />
        {:else if imageUrl}
          <img
            src={imageUrl}
            alt={entity?.title || "Entity"}
            class="w-full h-full object-cover object-[center_20%] transition-transform duration-500 group-hover:scale-105"
          />
          <div
            class="absolute inset-x-0 bottom-0 p-2.5 bg-gradient-to-t from-black/85 via-black/40 to-transparent transition-opacity flex items-center justify-between pointer-events-none {showImageLabels
              ? 'opacity-100'
              : 'opacity-0 group-hover:opacity-100'}"
            data-testid="image-only-hover-title"
          >
            <div class="flex items-center gap-1.5 min-w-0">
              <span
                class="{getIconClass(
                  category?.icon,
                )} w-3 h-3 shrink-0 text-white/80"
                aria-hidden="true"
              ></span>
              <span
                class="text-xs font-bold text-white truncate font-header drop-shadow-sm"
              >
                {entity?.title || "Missing Entity"}
              </span>
            </div>
            {#if primaryStance.badgeText}
              <span
                class="text-nano font-semibold tracking-wider drop-shadow-sm {primaryStance.stance ===
                'ally'
                  ? 'text-emerald-400'
                  : primaryStance.stance === 'enemy'
                    ? 'text-rose-400'
                    : primaryStance.stance === 'friend'
                      ? 'text-sky-400'
                      : primaryStance.stance === 'faction'
                        ? 'text-amber-400'
                        : 'text-white/70'}"
              >
                ({primaryStance.badgeText})
              </span>
            {/if}
          </div>
        {:else}
          <div
            class="w-full h-full min-h-[180px] flex flex-col items-center justify-center p-4 text-center bg-theme-bg/60 text-theme-muted"
          >
            <span
              class="{getIconClass(
                category?.icon,
              )} w-8 h-8 text-theme-primary mb-2 opacity-80"
              aria-hidden="true"
            ></span>
            <span
              class="text-xs font-bold text-theme-text font-header truncate max-w-full"
            >
              {entity?.title || "Missing Entity"}
            </span>
            <span class="text-micro text-theme-muted mt-1 opacity-60"
              >No image</span
            >
          </div>
        {/if}
        <!-- Top-right flip button to switch back to card view -->
        <div
          class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity z-10 pointer-events-auto"
        >
          <button
            class="p-1 rounded-md bg-black/60 hover:bg-black/90 text-white/80 hover:text-white backdrop-blur-sm border border-white/20 transition-all shadow-md cursor-pointer"
            onclick={toggleImageOnly}
            title="Show card details"
            aria-label="Show card details"
            type="button"
          >
            <span
              class="icon-[lucide--file-text] w-3.5 h-3.5"
              aria-hidden="true"
            ></span>
          </button>
        </div>
      </div>
    {:else if variant === "roster"}
      <div class="relative w-full">
        <!-- Top-right flip buttons -->
        <div class="absolute top-3.5 right-3.5 z-10 flex items-center gap-1">
          <button
            class="p-1 rounded-md bg-theme-bg/80 hover:bg-theme-bg text-theme-muted hover:text-theme-primary border border-theme-border/60 transition-all shadow-sm cursor-pointer"
            onclick={toggleImageOnly}
            title="Switch to members image gallery"
            aria-label="Switch to members image gallery"
            type="button"
          >
            <span class="icon-[lucide--image] w-3.5 h-3.5" aria-hidden="true"
            ></span>
          </button>
          <button
            class="p-1 rounded-md bg-theme-bg/80 hover:bg-theme-bg text-theme-muted hover:text-theme-primary border border-theme-border/60 transition-all shadow-sm cursor-pointer"
            onclick={toggleRosterView}
            title="Switch to standard faction card"
            aria-label="Switch to standard faction card"
            type="button"
          >
            <span
              class="icon-[lucide--layout-grid] w-3.5 h-3.5"
              aria-hidden="true"
            ></span>
          </button>
        </div>
        <FactionRosterCardBody {entity} />
      </div>
    {:else}
      <div class="flex-1">
        {#if imageUrl && variant !== "faction" && !(largeCard && variant === "character")}
          <div
            class="w-full {variant === 'location'
              ? 'h-28'
              : 'h-44'} overflow-hidden border-b border-theme-border bg-theme-bg/50"
          >
            <img
              src={imageUrl}
              alt={entity?.title}
              loading="lazy"
              decoding="async"
              class="w-full h-full object-cover object-[center_20%] transition-transform duration-500 group-hover:scale-105"
            />
          </div>
        {/if}

        <div class="p-3">
          <div class="flex items-center justify-between gap-1.5 min-w-0">
            <div class="flex items-center gap-1.5 min-w-0 flex-1">
              <span
                class="{getIconClass(
                  category?.icon,
                )} w-3.5 h-3.5 shrink-0 text-theme-primary"
                aria-hidden="true"
              ></span>
              <h3
                class="text-sm font-bold text-theme-text truncate font-header"
              >
                {entity?.title || "Missing Entity"}
              </h3>
            </div>
            <div class="flex items-center gap-0.5 shrink-0">
              {#if entity?.type === "faction" || variant === "faction"}
                <button
                  class="text-theme-muted hover:text-theme-primary p-0.5 transition-colors opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 cursor-pointer"
                  onclick={toggleRosterView}
                  title="Switch to faction roster (members)"
                  aria-label="Switch to faction roster (members)"
                  type="button"
                >
                  <span class="icon-[lucide--users] w-3 h-3" aria-hidden="true"
                  ></span>
                </button>
              {/if}
              {#if imageUrl || isFaction}
                <button
                  class="text-theme-muted hover:text-theme-primary p-0.5 transition-colors opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 cursor-pointer"
                  onclick={toggleImageOnly}
                  title="Switch to image only view"
                  aria-label="Switch to image only view"
                  type="button"
                >
                  <span class="icon-[lucide--image] w-3 h-3" aria-hidden="true"
                  ></span>
                </button>
              {/if}
              {#if !isEditing}
                <button
                  class="text-theme-muted hover:text-theme-primary p-0.5 transition-colors opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 cursor-pointer"
                  onclick={startEdit}
                  title="Quick edit chronicle"
                  aria-label="Quick edit chronicle"
                  type="button"
                >
                  <span class="icon-[lucide--edit-2] w-3 h-3" aria-hidden="true"
                  ></span>
                </button>
              {/if}
            </div>
          </div>
          {#if subtitle && subtitle.toLowerCase() !== (entity?.type || "").toLowerCase()}
            <div
              class="text-micro text-theme-muted font-medium truncate mt-0.5 pl-5"
            >
              {subtitle}
            </div>
          {/if}

          {#if !largeCard && entity?.labels && entity.labels.length > 0}
            <div class="flex flex-wrap gap-1 mt-1.5">
              {#each entity.labels as label}
                <span
                  class="px-1.5 py-0.5 bg-theme-bg border border-theme-border rounded text-nano text-theme-muted"
                >
                  {label}
                </span>
              {/each}
            </div>
          {/if}

          <div class="grid grid-cols-1 grid-rows-1 mt-2">
            <!-- Non-editing content (hidden but takes space when editing to maintain node size) -->
            <div
              class="col-start-1 row-start-1 {isEditing
                ? 'invisible pointer-events-none'
                : ''}"
            >
              {#if variant === "character"}
                <CharacterCardBody
                  {renderedContent}
                  {quote}
                  groups={linkGroups}
                  large={largeCard}
                  {entity}
                  {imageUrl}
                />
              {:else if variant === "faction"}
                <FactionCardBody
                  {renderedContent}
                  members={factionData.members}
                  memberCount={factionData.memberCount}
                  groups={largeCard ? factionData.groups : []}
                  large={largeCard}
                  {entity}
                  {imageUrl}
                />
              {:else if variant === "location"}
                <LocationCardBody
                  {renderedContent}
                  {coordinatesText}
                  {connectionCount}
                  groups={linkGroups}
                />
              {:else}
                <div
                  class="text-meta text-theme-muted leading-relaxed markdown-content prose prose-invert prose-xs font-body"
                >
                  {#if renderedContent}
                    <div class="line-clamp-6">
                      {@html renderedContent}
                    </div>
                  {/if}
                </div>
              {/if}
            </div>

            <!-- Editing area -->
            {#if isEditing}
              <div
                class="col-start-1 row-start-1 relative z-50 pointer-events-auto group/editor min-h-0 overflow-hidden"
              >
                <textarea
                  bind:value={editContent}
                  use:autoresize
                  class="bg-theme-surface/30 border border-theme-border/50 rounded-md p-1.5 text-meta text-theme-muted font-body leading-relaxed focus:outline-none focus:border-theme-primary focus:bg-theme-surface/50 resize-none nodrag overflow-hidden transition-colors w-full min-h-[100px] max-h-[350px]"
                  placeholder="Write the chronicle here..."
                  onkeydown={(e) => {
                    e.stopPropagation();
                  }}
                  ondblclick={(e) => e.stopPropagation()}
                ></textarea>
                <div
                  class="absolute bottom-2 right-2 flex items-center justify-end gap-1 opacity-0 group-hover/editor:opacity-100 focus-within:opacity-100 transition-opacity"
                >
                  <button
                    class="p-1.5 rounded-full bg-theme-surface border border-theme-border text-theme-muted hover:text-red-400 hover:border-red-400/50 backdrop-blur-sm shadow-sm transition-all"
                    onclick={cancelEdit}
                    disabled={isSaving}
                    title="Cancel"
                    aria-label="Cancel"
                    type="button"
                  >
                    <span class="icon-[lucide--x] w-3 h-3" aria-hidden="true"
                    ></span>
                  </button>
                  <button
                    class="p-1.5 rounded-full bg-theme-primary border border-theme-primary text-theme-surface hover:brightness-110 hover:scale-105 backdrop-blur-sm shadow-sm transition-all"
                    onclick={saveEdit}
                    disabled={isSaving}
                    title="Save"
                    aria-label="Save"
                    type="button"
                  >
                    <span
                      class="icon-[lucide--check] w-3 h-3"
                      aria-hidden="true"
                    ></span>
                  </button>
                </div>
              </div>
            {/if}
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  :global(.is-connecting .full-card-handle) {
    pointer-events: none;
  }
  .markdown-content :global(strong) {
    font-weight: bold;
    color: var(--theme-text);
  }
  .markdown-content :global(em) {
    font-style: italic;
  }
  .markdown-content :global(p) {
    margin-bottom: 0.5rem;
  }
  .markdown-content :global(p:last-child) {
    margin-bottom: 0;
  }
  .markdown-content :global(ul),
  .markdown-content :global(ol) {
    margin-left: 1rem;
    margin-bottom: 0.5rem;
  }
</style>
