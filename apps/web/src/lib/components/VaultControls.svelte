<script lang="ts">
    import { vault } from "$lib/stores/vault.svelte";
    import { categories } from "$lib/stores/categories.svelte";
    import { cloudConfig } from "$stores/cloud-config";
    import ShareModal from "$lib/components/ShareModal.svelte";
    import { loadDemoVault } from "$lib/utils/demo";

    let showForm = $state(false);
    let showShare = $state(false);
    let newTitle = $state("");
    let newType = $state<string>("npc");

    // Subscribe to share status
    let isShared = $derived($cloudConfig.shareStatus === "public");

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
        try {
            const id = await vault.createEntity(newType, newTitle);
            vault.selectedEntityId = id;
            newTitle = "";
            showForm = false;
        } catch (err) {
            console.error(err);
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
    <div class="flex gap-1.5 md:gap-3 items-center">
        {#if isOffline}
            <div
                class="flex items-center gap-1.5 px-2 py-1 border border-amber-900/50 bg-amber-950/20 text-amber-500 rounded text-[9px] font-bold tracking-tighter cursor-help"
                title="Sovereign data remains accessible. Cloud sync and Lore Oracle are suspended while offline."
            >
                <span class="icon-[lucide--wifi-off] w-3.5 h-3.5"></span>
                <span class="hidden md:inline">OFFLINE</span>
            </div>
        {/if}

        {#if isShared}
            <div
                class="flex items-center gap-1.5 px-2 py-1 border border-blue-900/50 bg-blue-950/20 text-blue-500 rounded text-[9px] font-bold tracking-tighter cursor-help"
                title="This campaign is publicly accessible via link."
            >
                <span class="icon-[lucide--globe] w-3.5 h-3.5"></span>
                <span class="hidden md:inline">SHARED</span>
            </div>
        {/if}

        <div
            class="text-[10px] md:text-xs text-theme-muted tracking-wider uppercase hidden sm:block"
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
            {:else if vault.allEntities.length > 0 || vault.rootHandle}
                <span class="text-theme-secondary" data-testid="entity-count"
                    >{vault.allEntities.length} ENTITIES</span
                >
            {:else}
                <span class="text-theme-muted">NO VAULT</span>
            {/if}
        </div>

        {#if vault.isGuest}
            <button
                class="px-3 md:px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-[10px] md:text-xs font-bold tracking-widest transition whitespace-nowrap flex items-center gap-2"
                onclick={() => {
                    const url = new URL(
                        window.location.origin + window.location.pathname,
                    );
                    window.history.replaceState({}, "", url.toString());
                    vault.init();
                }}
            >
                <span class="icon-[lucide--log-out] w-3.5 h-3.5"></span>
                EXIT GUEST MODE
            </button>
        {:else if !vault.rootHandle}
            <div class="flex flex-col xs:flex-row gap-2">
                <button
                    class="px-3 md:px-4 py-1.5 bg-theme-primary hover:bg-theme-secondary text-theme-bg rounded text-[10px] md:text-xs font-bold tracking-widest transition whitespace-nowrap"
                    onclick={() => vault.openDirectory()}
                    data-testid="open-vault-button"
                >
                    OPEN <span class="hidden xs:inline">VAULT</span>
                </button>
                <button
                    class="px-3 md:px-4 py-1.5 border border-theme-primary text-theme-primary hover:bg-theme-primary/10 rounded text-[10px] md:text-xs font-bold tracking-widest transition whitespace-nowrap"
                    onclick={() => loadDemoVault(vault.initGuest.bind(vault))}
                    data-testid="load-demo-button"
                >
                    LOAD DEMO
                </button>
            </div>
            {#if typeof window !== "undefined" && !window.showDirectoryPicker}
                <div
                    class="absolute top-12 left-0 right-0 p-2 bg-amber-900/40 border border-amber-500/50 text-amber-200 text-[9px] font-mono rounded backdrop-blur z-50 animate-in fade-in slide-in-from-top-2"
                >
                    <span class="font-bold">SYSTEM ALERT:</span> Local File System
                    Access is blocked in this browser. Use Chrome/Edge/Opera or try
                    the Demo mode.
                </div>
            {/if}
        {:else if !vault.isAuthorized}
            <button
                class="px-3 md:px-4 py-1.5 bg-theme-accent hover:bg-theme-accent/80 text-theme-bg rounded text-[10px] md:text-xs font-bold tracking-widest transition whitespace-nowrap"
                onclick={() => vault.requestPermission()}
            >
                GRANT ACCESS
            </button>
        {:else}
            <button
                class="px-3 md:px-4 py-1.5 border border-theme-border text-theme-secondary hover:text-theme-primary hover:border-theme-primary rounded text-[10px] md:text-xs font-bold tracking-widest transition whitespace-nowrap flex items-center gap-2"
                onclick={() => (showForm = !showForm)}
                data-testid="new-entity-button"
            >
                <span
                    class={showForm
                        ? "icon-[heroicons--x-mark] w-3 h-3"
                        : "icon-[heroicons--plus] w-3 h-3"}
                ></span>
                {showForm ? "CANCEL" : "NEW"}
            </button>
            <button
                class="px-2 py-1.5 border border-theme-border text-theme-muted hover:text-theme-primary hover:border-theme-primary rounded text-sm transition flex items-center justify-center"
                onclick={() => vault.refresh()}
                title="Reload from disk"
            >
                <span class="icon-[lucide--refresh-cw] w-3.5 h-3.5"></span>
            </button>
            <button
                class="px-2 py-1.5 border border-theme-border text-blue-500 hover:text-blue-400 hover:border-blue-700 rounded text-sm transition flex items-center justify-center"
                onclick={() => (showShare = true)}
                title="Share Campaign"
            >
                <span class="icon-[lucide--share-2] w-3.5 h-3.5"></span>
            </button>
            <button
                class="px-3 py-1.5 border border-red-900/50 text-red-700 hover:text-red-500 hover:border-red-700 rounded text-[10px] transition hidden xs:flex items-center gap-1.5"
                onclick={() => {
                    if (
                        vault.pendingSaveCount > 0 &&
                        !confirm(
                            "Vault is currently saving changes. Close anyway?",
                        )
                    )
                        return;
                    vault.close();
                }}
                title="Close current vault and clear all campaign data."
            >
                <span class="icon-[lucide--folder-x] w-3.5 h-3.5"></span>
                CLOSE
            </button>
            <button
                class="px-3 py-1.5 border border-theme-border text-theme-accent hover:text-theme-accent/80 hover:border-theme-accent rounded text-[10px] transition hidden xs:flex items-center gap-1.5"
                onclick={() => vault.rebuildIndex()}
                title="Clear cache and re-index all vault files. Use if search seems out of sync."
            >
                <span class="icon-[lucide--database-zap] w-3 h-3"></span>
                REBUILD
            </button>
        {/if}
    </div>

    {#if showShare}
        <ShareModal close={() => (showShare = false)} />
    {/if}

    {#if showForm}
        <form
            onsubmit={(e) => {
                e.preventDefault();
                handleCreate();
            }}
            class="flex gap-2 p-3 bg-theme-surface rounded border border-theme-border"
        >
            <input
                bind:value={newTitle}
                placeholder="Entry Title..."
                class="px-3 py-1.5 text-xs bg-theme-bg border border-theme-border text-theme-text rounded flex-1 focus:outline-none focus:border-theme-primary placeholder-theme-muted/50"
            />
            <select
                bind:value={newType}
                class="px-2 py-1.5 text-xs bg-theme-bg border border-theme-border text-theme-text rounded focus:outline-none focus:border-theme-primary"
            >
                {#each categories.list as cat}
                    <option value={cat.id}>{cat.label}</option>
                {/each}
            </select>
            <button
                type="submit"
                class="px-4 py-1.5 bg-theme-primary hover:bg-theme-secondary text-theme-bg rounded text-xs font-bold tracking-widest disabled:opacity-50 transition"
                disabled={!newTitle.trim()}
            >
                ADD
            </button>
        </form>
    {/if}
</div>
