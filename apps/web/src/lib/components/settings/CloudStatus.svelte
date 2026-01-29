<script lang="ts">
    import { cloudConfig } from "$stores/cloud-config";
    import { syncStats } from "$stores/sync-stats";
    import { GoogleDriveAdapter } from "$lib/cloud-bridge/google-drive/adapter";
    import { workerBridge } from "$lib/cloud-bridge/worker-bridge";

    import { uiStore } from "$stores/ui.svelte";
    import AISettings from "./AISettings.svelte";
    import { base } from "$app/paths";

    let adapter = new GoogleDriveAdapter();
    let isLoading = $state(false);
    let error = $state<string | null>(null);
    let showMenu = $derived(uiStore.showSettings);

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
    <button
        class="w-8 h-8 flex items-center justify-center border border-green-900/30 hover:border-green-500 rounded transition-all group relative {showMenu
            ? 'z-[60] border-green-500 bg-green-900/10'
            : 'z-10'} {isFlashing
            ? 'ring-2 ring-green-500 ring-opacity-50 scale-95'
            : ''}"
        onclick={() => uiStore.toggleSettings()}
        title={isConnected
            ? `Connected as ${$cloudConfig.connectedEmail}`
            : "Cloud Sync Settings"}
        data-testid="cloud-status-button"
    >
        {#if isFlashing}
            <div
                class="absolute inset-0 bg-green-500/20 rounded animate-ping pointer-events-none"
            ></div>
        {/if}
        <span
            class="transition-all flex items-center justify-center {isConnected
                ? 'text-green-500'
                : 'text-green-900 group-hover:text-green-700'}"
        >
            <span
                class="w-5 h-5 {isSyncing
                    ? 'icon-[lucide--zap] animate-pulse'
                    : 'icon-[lucide--settings]'}"
            ></span>
        </span>
        {#if isSyncing}
            <span
                class="text-[8px] text-green-500 font-bold ml-1 hidden xs:inline animate-pulse"
                >SYNCING</span
            >
        {/if}
        {#if isConnected && !isSyncing}
            <span
                class="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-green-500 rounded-full border border-black animate-pulse"
            ></span>
        {/if}
    </button>

    {#if showMenu}
        <div
            class="absolute right-0 top-full mt-2 w-72 bg-[#0c0c0c] border border-green-900/50 shadow-2xl rounded p-4 z-50 text-xs"
            data-testid="cloud-status-menu"
        >
            <div class="flex flex-col gap-4">
                <div
                    class="flex justify-between items-center pb-2 border-b border-green-900/20"
                >
                    <span
                        class="text-gray-500 uppercase tracking-widest text-[10px]"
                        >Cloud Sync</span
                    >
                    <button
                        type="button"
                        class="text-gray-600 hover:text-gray-400 text-sm p-1 -m-1"
                        onclick={(e) => {
                            e.stopPropagation();
                            uiStore.closeSettings();
                        }}
                        data-testid="cloud-status-close">✕</button
                    >
                </div>

                {#if !isConfigured}
                    <div
                        class="p-3 bg-amber-950/20 border border-amber-900/30 rounded text-amber-200 text-[10px] leading-relaxed"
                    >
                        <span class="font-bold text-amber-500 block mb-1"
                            >CONFIGURATION REQUIRED</span
                        >
                        Google Drive sync requires a client ID. Add
                        <code>VITE_GOOGLE_CLIENT_ID</code>
                        to your <code>.env</code> file to enable this feature.
                    </div>
                {:else if !isConnected}
                    <div class="flex flex-col gap-3">
                        <p class="text-gray-500 italic">
                            Mirror your lore to Google Drive for multi-device
                            access. This is entirely opt-in.
                        </p>
                        <button
                            class="w-full py-2 bg-green-600 hover:bg-green-500 text-black font-bold rounded transition disabled:opacity-50 flex items-center justify-center gap-2"
                            onclick={handleLogin}
                            disabled={isLoading}
                        >
                            {#if isLoading}
                                <span
                                    class="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin"
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
                                <span
                                    class="text-[10px] text-gray-600 uppercase"
                                    >Account</span
                                >
                                <span
                                    class="text-green-400 font-bold truncate max-w-[160px]"
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
                                    class="w-8 h-4 bg-gray-900 border border-green-900/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-green-900 after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-green-900/20 peer-checked:after:bg-green-500"
                                ></div>
                            </label>
                        </div>

                        <div
                            class="p-2 bg-black/50 border border-green-900/20 rounded"
                        >
                            <div class="flex justify-between mb-1">
                                <span
                                    class="text-gray-500 text-[10px] uppercase"
                                    >Sync Status</span
                                >
                                <span
                                    class={status === "ERROR"
                                        ? "text-red-400"
                                        : "text-green-500 font-bold"}
                                    >{status}</span
                                >
                            </div>
                            {#if $syncStats.stats}
                                <div
                                    class="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-green-900/10 text-[10px]"
                                >
                                    <div>
                                        <div class="text-gray-600 uppercase">
                                            Uploaded
                                        </div>
                                        <div class="text-green-900/80">
                                            {$syncStats.stats.filesUploaded}
                                        </div>
                                    </div>
                                    <div>
                                        <div class="text-gray-600 uppercase">
                                            Downloaded
                                        </div>
                                        <div class="text-green-900/80">
                                            {$syncStats.stats.filesDownloaded}
                                        </div>
                                    </div>
                                </div>
                            {/if}
                        </div>

                        {#if error}
                            <div
                                class="text-red-400 text-[10px] bg-red-900/10 p-2 border border-red-900/30 rounded"
                            >
                                {error}
                            </div>
                        {/if}

                        <div class="flex gap-2">
                            <button
                                class="flex-1 px-3 py-2 text-black font-bold rounded transition-all disabled:opacity-50 flex items-center justify-center gap-2 {isFlashing
                                    ? 'scale-95 ring-2 ring-green-400'
                                    : ''} {!hasToken
                                    ? 'bg-amber-500 hover:bg-amber-400'
                                    : 'bg-green-600 hover:bg-green-500'}"
                                onclick={!hasToken ? handleLogin : handleSync}
                                disabled={isSyncing ||
                                    !$cloudConfig.enabled ||
                                    isLoading}
                            >
                                {#if isSyncing || isLoading}
                                    <span
                                        class="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin"
                                    ></span>
                                    {isSyncing ? "SYNCING..." : "CONNECTING..."}
                                {:else if !hasToken}
                                    RECONNECT
                                {:else}
                                    SYNC NOW
                                {/if}
                            </button>
                            <button
                                class="px-3 py-2 border border-red-900/50 text-red-900 hover:text-red-500 hover:border-red-500 rounded transition"
                                onclick={handleLogout}
                                title="Disconnect"
                            >
                                Unlink
                            </button>
                        </div>
                        <div class="pt-4 border-t border-green-900/20">
                            <AISettings />
                        </div>
                        <div class="pt-4 border-t border-green-900/20">
                            <button
                                onclick={() => uiStore.openCategoryManager()}
                                class="w-full py-2 bg-purple-900/20 border border-purple-500/30 text-purple-300 hover:bg-purple-600 hover:text-black rounded text-[10px] font-bold tracking-widest transition-all flex items-center justify-center gap-2"
                                data-testid="manage-categories-button"
                            >
                                <span class="icon-[lucide--tags] w-3 h-3"></span>
                                MANAGE CATEGORIES
                            </button>
                        </div>

                        <div class="pt-2 flex justify-center gap-4 text-[9px] text-gray-700 uppercase tracking-tighter">
                            <a href="{base}/privacy" class="hover:text-green-900 transition-colors">Privacy Policy</a>
                            <span>•</span>
                            <a href="{base}/terms" class="hover:text-green-900 transition-colors">Terms of Service</a>
                        </div>
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