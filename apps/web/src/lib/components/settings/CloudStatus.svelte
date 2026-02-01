<script lang="ts">
    import { cloudConfig } from "$stores/cloud-config";
    import { syncStats } from "$stores/sync-stats";
    import { gdriveAdapter as adapter } from "$stores/gdrive.svelte";
    import { workerBridge } from "$lib/cloud-bridge/worker-bridge";

    import { uiStore } from "$stores/ui.svelte";
    import { base } from "$app/paths";

    let { embedMode = false } = $props<{ embedMode?: boolean }>();

    let isLoading = $state(false);
    let error = $state<string | null>(null);

    const handleLogin = async () => {
        isLoading = true;
        error = null;
        try {
            const email = await adapter.connect();
            cloudConfig.setEnabled(true);
            cloudConfig.setConnectedEmail(email);
        } catch (e: any) {
            console.error("Login Error:", e);
            error = e.message || "Failed to connect";
        } finally {
            isLoading = false;
        }
    };

    const handleLogout = async () => {
        isLoading = true;
        try {
            await adapter.disconnect();
            cloudConfig.reset();
            uiStore.closeSettings();
        } catch (e: any) {
            console.error("Logout Error:", e);
        } finally {
            isLoading = false;
        }
    };

    let isFlashing = $state(false);

    const handleSync = () => {
        console.group("[CloudStatus] SYNC NOW Clicked");
        isFlashing = true;
        // set immediately to provide feedback
        syncStats.setStatus("SYNCING");
        console.log("[CloudStatus] UI: setStatus('SYNCING')");
        console.log("[CloudStatus] Calling workerBridge.startSync()...");
        workerBridge.startSync();
        setTimeout(() => (isFlashing = false), 500);
        console.groupEnd();
    };

    const toggleSync = (e: Event) => {
        const target = e.target as HTMLInputElement;
        cloudConfig.setEnabled(target.checked);
    };

    // Check if gapi token exists - adapter now caches and restores tokens automatically
    // We use polling because gapi state changes aren't reactive in Svelte
    let hasToken = $state(false);

    $effect(() => {
        const checkToken = () => {
            hasToken =
                typeof window !== "undefined" &&
                typeof window.gapi !== "undefined" &&
                !!window.gapi.client?.getToken()?.access_token;
        };

        checkToken();
        const interval = setInterval(checkToken, 5000);

        const onFocus = () => checkToken();
        window.addEventListener("focus", onFocus);

        return () => {
            clearInterval(interval);
            window.removeEventListener("focus", onFocus);
        };
    });

    let status = $derived($syncStats.status);
    let isSyncing = $derived(status === "SCANNING" || status === "SYNCING");
    let isConnected = $derived(
        $cloudConfig.enabled && $cloudConfig.connectedEmail,
    );

    let isConfigured = $derived(
        adapter?.isConfigured() ||
            (typeof window !== "undefined" &&
                (window as any).TEST_FORCE_CONFIGURED),
    );
</script>

<div class="relative font-mono cloud-status-container">
    {#if !embedMode}
        <button
            class="w-8 h-8 flex items-center justify-center border border-theme-border hover:border-theme-primary rounded transition-all group relative {uiStore.showSettings &&
            uiStore.activeSettingsTab === 'sync'
                ? 'z-[60] border-theme-primary bg-theme-primary/10'
                : 'z-10'} {isFlashing
                ? 'ring-2 ring-theme-primary ring-opacity-50 scale-95'
                : ''}"
            onclick={() => uiStore.toggleSettings("sync")}
            title={isConnected
                ? `Connected as ${$cloudConfig.connectedEmail}`
                : "Cloud Sync Settings"}
            data-testid="cloud-status-button"
        >
            {#if isFlashing}
                <div
                    class="absolute inset-0 bg-theme-primary/20 rounded animate-ping pointer-events-none"
                ></div>
            {/if}
            <span
                class="transition-all flex items-center justify-center {isConnected
                    ? 'text-theme-primary'
                    : 'text-theme-muted group-hover:text-theme-primary'}"
            >
                <span
                    class="w-5 h-5 {isSyncing
                        ? 'icon-[lucide--zap] animate-pulse'
                        : 'icon-[lucide--cloud]'}"
                ></span>
            </span>
            {#if isSyncing}
                <span
                    class="text-[8px] text-theme-primary font-bold ml-1 hidden xs:inline animate-pulse"
                    >SYNCING</span
                >
            {/if}
            {#if isConnected && !isSyncing}
                <span
                    class="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-theme-primary rounded-full border border-theme-bg animate-pulse"
                ></span>
            {/if}
        </button>
    {/if}

    {#if embedMode}
        <div class="w-full" data-testid="cloud-status-menu">
            <div class="flex flex-col gap-4">
                {#if !isConfigured}
                    <div
                        class="p-3 bg-theme-accent/10 border border-theme-accent/30 rounded text-theme-text text-xs leading-relaxed"
                    >
                        <span
                            class="font-bold text-theme-accent block mb-1 uppercase tracking-wider"
                            >Configuration Required</span
                        >
                        Google Drive sync requires a client ID. Add
                        <code>VITE_GOOGLE_CLIENT_ID</code>
                        to your <code>.env</code> file to enable this feature.
                    </div>
                {:else if !isConnected}
                    <div class="flex flex-col gap-3">
                        <p class="text-theme-muted italic">
                            Mirror your lore to Google Drive for multi-device
                            access. This is entirely opt-in.
                        </p>
                        <button
                            class="w-full py-2 bg-theme-primary hover:bg-theme-secondary !text-theme-bg font-bold rounded transition disabled:opacity-50 flex items-center justify-center gap-2"
                            onclick={handleLogin}
                            disabled={isLoading}
                        >
                            {#if isLoading}
                                <span
                                    class="w-3 h-3 border-2 border-theme-bg border-t-transparent rounded-full animate-spin"
                                ></span>
                                CONNECTING...
                            {:else}
                                LOG IN WITH GOOGLE
                            {/if}
                        </button>
                    </div>
                {:else}
                    <div class="flex flex-col gap-4">
                        <div class="flex items-center justify-between">
                            <div class="flex flex-col">
                                <span class="text-xs text-theme-muted uppercase"
                                    >Account</span
                                >
                                <span
                                    class="text-theme-primary font-bold truncate max-w-[160px]"
                                    >{$cloudConfig.connectedEmail}</span
                                >
                            </div>
                            <label
                                class="relative inline-flex items-center cursor-pointer"
                            >
                                <input
                                    type="checkbox"
                                    checked={$cloudConfig.enabled}
                                    onchange={toggleSync}
                                    class="sr-only peer"
                                />
                                <div
                                    class="w-8 h-4 bg-theme-bg border border-theme-border rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-theme-muted after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-theme-primary/20 peer-checked:after:bg-theme-primary"
                                ></div>
                            </label>
                        </div>

                        <div
                            class="p-2 bg-theme-surface border border-theme-border rounded"
                        >
                            <div class="flex justify-between mb-1">
                                <span class="text-theme-muted text-xs uppercase"
                                    >Sync Status</span
                                >
                                <span
                                    class={status === "ERROR"
                                        ? "text-theme-accent"
                                        : "text-theme-primary font-bold"}
                                    >{status}</span
                                >
                            </div>

                            {#if isSyncing && $syncStats.stats?.phase}
                                <div class="mb-3">
                                    <div
                                        class="flex justify-between text-[11px] text-theme-muted uppercase mb-1"
                                    >
                                        <span>{$syncStats.stats.phase}</span>
                                        <span
                                            >{$syncStats.stats.current} / {$syncStats
                                                .stats.total}</span
                                        >
                                    </div>
                                    <div
                                        class="w-full h-1 bg-theme-primary/10 rounded-full overflow-hidden"
                                    >
                                        <div
                                            class="h-full bg-theme-primary transition-all duration-300"
                                            style="width: {$syncStats.stats
                                                .total &&
                                            $syncStats.stats.total > 0
                                                ? (($syncStats.stats.current ||
                                                      0) /
                                                      $syncStats.stats.total) *
                                                  100
                                                : 0}%"
                                        ></div>
                                    </div>
                                </div>
                            {/if}

                            {#if $syncStats.stats}
                                <div
                                    class="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-theme-border text-xs"
                                >
                                    <div class="text-theme-muted uppercase">
                                        Uploaded
                                    </div>
                                    <div class="text-theme-text/80">
                                        {$syncStats.stats.filesUploaded}
                                    </div>
                                    <div class="text-theme-muted uppercase">
                                        Downloaded
                                    </div>
                                    <div class="text-theme-text/80">
                                        {$syncStats.stats.filesDownloaded}
                                    </div>
                                </div>
                            {/if}
                        </div>

                        {#if error}
                            <div
                                class="text-theme-accent text-xs bg-theme-accent/10 p-2 border border-theme-accent/30 rounded"
                            >
                                {error}
                            </div>
                        {/if}

                        <div class="flex gap-2">
                            <button
                                class="flex-1 px-3 py-2 !text-theme-bg font-bold rounded transition-all disabled:opacity-50 flex items-center justify-center gap-2 {isFlashing
                                    ? 'scale-95 ring-2 ring-theme-primary/50'
                                    : ''} {!hasToken
                                    ? 'bg-theme-accent hover:bg-theme-accent/80'
                                    : 'bg-theme-primary hover:bg-theme-secondary'}"
                                onclick={!hasToken ? handleLogin : handleSync}
                                disabled={isSyncing ||
                                    !$cloudConfig.enabled ||
                                    isLoading}
                            >
                                {#if isSyncing || isLoading}
                                    <span
                                        class="w-3 h-3 border-2 border-theme-bg border-t-transparent rounded-full animate-spin"
                                    ></span>
                                    {isSyncing ? "SYNCING..." : "CONNECTING..."}
                                {:else if !hasToken}
                                    RECONNECT
                                {:else}
                                    SYNC NOW
                                {/if}
                            </button>
                            <button
                                class="px-3 py-2 border border-theme-accent/50 text-theme-accent hover:bg-theme-accent/10 rounded transition"
                                onclick={handleLogout}
                                title="Disconnect"
                            >
                                Unlink
                            </button>
                        </div>

                        {#if !embedMode}
                            <div class="pt-4 border-t border-theme-border">
                                <button
                                    onclick={() =>
                                        uiStore.toggleSettings("schema")}
                                    class="w-full py-2 bg-theme-primary/10 border border-theme-primary/30 text-theme-primary hover:bg-theme-primary hover:text-theme-bg rounded text-xs font-bold tracking-widest transition-all flex items-center justify-center gap-2"
                                    data-testid="manage-categories-button"
                                >
                                    <span class="icon-[lucide--tags] w-3 h-3"
                                    ></span>
                                    MANAGE CATEGORIES
                                </button>
                            </div>

                            <div
                                class="pt-2 flex justify-center gap-4 text-[9px] text-theme-muted/40 uppercase tracking-tighter"
                            >
                                <a
                                    href="{base}/privacy"
                                    class="hover:text-theme-primary transition-colors"
                                    >Privacy Policy</a
                                >
                                <span>•</span>
                                <a
                                    href="{base}/terms"
                                    class="hover:text-theme-primary transition-colors"
                                    >Terms of Service</a
                                >
                            </div>
                        {/if}
                    </div>
                {/if}
            </div>
        </div>
    {/if}
</div>

<style>
    /* Basic styling for the component */
    :global(.sr-only) {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border-width: 0;
    }
</style>
