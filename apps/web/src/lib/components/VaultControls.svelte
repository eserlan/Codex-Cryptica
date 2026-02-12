<script lang="ts">
    import { vault } from "$lib/stores/vault.svelte";
    import { ui } from "$lib/stores/ui.svelte";
    import { categories } from "$lib/stores/categories.svelte";
    import { cloudConfig } from "$stores/cloud-config";
    import ShareModal from "$lib/components/ShareModal.svelte";
    import VaultSwitcherModal from "$lib/components/vaults/VaultSwitcherModal.svelte";

    let { orientation = "horizontal" } = $props<{
        orientation?: "horizontal" | "vertical";
    }>();

    let showForm = $state(false);
    let showShare = $state(false);
    let showVaultSwitcher = $state(false);
    let newTitle = $state("");
    let newType = $state<string>("character");
    let isCreating = $state(false);
    let createError = $state<string | null>(null);

    // Logic
    let isShared = $derived($cloudConfig.shareStatus === "public");
    let isVertical = $derived(orientation === "vertical");

    // Styling derived states
    const btnBase =
        "rounded font-bold tracking-widest transition whitespace-nowrap flex items-center";

    const btnPrimary = $derived(
        `${btnBase} bg-theme-primary hover:bg-theme-secondary text-theme-bg`,
    );
    const btnSecondary = $derived(
        `${btnBase} border border-theme-border text-theme-secondary hover:text-theme-primary hover:border-theme-primary`,
    );
    const btnAccent = $derived(
        `${btnBase} border border-theme-border text-theme-accent hover:text-theme-accent/80 hover:border-theme-accent`,
    );
    const btnGhost = $derived(
        `${btnBase} border border-theme-border text-theme-muted hover:text-theme-primary hover:border-theme-primary`,
    );

    const layoutClasses = $derived(
        isVertical
            ? "py-3 text-sm justify-center gap-2"
            : "px-3 md:px-4 py-1.5 text-[10px] md:text-xs gap-2",
    );

    const iconOnlyClasses = $derived(
        isVertical
            ? "py-3 text-sm justify-start px-4 gap-3"
            : "px-2 py-1.5 justify-center gap-3",
    );

    $effect(() => {
        if (showForm && categories.list.length > 0) {
            const currentIsValid = categories.list.some(
                (c) => c.id === newType,
            );
            if (!currentIsValid) {
                newType = categories.list[0].id;
            }
        }
    });

    const handleCreate = async () => {
        if (!newTitle.trim()) return;
        isCreating = true;
        createError = null;
        try {
            const id = await vault.createEntity(newType, newTitle);
            vault.selectedEntityId = id;
            newTitle = "";
            showForm = false;
        } catch (err: unknown) {
            console.error(err);
            createError = err instanceof Error ? err.message : String(err);
        } finally {
            isCreating = false;
        }
    };

    let isOffline = $state(false);
    $effect(() => {
        if (typeof window === "undefined") return;
        const updateStatus = () => (isOffline = !navigator.onLine);
        window.addEventListener("online", updateStatus);
        window.addEventListener("offline", updateStatus);
        updateStatus();
        return () => {
            window.removeEventListener("online", updateStatus);
            window.removeEventListener("offline", updateStatus);
        };
    });
</script>

<div class="flex flex-col gap-2 font-mono">
    <div
        class="flex {isVertical
            ? 'flex-col items-stretch gap-3'
            : 'gap-1.5 md:gap-3 items-center'}"
    >
        {#if isOffline}
            <div
                class="flex items-center gap-1.5 px-2 py-1 border border-amber-900/50 bg-amber-950/20 text-amber-500 rounded text-[9px] font-bold tracking-tighter cursor-help justify-center"
                title="Sovereign data remains accessible. Cloud sync and Lore Oracle are suspended while offline."
            >
                <span class="icon-[lucide--wifi-off] w-3.5 h-3.5"></span>
                <span class={isVertical ? "inline" : "hidden md:inline"}
                    >OFFLINE</span
                >
            </div>
        {/if}

        {#if isShared}
            <div
                class="flex items-center gap-1.5 px-2 py-1 border border-blue-900/50 bg-blue-950/20 text-blue-500 rounded text-[9px] font-bold tracking-tighter cursor-help justify-center"
                title="This campaign is publicly accessible via link."
            >
                <span class="icon-[lucide--globe] w-3.5 h-3.5"></span>
                <span class={isVertical ? "inline" : "hidden md:inline"}
                    >SHARED</span
                >
            </div>
        {/if}

        <button
            class="flex items-center gap-2 rounded transition-colors group {isVertical
                ? 'justify-center w-full py-3 min-h-[44px]'
                : 'px-2 py-1 hover:bg-theme-surface/50'}"
            onclick={() => (showVaultSwitcher = true)}
            title="Switch Vault"
            data-testid="open-vault-button"
        >
            <span
                class="icon-[lucide--database] w-3.5 h-3.5 text-theme-muted group-hover:text-theme-primary"
            ></span>
            <span
                class="font-bold text-xs tracking-wider text-theme-text group-hover:text-theme-primary max-w-[120px] truncate"
            >
                {vault.vaultName}
            </span>
            <span
                class="icon-[lucide--chevron-down] w-3 h-3 text-theme-muted/50 group-hover:text-theme-primary"
            ></span>
        </button>

        <div
            class="text-[10px] md:text-xs text-theme-muted tracking-wider uppercase {isVertical
                ? 'text-center'
                : 'hidden sm:block'}"
        >
            {#if vault.status === "loading"}
                <span class="animate-pulse text-theme-primary">LOADING...</span>
            {:else if vault.status === "saving"}
                <span class="text-theme-accent">SAVING...</span>
            {:else if vault.status === "error"}
                <span
                    class="text-red-400 font-bold text-xs bg-red-900/20 px-2 py-1 rounded border border-red-900/50"
                >
                    {vault.errorMessage || "ERROR"}
                </span>
            {:else if vault.allEntities.length > 0}
                <span class="text-theme-secondary" data-testid="entity-count"
                    >{vault.allEntities.length} ENTITIES</span
                >
            {:else}
                <span class="text-theme-muted">NO VAULT</span>
            {/if}
        </div>

        {#if vault.isInitialized}
            <!-- Main Actions -->
            <button
                class={isVertical
                    ? `${btnGhost} py-3 text-sm justify-center`
                    : `${btnSecondary} px-3 md:px-4 py-1.5 text-[10px] md:text-xs`}
                onclick={() => {
                    showForm = !showForm;
                    if (showForm) createError = null;
                }}
                data-testid="new-entity-button"
            >
                <span
                    class={showForm
                        ? "icon-[heroicons--x-mark] w-3 h-3"
                        : "icon-[heroicons--plus] w-3 h-3"}
                ></span>
                {showForm ? "CANCEL" : "NEW ENTITY"}
            </button>

            <div
                class="flex {isVertical
                    ? 'flex-col gap-3'
                    : 'gap-1.5 md:gap-3 items-center'}"
            >
                <button
                    class="{btnAccent} {layoutClasses}"
                    onclick={() => vault.syncToLocal()}
                    title="Export all OPFS data to a local folder for safety."
                >
                    <span class="icon-[lucide--download] w-3.5 h-3.5"></span>
                    {#if isVertical}SYNC TO FOLDER{:else}SYNC{/if}
                </button>
                <button
                    class="{btnGhost} text-blue-500 hover:text-blue-400 hover:border-blue-700 {iconOnlyClasses}"
                    onclick={() => (showShare = true)}
                    title="Share Campaign"
                >
                    <span class="icon-[lucide--share-2] w-3.5 h-3.5"></span>
                    {#if isVertical}<span class="font-bold tracking-widest"
                            >SHARE</span
                        >{/if}
                </button>
                <button
                    class="{iconOnlyClasses} {btnGhost} {ui.sharedMode
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
                        : ''}"
                    onclick={() => (ui.sharedMode = !ui.sharedMode)}
                    title={ui.sharedMode
                        ? "Exit Shared Mode (Admin View)"
                        : "Enter Shared Mode (Player Preview)"}
                    data-testid="shared-mode-toggle"
                >
                    <span
                        class={ui.sharedMode
                            ? "icon-[lucide--eye] w-3.5 h-3.5"
                            : "icon-[lucide--eye-off] w-3.5 h-3.5"}
                    ></span>
                    {#if isVertical}<span class="font-bold tracking-widest"
                            >{ui.sharedMode
                                ? "EXIT PLAYER VIEW"
                                : "PLAYER VIEW"}</span
                        >{/if}
                </button>
            </div>
        {/if}
    </div>

    {#if showShare}
        <ShareModal close={() => (showShare = false)} />
    {/if}

    {#if showVaultSwitcher}
        <VaultSwitcherModal onClose={() => (showVaultSwitcher = false)} />
    {/if}

    {#if showForm}
        <form
            onsubmit={(e) => {
                e.preventDefault();
                handleCreate();
            }}
            class="flex {isVertical
                ? 'flex-col'
                : 'flex-wrap'} gap-2 p-3 bg-theme-surface rounded border border-theme-border animate-in slide-in-from-top-2 fade-in"
        >
            <input
                bind:value={newTitle}
                aria-label="New Entity Title"
                placeholder="Entry Title..."
                class="px-3 py-1.5 text-xs bg-theme-bg border border-theme-border text-theme-text rounded flex-1 focus:outline-none focus:border-theme-primary placeholder-theme-muted/50 {isVertical
                    ? 'py-3 text-sm'
                    : ''}"
            />
            <select
                bind:value={newType}
                aria-label="New Entity Type"
                class="px-2 py-1.5 text-xs bg-theme-bg border border-theme-border text-theme-text rounded focus:outline-none focus:border-theme-primary {isVertical
                    ? 'py-3 text-sm'
                    : ''}"
            >
                {#each categories.list as cat}
                    <option value={cat.id}>{cat.label}</option>
                {/each}
            </select>
            <button
                type="submit"
                class="{btnPrimary} {isVertical
                    ? 'py-3 text-sm justify-center'
                    : 'px-4 py-1.5 text-xs'} disabled:opacity-50"
                disabled={!newTitle.trim() || isCreating}
            >
                {#if isCreating}
                    <span class="animate-pulse">ADDING...</span>
                {:else}
                    ADD
                {/if}
            </button>
            {#if createError}
                <div
                    class="text-[10px] text-red-500 w-full text-center"
                    role="alert"
                >
                    {createError}
                </div>
            {/if}
        </form>
    {/if}
</div>
