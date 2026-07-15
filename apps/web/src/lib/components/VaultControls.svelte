<script lang="ts">
  import { vault } from "$lib/stores/vault.svelte";
  import { categories } from "$lib/stores/categories.svelte";
  import { themeStore } from "$lib/stores/theme.svelte";
  import { demoService } from "$lib/services/demo";
  import { p2pGuestService } from "$lib/cloud-bridge/p2p/guest-service";
  import { base } from "$app/paths";
  import { goto } from "$app/navigation";
  import { sessionModeStore } from "$lib/stores/ui/session-mode.svelte";
  import { notificationStore } from "$lib/stores/ui/notification.svelte";
  import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
  import { layoutUIStore } from "$lib/stores/ui/layout-ui.svelte";
  import { onlineStatus } from "$lib/stores/online.svelte";
  import { openImportWindow } from "$lib/stores/ui/navigation";
  import { entityTemplateService } from "$lib/services/EntityTemplateService.svelte";
  import { proposerStore } from "$lib/stores/proposer.svelte";
  import { tick } from "svelte";

  let { orientation = "horizontal" } = $props<{
    orientation?: "horizontal" | "vertical";
  }>();

  let showForm = $state(false);
  let showNoVaultMenu = $state(false);
  let newTitle = $state("");
  let newType = $state<string>("character");
  let isCreating = $state(false);
  let createError = $state<string | null>(null);
  let useTemplate = $state(true);
  let draftContent = $state("");

  let prefillStartDate = $state<{
    year: number;
    month: number;
    day: number;
  } | null>(null);
  let titleInputEl = $state<HTMLInputElement | null>(null);

  // Open the create form when an empty-state CTA requests it.
  // On mobile, the layout intercepts this flag first and opens a bottom sheet;
  // skip here so the flag isn't consumed before the layout effect runs.
  $effect(() => {
    if (modalUIStore.pendingCreateEntity && !layoutUIStore.isMobile) {
      modalUIStore.pendingCreateEntity = false;
      if (!vault.isGuest) {
        prefillStartDate = modalUIStore.pendingCreateDate;
        modalUIStore.pendingCreateDate = null;
        createError = null;
        showForm = true;
        tick().then(() => titleInputEl?.focus());
      } else {
        modalUIStore.pendingCreateDate = null;
      }
    }
  });

  $effect(() => {
    const draft = proposerStore.draftEntity;
    if (draft) {
      newTitle = draft.title || "";
      newType = draft.type || "rumor";
      draftContent = draft.content || "";
      showForm = true;
      proposerStore.clearDraftEntity();
    }
  });

  // Logic
  let isVertical = $derived(orientation === "vertical");

  // Styling derived states
  const btnBase =
    "rounded font-bold tracking-widest transition whitespace-nowrap flex items-center";

  const btnPrimary = $derived(
    `${btnBase} bg-chrome-accent text-chrome-bg hover:bg-chrome-accent/90`,
  );
  const btnSecondary = $derived(
    `${btnBase} border border-chrome-border text-chrome-muted hover:text-chrome-text hover:border-chrome-accent`,
  );
  const btnAccent = $derived(
    `${btnBase} border border-chrome-border text-chrome-accent hover:text-chrome-accent/85 hover:border-chrome-accent`,
  );
  const btnGhost = $derived(
    `${btnBase} border border-chrome-border text-chrome-muted hover:text-chrome-text hover:border-chrome-accent`,
  );

  const iconOnlyClasses = $derived(
    isVertical
      ? "py-3 text-sm justify-start px-4 gap-3"
      : "px-2 py-1.5 justify-center gap-3",
  );

  // Actions for the "No Vault Open" dropdown (demo / create / open).
  const runNoVaultAction = (action: () => void) => {
    showNoVaultMenu = false;
    action();
  };
  const noVaultMenuItems = $derived([
    {
      icon: "icon-[lucide--sparkles]",
      label: `Explore Demo ${themeStore.jargon.vault}`,
      testid: "no-vault-demo",
      action: () => demoService.startDemo("fantasy"),
    },
    {
      icon: "icon-[lucide--plus]",
      label: `Create New ${themeStore.jargon.vault}`,
      testid: "no-vault-create",
      action: () => modalUIStore.openVaultSwitcher("create"),
    },
    {
      icon: "icon-[lucide--folder-open]",
      label: `Open Existing ${themeStore.jargon.vault}`,
      testid: "no-vault-open",
      action: () => modalUIStore.openVaultSwitcher("open"),
    },
  ]);

  $effect(() => {
    if (showForm && categories.list.length > 0) {
      const currentIsValid = categories.list.some((c) => c.id === newType);
      if (!currentIsValid) {
        newType = categories.list[0].id;
      }
    }
  });

  const handleCreate = async () => {
    if (!newTitle.trim() || isCreating) return;
    isCreating = true;
    createError = null;
    try {
      let resolvedLore = "";
      let resolvedContent = "";
      if (useTemplate) {
        const folderHandle = await vault.getActiveFolderHandle();
        const vaultHandle = await vault.getActiveVaultHandle();
        const customTemplatesDirHandle = folderHandle ?? vaultHandle;

        resolvedLore = await entityTemplateService.resolveTemplate(
          newType,
          themeStore.worldThemeId,
          customTemplatesDirHandle,
        );
        resolvedContent = entityTemplateService.extractSummary(resolvedLore);
      }

      if (draftContent) {
        if (resolvedContent) {
          resolvedContent = draftContent + "\n\n" + resolvedContent;
        } else {
          resolvedContent = draftContent;
        }
        if (resolvedLore) {
          resolvedLore = draftContent + "\n\n" + resolvedLore;
        } else {
          resolvedLore = draftContent;
        }
      }

      const id = await vault.createEntity(newType, newTitle, {
        content: resolvedContent,
        lore: resolvedLore,
        ...(prefillStartDate ? { start_date: prefillStartDate } : {}),
      });
      vault.selectedEntityId = id;
      newTitle = "";
      draftContent = "";
      prefillStartDate = null;
      showForm = false;
    } catch (err: unknown) {
      console.error(err);
      createError = err instanceof Error ? err.message : String(err);
    } finally {
      isCreating = false;
    }
  };

  const isOffline = $derived(!onlineStatus.current);
</script>

<div class="flex flex-col gap-2 font-sans">
  <div
    class="flex {isVertical
      ? 'flex-col items-stretch gap-3'
      : 'gap-1.5 md:gap-3 items-center'}"
  >
    {#if sessionModeStore.isDemoMode}
      <div
        class="flex items-center gap-1.5 px-2 py-1 border border-chrome-accent bg-chrome-accent/10 text-chrome-accent rounded text-[9px] font-bold tracking-tighter"
      >
        DEMO MODE
      </div>
      <button
        class={isVertical
          ? `${btnPrimary} py-3 text-sm justify-center gap-2`
          : `${btnPrimary} px-3 md:px-4 py-1.5 text-[10px] md:text-xs gap-2`}
        onclick={async () => {
          try {
            await demoService.convertToWorld();
          } catch (error) {
            console.error(`Failed to save ${themeStore.jargon.vault}:`, error);
            notificationStore.notify(
              `Failed to save ${themeStore.jargon.vault}. Please try again.`,
              "error",
            );
          }
        }}
        data-testid="save-as-campaign-button"
        aria-label={`Save as ${themeStore.jargon.vault}`}
        aria-describedby="save-as-campaign-desc-text"
        title={`Save this demo exploration as your own persistent ${themeStore.jargon.vault}`}
      >
        <span class="icon-[lucide--save] w-3 h-3" aria-hidden="true"></span>
        SAVE AS {themeStore.jargon.vault.toUpperCase()}
      </button>
      <div class="sr-only" id="save-as-campaign-desc-text">
        Save this demo exploration as your own persistent {themeStore.jargon
          .vault}
      </div>
      <button
        class={isVertical
          ? `${btnGhost} py-3 text-sm justify-center gap-2`
          : `${btnGhost} px-3 md:px-4 py-1.5 text-[10px] md:text-xs gap-2`}
        onclick={() => demoService.exitDemo()}
        aria-label="Exit Demo"
      >
        <span class="icon-[lucide--log-out] w-3 h-3" aria-hidden="true"></span>
        EXIT DEMO
      </button>
    {/if}

    {#if isOffline}
      <div
        class="flex items-center gap-1.5 px-2 py-1 border border-amber-900/50 bg-amber-950/20 text-amber-500 rounded text-[9px] font-bold tracking-tighter cursor-help justify-center"
        title="Sovereign data remains accessible. Cloud-backed features and Lore Oracle are suspended while offline."
      >
        <span class="icon-[lucide--wifi-off] w-3.5 h-3.5" aria-hidden="true"></span>
        <span class={isVertical ? "inline" : "hidden md:inline"}>OFFLINE</span>
      </div>
    {/if}

    {#if vault.isInitialized}
      <button
        type="button"
        class="flex items-center gap-2 rounded transition-colors group {isVertical
          ? 'justify-center w-full py-3 min-h-[44px]'
          : 'px-3 py-2 hover:bg-chrome-bg/50'}"
        onclick={() => modalUIStore.openVaultSwitcher()}
        title="Switch Vault"
        data-testid="open-vault-button"
        aria-haspopup="dialog"
        aria-expanded={modalUIStore.showVaultSwitcher}
      >
        <span
          class="icon-[lucide--database] w-3.5 h-3.5 text-chrome-muted group-hover:text-chrome-accent"
          aria-hidden="true"
        ></span>
        <span
          class="font-bold text-xs tracking-wider text-chrome-text group-hover:text-chrome-accent max-w-[240px] truncate font-sans min-w-0"
        >
          {themeStore.jargon.vault}: {vault.vaultName}
        </span>
        <span
          class="icon-[lucide--chevron-down] w-3 h-3 text-chrome-muted/50 group-hover:text-chrome-accent"
          aria-hidden="true"
        ></span>
      </button>
    {/if}

    <div
      class="text-[10px] md:text-xs text-chrome-muted tracking-wider uppercase {isVertical
        ? 'text-center'
        : 'hidden sm:block'}"
      role="status"
      aria-live="polite"
    >
      {#if vault.status === "loading"}
        {@const determinate =
          vault.loadPhase === "parsing" && vault.syncStats.total > 0}
        <div class="flex flex-col gap-1 items-center min-w-[100px] py-1">
          <span class="animate-pulse text-chrome-accent font-bold font-sans">
            {#if determinate}
              LOADING... {vault.syncStats.progress}%
            {:else if vault.loadPhase === "syncing"}
              SYNCING...
            {:else if vault.loadPhase === "scanning"}
              PREPARING...
            {:else}
              LOADING...
            {/if}
          </span>
          <div class="w-full h-1 bg-chrome-border rounded-full overflow-hidden">
            {#if determinate}
              <div
                class="h-full bg-chrome-accent transition-all duration-300 ease-out"
                style="width: {vault.syncStats.progress}%"
              ></div>
            {:else}
              <div
                class="vault-load-indeterminate h-full bg-chrome-accent"
              ></div>
            {/if}
          </div>
        </div>
      {:else if vault.status === "error" || vault.failedFiles.length > 0}
        <div class="flex items-center gap-1.5">
          <span
            class="text-red-400 font-bold text-[10px] bg-red-900/20 px-2 py-1 rounded border border-red-900/50 cursor-help"
            title={vault.failedFiles.length > 0
              ? vault.failedFiles.map((f) => `${f.path}: ${f.error}`).join("\n")
              : vault.errorMessage || "ERROR"}
          >
            {vault.errorMessage || `${vault.failedFiles.length} FAILURES`}
          </span>
          {#if vault.failedFiles.length > 0}
            <button
              class="text-[9px] text-chrome-muted hover:text-chrome-text underline font-sans"
              onclick={() => (vault.failedFiles = [])}
            >
              CLEAR
            </button>
          {/if}
        </div>
      {:else if vault.allEntities.length > 0}
        <span class="text-chrome-muted font-sans" data-testid="entity-count"
          >{vault.allEntities.length}
          {themeStore
            .resolveJargon("entity", vault.allEntities.length)
            .toUpperCase()}</span
        >
      {:else if vault.isInitialized}
        <span class="text-chrome-muted font-sans" data-testid="entity-count"
          >0 {themeStore.resolveJargon("entity", 0).toUpperCase()}</span
        >
      {:else}
        <div class="relative inline-block normal-case">
          <button
            type="button"
            class="flex items-center gap-1.5 rounded border border-chrome-border px-2 py-1 text-chrome-muted hover:text-chrome-text hover:border-chrome-accent transition-colors font-sans tracking-wider"
            onclick={() => (showNoVaultMenu = !showNoVaultMenu)}
            data-testid="no-vault-menu-button"
            aria-haspopup="menu"
            aria-expanded={showNoVaultMenu}
          >
            <span>No {themeStore.jargon.vault} Open</span>
            <span
              class="icon-[lucide--chevron-down] w-3 h-3 transition-transform {showNoVaultMenu
                ? 'rotate-180'
                : ''}"
              aria-hidden="true"
            ></span>
          </button>

          {#if showNoVaultMenu}
            <button
              type="button"
              class="fixed inset-0 z-[80] w-full h-full cursor-default"
              aria-label="Close menu"
              tabindex="-1"
              onclick={() => (showNoVaultMenu = false)}
            ></button>
            <div
              class="absolute right-0 mt-2 w-56 z-[81] rounded-lg border border-chrome-border bg-chrome-surface shadow-xl py-1 text-left {isVertical
                ? 'left-0 right-auto'
                : ''}"
              role="menu"
              data-testid="no-vault-menu"
            >
              {#each noVaultMenuItems as item}
                <button
                  type="button"
                  role="menuitem"
                  class="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-chrome-text hover:bg-chrome-accent/10 hover:text-chrome-accent transition-colors"
                  onclick={() => runNoVaultAction(item.action)}
                  data-testid={item.testid}
                >
                  <span class="{item.icon} w-3.5 h-3.5 shrink-0"></span>
                  {item.label}
                </button>
              {/each}
            </div>
          {/if}
        </div>
      {/if}
    </div>

    {#if vault.isInitialized}
      {#if vault.isGuest}
        <button
          class={isVertical
            ? `${btnAccent} py-3 text-sm justify-center`
            : `${btnAccent} px-3 md:px-4 py-1.5 text-[10px] md:text-xs`}
          onclick={async () => {
            await p2pGuestService.leaveSession();
            sessionModeStore.guestUsername = null;
            sessionModeStore.isGuestMode = false;
            await goto(base, { replaceState: true });
          }}
          data-testid="exit-guest-mode-button"
          aria-label="Exit Guest Mode"
        >
          <span class="icon-[lucide--log-out] w-3 h-3" aria-hidden="true"></span>
          EXIT GUEST MODE
        </button>
      {:else}
        <!-- Main Actions -->
        <button
          type="button"
          class={isVertical
            ? `${btnGhost} py-3 text-sm justify-center`
            : `${btnSecondary} px-3 md:px-4 py-1.5 text-[10px] md:text-xs`}
          onclick={() => {
            showForm = !showForm;
            if (showForm) {
              createError = null;
            } else {
              draftContent = "";
              newTitle = "";
              prefillStartDate = null;
            }
          }}
          data-testid="new-entity-button"
          aria-expanded={showForm}
        >
          <span
            class={showForm
              ? "icon-[heroicons--x-mark] w-3 h-3"
              : "icon-[heroicons--plus] w-3 h-3"}
            aria-hidden="true"
          ></span>
          {showForm
            ? "CANCEL"
            : `NEW ${themeStore.jargon.entity.toUpperCase()}`}
        </button>

        <div class="relative flex items-center">
          <button
            class={isVertical
              ? `${btnGhost} py-3 text-sm justify-center gap-2 w-full`
              : `${btnSecondary} px-3 md:px-4 py-1.5 text-[10px] md:text-xs gap-2`}
            onclick={() => openImportWindow()}
            data-testid="import-vault-button"
            title="Import markdown notes or JSON data into your archive."
            aria-label="Import Data"
          >
            <span class="icon-[lucide--folder-input] w-3.5 h-3.5" aria-hidden="true"></span>
            IMPORT
          </button>
        </div>

        <div
          class="flex {isVertical
            ? 'flex-col gap-3'
            : 'gap-1.5 md:gap-3 items-center'}"
        >
          {#if (vault.status as string) === "needs-permission"}
            <button
              class="{isVertical
                ? 'py-3 text-sm justify-center gap-2'
                : 'px-3 md:px-4 py-1.5 text-[10px] md:text-xs gap-2'} rounded font-bold tracking-widest transition whitespace-nowrap flex items-center border border-amber-500 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
              onclick={() => vault.saveToFolder()}
              title="Grant browser permission to access your linked local folder."
              aria-label="GRANT ACCESS"
              data-testid="grant-access-button"
            >
              <span class="icon-[lucide--lock] w-3.5 h-3.5" aria-hidden="true"
              ></span>
              GRANT ACCESS
            </button>
          {:else if (vault.status as string) === "saved"}
            <button
              class="{isVertical
                ? 'py-3 text-sm justify-center gap-2'
                : 'px-3 md:px-4 py-1.5 text-[10px] md:text-xs gap-2'} rounded font-bold tracking-widest transition whitespace-nowrap flex items-center border border-green-500 bg-green-500/10 text-green-400 cursor-default"
              title="Changes successfully saved to folder."
              aria-label="SAVED"
              disabled
              data-testid="saved-indicator-button"
            >
              <span
                class="icon-[lucide--check-circle] w-3.5 h-3.5"
                aria-hidden="true"
              ></span>
              SAVED
            </button>
          {:else}
            <button
              class="{btnAccent} {isVertical
                ? 'py-3 text-sm justify-center gap-2'
                : 'px-3 md:px-4 py-1.5 text-[10px] md:text-xs gap-2'} {vault.status ===
              'saving'
                ? 'opacity-75 cursor-wait'
                : ''} {vault.hasFolderHandle && !vault.isDirty
                ? 'opacity-50'
                : ''}"
              onclick={() => vault.saveToFolder()}
              title={!vault.hasFolderHandle
                ? "No folder linked — select a local folder to enable saving."
                : vault.isDirty
                  ? "Save to folder — writes all changes from the internal archive to your linked folder."
                  : "Up to date with local folder."}
              aria-label="SAVE TO FOLDER"
              aria-busy={vault.status === "saving"}
              disabled={vault.status === "saving" ||
                (vault.hasFolderHandle && !vault.isDirty)}
            >
              {#if vault.status === "saving"}
                <span
                  class="icon-[lucide--loader-2] w-3.5 h-3.5 animate-spin"
                  aria-hidden="true"
                ></span>
                SAVING...
              {:else}
                <span
                  class={vault.isDirty || !vault.hasFolderHandle
                    ? "icon-[lucide--upload-cloud] w-3.5 h-3.5"
                    : "icon-[lucide--cloud-check] w-3.5 h-3.5"}
                  aria-hidden="true"
                ></span>
                {#if isVertical}SAVE TO FOLDER{:else}SAVE{/if}
              {/if}
            </button>
          {/if}

          <button
            class="{btnGhost} {iconOnlyClasses}"
            onclick={() => modalUIStore.openGeneratorWorkflow()}
            title="Generate campaign content"
            aria-label={isVertical
              ? "GENERATE - Generate campaign content"
              : "Generate campaign content"}
            data-testid="open-generator-button"
          >
            <span class="icon-[lucide--wand-2] w-3.5 h-3.5" aria-hidden="true"></span>
            {#if isVertical}<span class="font-bold tracking-widest"
                >GENERATE</span
              >{/if}
          </button>

          <button
            class="{btnGhost} text-blue-500 hover:text-blue-400 hover:border-blue-700 {iconOnlyClasses}"
            onclick={() => modalUIStore.openShare()}
            title="Share Campaign"
            aria-label={isVertical
              ? "SHARE - Share Campaign"
              : "Share Campaign"}
          >
            <span class="icon-[lucide--share-2] w-3.5 h-3.5" aria-hidden="true"></span>
            {#if isVertical}<span class="font-bold tracking-widest">SHARE</span
              >{/if}
          </button>
        </div>
      {/if}
    {/if}
  </div>

  {#if showForm}
    <form
      onsubmit={(e) => {
        e.preventDefault();
        handleCreate();
      }}
      class="flex {isVertical
        ? 'flex-col'
        : 'flex-wrap'} gap-2 p-3 bg-chrome-surface rounded border border-chrome-border animate-in slide-in-from-top-2 fade-in"
    >
      <input
        bind:this={titleInputEl}
        bind:value={newTitle}
        aria-label={`New ${themeStore.jargon.entity} Title`}
        placeholder={`${themeStore.jargon.entity} Title...`}
        data-testid="new-entity-title-input"
        class="px-3 py-1.5 text-xs bg-chrome-bg border border-chrome-border text-chrome-text rounded flex-1 focus:outline-none focus:border-chrome-accent placeholder-chrome-muted/50 font-sans {isVertical
          ? 'py-3 text-sm'
          : ''}"
        aria-invalid={!!createError}
        aria-describedby={createError ? "create-error" : undefined}
      />
      <select
        bind:value={newType}
        aria-label="New Entity Type"
        class="px-2 py-1.5 text-xs bg-chrome-bg border border-chrome-border text-chrome-text rounded focus:outline-none focus:border-chrome-accent font-sans {isVertical
          ? 'py-3 text-sm'
          : ''}"
      >
        {#each categories.list as cat}
          <option value={cat.id}>{cat.label}</option>
        {/each}
      </select>

      {#if prefillStartDate}
        <div
          class="flex items-center gap-1.5 rounded px-2 py-1 text-[10px] bg-chrome-accent/10 border border-chrome-accent/30 text-chrome-accent font-mono tracking-wide"
        >
          <span class="icon-[lucide--calendar] h-3 w-3" aria-hidden="true"
          ></span>
          Start date: {prefillStartDate.year}-{String(
            prefillStartDate.month,
          ).padStart(2, "0")}-{String(prefillStartDate.day).padStart(2, "0")}
        </div>
      {/if}

      <label
        class="flex items-center gap-2 cursor-pointer group select-none text-[10px] md:text-xs text-chrome-muted hover:text-chrome-text {isVertical
          ? 'py-1'
          : 'px-1'}"
      >
        <input type="checkbox" bind:checked={useTemplate} class="sr-only" />
        <div
          class="w-7 h-4 bg-chrome-bg border border-chrome-border rounded-full relative transition-colors group-focus-within:border-chrome-accent group-focus-within:ring-2 group-focus-within:ring-chrome-accent/30 {useTemplate
            ? 'bg-chrome-accent/20 border-chrome-accent/50'
            : ''}"
        >
          <div
            class="absolute top-0.5 left-0.5 w-2.5 h-2.5 rounded-full bg-chrome-muted transition-all {useTemplate
              ? 'translate-x-3 bg-chrome-accent'
              : ''}"
          ></div>
        </div>
        <span>Start from default format</span>
      </label>

      <button
        type="submit"
        class="{btnPrimary} {isVertical
          ? 'py-3 text-sm justify-center'
          : 'px-4 py-1.5 text-xs'} {!newTitle.trim() || isCreating
          ? 'opacity-50 cursor-not-allowed'
          : ''}"
        aria-disabled={!newTitle.trim() || isCreating}
        title={!newTitle.trim() ? "Enter a title to create" : ""}
        aria-busy={isCreating}
      >
        {#if isCreating}
          <span
            class="icon-[lucide--loader-2] w-3.5 h-3.5 animate-spin mr-2"
            aria-hidden="true"
          ></span>
          ADDING...
        {:else}
          ADD
        {/if}
      </button>
      {#if createError}
        <div
          id="create-error"
          class="text-[10px] text-red-500 w-full text-center font-sans"
          role="alert"
        >
          {createError}
        </div>
      {/if}
    </form>
  {/if}
</div>

<style>
  /* Indeterminate loading bar for phases without determinate progress
     (scanning the folder tree, syncing the local folder). A partial-width
     element slides across the track so the user sees motion instead of a
     bar frozen at 0%. */
  .vault-load-indeterminate {
    width: 40%;
    border-radius: 9999px;
    animation: vault-load-slide 1.2s ease-in-out infinite;
  }

  @keyframes vault-load-slide {
    0% {
      transform: translateX(-110%);
    }
    100% {
      transform: translateX(310%);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .vault-load-indeterminate {
      width: 100%;
      animation: vault-load-pulse 1.2s ease-in-out infinite;
    }

    @keyframes vault-load-pulse {
      0%,
      100% {
        opacity: 0.4;
      }
      50% {
        opacity: 1;
      }
    }
  }
</style>
