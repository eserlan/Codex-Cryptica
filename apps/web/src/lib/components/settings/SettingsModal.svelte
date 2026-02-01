<script lang="ts">
    import { uiStore, type SettingsTab } from "$stores/ui.svelte";
    import { fly, fade } from "svelte/transition";
    import CloudStatus from "./CloudStatus.svelte";
    import AISettings from "./AISettings.svelte";
    import EraEditor from "../timeline/EraEditor.svelte";
    import ThemeSelector from "./ThemeSelector.svelte";
    import CategorySettings from "./CategorySettings.svelte";
    import HelpTab from "../help/HelpTab.svelte";
    import { vault } from "$lib/stores/vault.svelte";
    import { base } from "$app/paths";
    import { VERSION, CODENAME } from "$lib/config";

    const tabs: { id: SettingsTab; label: string; icon: string }[] = [
        { id: "vault", label: "Vault", icon: "icon-[lucide--database]" },
        { id: "sync", label: "Cloud Sync", icon: "icon-[lucide--refresh-cw]" },
        {
            id: "intelligence",
            label: "Intelligence",
            icon: "icon-[lucide--brain]",
        },
        { id: "schema", label: "Schema", icon: "icon-[lucide--tags]" },
        {
            id: "aesthetics",
            label: "Aesthetics",
            icon: "icon-[lucide--palette]",
        },
        { id: "help", label: "Help", icon: "icon-[lucide--help-circle]" },
        { id: "about", label: "About", icon: "icon-[lucide--info]" },
    ];

    const close = () => uiStore.closeSettings();

    let previousActiveElement: HTMLElement | null = null;
    let modalElement: HTMLElement | undefined = $state();

    $effect(() => {
        if (uiStore.showSettings) {
            previousActiveElement = document.activeElement as HTMLElement;
            // Focus the first tab button after a short delay to allow for transition
            setTimeout(() => {
                const firstTab = modalElement?.querySelector(
                    '[role="tab"]',
                ) as HTMLElement;
                firstTab?.focus();
            }, 100);
        } else if (previousActiveElement) {
            previousActiveElement.focus();
            previousActiveElement = null;
        }
    });

    const handleKeydown = (e: KeyboardEvent) => {
        if (e.key === "Escape") close();
        if (e.key === "Tab") {
            if (!modalElement) return;
            const focusables = modalElement.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
            );
            const first = focusables[0] as HTMLElement;
            const last = focusables[focusables.length - 1] as HTMLElement;

            if (e.shiftKey && document.activeElement === first) {
                last.focus();
                e.preventDefault();
            } else if (!e.shiftKey && document.activeElement === last) {
                first.focus();
                e.preventDefault();
            }
        }
    };
</script>

{#if uiStore.showSettings}
    <!-- Backdrop -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
        class="fixed inset-0 bg-black/80 z-[100] backdrop-blur-sm"
        onclick={close}
        onkeydown={(e) => e.key === "Escape" && close()}
        role="presentation"
        transition:fade
    ></div>

    <div
        bind:this={modalElement}
        class="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] md:w-[800px] h-[80vh] bg-theme-bg border border-theme-border shadow-2xl rounded-lg overflow-hidden flex z-[101]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-heading"
        tabindex="-1"
        onkeydown={handleKeydown}
        transition:fly={{ y: 20, duration: 300 }}
    >
        <!-- Sidebar Navigation -->
        <div
            class="w-16 md:w-48 bg-theme-surface border-r border-theme-border flex flex-col pt-6"
            role="tablist"
            aria-label="Settings Categories"
        >
            <div class="px-6 mb-8 hidden md:block">
                <span
                    class="text-[10px] font-mono text-theme-muted uppercase tracking-[0.3em]"
                    >Configuration</span
                >
            </div>

            <div class="flex flex-col gap-1">
                {#each tabs as tab}
                    <button
                        onclick={() => (uiStore.activeSettingsTab = tab.id)}
                        role="tab"
                        aria-selected={uiStore.activeSettingsTab === tab.id}
                        aria-controls="settings-panel-{tab.id}"
                        id="settings-tab-{tab.id}"
                        class="px-4 md:px-6 py-3 flex items-center gap-3 transition-all relative {uiStore.activeSettingsTab ===
                        tab.id
                            ? 'text-theme-primary bg-theme-primary/10'
                            : 'text-theme-secondary hover:text-theme-primary hover:bg-theme-secondary/5'}"
                    >
                        <span class="{tab.icon} w-5 h-5"></span>
                        <span
                            class="text-xs font-bold uppercase tracking-wider hidden md:block"
                            >{tab.label}</span
                        >

                        {#if uiStore.activeSettingsTab === tab.id}
                            <div
                                class="absolute left-0 top-0 bottom-0 w-1 bg-theme-primary shadow-[0_0_10px_var(--color-accent-primary)]"
                            ></div>
                        {/if}
                    </button>
                {/each}
            </div>

            <div
                class="mt-auto p-4 md:p-6 text-[9px] font-mono text-theme-muted/40 uppercase hidden md:block"
            >
                Version {VERSION} // Build {CODENAME}
            </div>
        </div>

        <!-- Content Area -->
        <div class="flex-1 flex flex-col min-w-0 bg-theme-bg">
            <!-- Header -->
            <div
                class="px-8 py-6 flex justify-between items-center border-b border-theme-border"
            >
                <h2
                    id="settings-heading"
                    class="text-lg font-bold text-theme-text uppercase tracking-widest flex items-center gap-3"
                >
                    <span
                        class="{tabs.find(
                            (t) => t.id === uiStore.activeSettingsTab,
                        )?.icon} text-theme-primary opacity-50"
                    ></span>
                    {tabs.find((t) => t.id === uiStore.activeSettingsTab)
                        ?.label}
                </h2>
                <button
                    onclick={close}
                    class="text-theme-muted hover:text-theme-primary transition-colors"
                    aria-label="Close Settings"
                >
                    <span class="icon-[lucide--x] w-6 h-6"></span>
                </button>
            </div>

            <!-- Body -->
            <div class="flex-1 overflow-y-auto p-8 custom-scrollbar">
                {#if uiStore.activeSettingsTab === "vault"}
                    <div
                        role="tabpanel"
                        id="settings-panel-vault"
                        aria-labelledby="settings-tab-vault"
                        class="space-y-6"
                    >
                        <section>
                            <h3
                                class="text-xs font-bold text-theme-primary uppercase mb-3 tracking-widest"
                            >
                                Active Archive
                            </h3>
                            <div
                                class="bg-theme-surface border border-theme-border p-4 rounded font-mono"
                            >
                                <div
                                    class="text-[10px] text-theme-muted uppercase mb-1"
                                >
                                    Status
                                </div>
                                <div class="text-xs text-theme-text mb-4">
                                    {vault.rootHandle
                                        ? "Connected to Local File System"
                                        : "No Vault Active"}
                                </div>

                                <div
                                    class="text-[10px] text-theme-muted uppercase mb-1"
                                >
                                    Entity Count
                                </div>
                                <div class="text-xs text-theme-text">
                                    {vault.allEntities.length} tracked entities
                                </div>
                            </div>
                        </section>

                        <section>
                            <h3
                                class="text-xs font-bold text-theme-primary uppercase mb-3 tracking-widest"
                            >
                                Maintenance
                            </h3>
                            <p
                                class="text-[13px] text-theme-text/70 mb-4 leading-relaxed"
                            >
                                If your search results or graph connections seem
                                out of sync with your local files, you can force
                                a full re-index of your archive.
                            </p>
                            <button
                                onclick={() => vault.rebuildIndex()}
                                class="px-6 py-2 bg-theme-primary/10 border border-theme-primary/30 text-theme-primary hover:bg-theme-primary hover:text-black transition-all text-[10px] font-bold tracking-widest uppercase"
                            >
                                Rebuild Search Index
                            </button>
                        </section>
                    </div>
                {:else if uiStore.activeSettingsTab === "sync"}
                    <div
                        role="tabpanel"
                        id="settings-panel-sync"
                        aria-labelledby="settings-tab-sync"
                        class="space-y-6"
                    >
                        <p
                            class="text-[13px] text-theme-text/70 leading-relaxed"
                        >
                            Configure synchronization with external cloud
                            storage. This allows you to mirror your local-first
                            archives to Google Drive for multi-device access and
                            backup.
                        </p>
                        <div
                            class="bg-theme-surface border border-theme-border p-6 rounded"
                        >
                            <CloudStatus embedMode={true} />
                        </div>
                    </div>
                {:else if uiStore.activeSettingsTab === "intelligence"}
                    <div
                        role="tabpanel"
                        id="settings-panel-intelligence"
                        aria-labelledby="settings-tab-intelligence"
                        class="space-y-8"
                    >
                        <section>
                            <p
                                class="text-[13px] text-theme-text/70 leading-relaxed"
                            >
                                Manage AI integration settings. Codex Cryptica
                                uses Google Gemini to provide context-aware
                                reasoning, automated tagging, and image
                                generation.
                            </p>
                            <AISettings />
                        </section>

                        <section>
                            <h3
                                class="text-xs font-bold text-theme-primary uppercase mb-3 tracking-widest"
                            >
                                World Eras
                            </h3>
                            <p
                                class="text-[13px] text-theme-text/70 leading-relaxed mb-4"
                            >
                                Define chronological boundaries for your world's
                                history. These will be visualized on the
                                timeline graph.
                            </p>
                            <EraEditor />
                        </section>
                    </div>
                {:else if uiStore.activeSettingsTab === "schema"}
                    <div
                        role="tabpanel"
                        id="settings-panel-schema"
                        aria-labelledby="settings-tab-schema"
                        class="space-y-6"
                    >
                        <p
                            class="text-[13px] text-theme-text/70 leading-relaxed"
                        >
                            Define the ontology of your world. Custom categories
                            allow you to color-code nodes and group entities by
                            their role in your narrative.
                        </p>
                        <div
                            class="bg-theme-surface border border-theme-border p-6 rounded"
                        >
                            <CategorySettings />
                        </div>
                    </div>
                {:else if uiStore.activeSettingsTab === "aesthetics"}
                    <div
                        role="tabpanel"
                        id="settings-panel-aesthetics"
                        aria-labelledby="settings-tab-aesthetics"
                        class="space-y-6"
                    >
                        <p
                            class="text-[13px] text-theme-text/70 leading-relaxed"
                        >
                            Shift the visual dimension of your workspace. Zen
                            Templates redefine the interface aesthetic to match
                            your world's genre.
                        </p>
                        <ThemeSelector />
                    </div>
                {:else if uiStore.activeSettingsTab === "help"}
                    <div
                        role="tabpanel"
                        id="settings-panel-help"
                        aria-labelledby="settings-tab-help"
                        class="space-y-6"
                    >
                        <p
                            class="text-[13px] text-theme-text/70 leading-relaxed"
                        >
                            Access system documentation and interactive guides
                            to master the art of lore management.
                        </p>
                        <HelpTab />
                    </div>
                {:else if uiStore.activeSettingsTab === "about"}
                    <div
                        role="tabpanel"
                        id="settings-panel-about"
                        aria-labelledby="settings-tab-about"
                        class="space-y-8"
                    >
                        <section>
                            <h3
                                class="text-xs font-bold text-theme-primary uppercase mb-4 tracking-widest border-b border-theme-border pb-2"
                            >
                                Manifest
                            </h3>
                            <div
                                class="grid grid-cols-2 gap-4 font-mono text-[10px]"
                            >
                                <div>
                                    <div
                                        class="text-theme-muted uppercase mb-1"
                                    >
                                        Software
                                    </div>
                                    <div class="text-theme-text">
                                        Codex Cryptica
                                    </div>
                                </div>
                                <div>
                                    <div
                                        class="text-theme-muted uppercase mb-1"
                                    >
                                        Codename
                                    </div>
                                    <div class="text-theme-text">
                                        {CODENAME}
                                    </div>
                                </div>
                                <div>
                                    <div
                                        class="text-theme-muted uppercase mb-1"
                                    >
                                        Architecture
                                    </div>
                                    <div class="text-theme-text">
                                        Local-First / Svelte 5
                                    </div>
                                </div>
                                <div>
                                    <div
                                        class="text-theme-muted uppercase mb-1"
                                    >
                                        License
                                    </div>
                                    <div class="text-theme-text">MIT</div>
                                </div>
                            </div>
                        </section>

                        <section>
                            <h3
                                class="text-xs font-bold text-theme-primary uppercase mb-4 tracking-widest border-b border-theme-border pb-2"
                            >
                                Legal Compliance
                            </h3>
                            <div class="flex flex-col gap-3">
                                <a
                                    href="{base}/privacy"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    class="flex items-center justify-between p-3 bg-theme-surface border border-theme-border hover:border-theme-primary transition-all rounded group"
                                >
                                    <span
                                        class="text-xs text-theme-text uppercase tracking-widest font-bold"
                                        >Privacy Policy</span
                                    >
                                    <span
                                        class="icon-[lucide--external-link] w-4 h-4 text-theme-muted group-hover:text-theme-primary"
                                    ></span>
                                </a>
                                <a
                                    href="{base}/terms"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    class="flex items-center justify-between p-3 bg-theme-surface border border-theme-border hover:border-theme-primary transition-all rounded group"
                                >
                                    <span
                                        class="text-xs text-theme-text uppercase tracking-widest font-bold"
                                        >Terms of Service</span
                                    >
                                    <span
                                        class="icon-[lucide--external-link] w-4 h-4 text-theme-muted group-hover:text-theme-primary"
                                    ></span>
                                </a>
                            </div>
                        </section>

                        <section class="pt-4 text-center">
                            <div
                                class="text-[10px] font-mono text-theme-muted/40 uppercase tracking-[0.5em] mb-2"
                            >
                                Secure Connection Protocol Active
                            </div>
                            <div
                                class="text-[8px] font-mono text-theme-muted/20 uppercase"
                            >
                                No telemetry detected // User privacy
                                prioritized
                            </div>
                        </section>
                    </div>
                {/if}
            </div>
        </div>
    </div>
{/if}

<style>
    .custom-scrollbar::-webkit-scrollbar {
        width: 4px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
        background: transparent;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
        background: var(--color-accent-primary);
        border-radius: 2px;
    }
</style>
