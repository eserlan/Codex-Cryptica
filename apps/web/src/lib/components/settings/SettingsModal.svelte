<script lang="ts">
  import type { SettingsTab } from "$lib/stores/ui/modal-ui.svelte";
  import { fly, fade } from "svelte/transition";
  import AISettings from "./AISettings.svelte";
  import EraEditor from "../timeline/EraEditor.svelte";
  import ThemeSelector from "./ThemeSelector.svelte";
  import CategorySettings from "./CategorySettings.svelte";
  import LabelSettings from "./LabelSettings.svelte";
  import HelpTab from "../help/HelpTab.svelte";
  import VaultSettings from "./VaultSettings.svelte";
  import PublishingSettings from "./PublishingSettings.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { base } from "$app/paths";
  import { VERSION, CODENAME } from "$lib/config";
  import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
  import { focusTrap } from "$lib/actions/focusTrap";
  import { notificationStore } from "$lib/stores/ui/notification.svelte";
  import { connectionModeStore } from "$lib/stores/ui/connection-mode.svelte";
  import { discoveryPolicyStore } from "$lib/stores/ui/discovery-policy.svelte";
  import { onboardingStore } from "$lib/stores/ui/onboarding.svelte";
  import { openImportWindow } from "$lib/stores/ui/navigation";

  const tabs: { id: SettingsTab; label: string; icon: string }[] = [
    { id: "vault", label: "Vault", icon: "icon-[lucide--database]" },
    {
      id: "intelligence",
      label: "AI",
      icon: "icon-[lucide--brain]",
    },
    { id: "schema", label: "Schema", icon: "icon-[lucide--tags]" },
    {
      id: "theme",
      label: "Theme",
      icon: "icon-[lucide--palette]",
    },
    {
      id: "publishing",
      label: "Publishing",
      icon: "icon-[lucide--share-2]",
    },
    { id: "help", label: "Help", icon: "icon-[lucide--help-circle]" },
    { id: "about", label: "About", icon: "icon-[lucide--info]" },
  ];

  const close = async () => {
    if (modalUIStore.isImporting) {
      if (
        await notificationStore.confirm({
          title: "Confirm Change",
          message:
            "An import is in progress or pending review. Closing now will cancel the process and you may lose identified entities. Are you sure you want to abort?",
          confirmLabel: "Abort",
          isDangerous: false,
        })
      ) {
        connectionModeStore.abortActiveOperations();
        modalUIStore.closeSettings();
      }
      return;
    }
    modalUIStore.closeSettings();
  };

  // Focus management (initial focus, Tab cycling, restore-on-close) is
  // handled by the shared focusTrap action on the dialog element.
  const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === "Escape") close();
  };
</script>

{#if modalUIStore.showSettings}
  <!-- Backdrop -->
  <button
    type="button"
    aria-label="Dismiss Settings Backdrop"
    class="fixed inset-0 w-full h-full bg-black/80 z-[100] backdrop-blur-sm focus-visible:ring-2 focus-visible:ring-inset focus:outline-none cursor-default"
    onclick={close}
    onkeydown={(e) => e.key === "Escape" && close()}
    onpointerdown={(e) => e.preventDefault()}
    transition:fade
  ></button>

  <div
    use:focusTrap
    class="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-6xl h-[90vh] bg-chrome-bg border border-chrome-border shadow-2xl rounded-lg overflow-hidden flex z-[101] font-body"
    role="dialog"
    aria-modal="true"
    aria-labelledby="settings-heading"
    tabindex="-1"
    onkeydown={handleKeydown}
    transition:fly={{ y: 20, duration: 300 }}
    data-testid="settings-modal"
  >
    <!-- Sidebar Navigation -->
    <div
      class="w-16 md:w-48 bg-chrome-surface border-r border-chrome-border flex flex-col pt-6"
      role="tablist"
      aria-label="Settings Categories"
    >
      <div class="px-6 mb-8 hidden md:block">
        <span
          class="text-[11px] font-header text-chrome-muted uppercase tracking-[0.3em]"
          >Configuration</span
        >
      </div>

      <div class="flex flex-col gap-1">
        {#each tabs as tab}
          <button
            onclick={() => (modalUIStore.activeSettingsTab = tab.id)}
            disabled={modalUIStore.isImporting}
            aria-disabled={modalUIStore.isImporting ? "true" : "false"}
            title={modalUIStore.isImporting
              ? "Navigation disabled during active import"
              : ""}
            role="tab"
            aria-selected={modalUIStore.activeSettingsTab === tab.id}
            aria-controls="settings-panel-{tab.id}"
            id="settings-tab-{tab.id}"
            class="px-4 md:px-6 py-3 flex items-center gap-3 transition-all relative {modalUIStore.activeSettingsTab ===
            tab.id
              ? 'text-chrome-accent bg-chrome-accent/10'
              : 'text-chrome-muted hover:text-chrome-text hover:bg-chrome-muted/10'} {modalUIStore.isImporting
              ? 'opacity-50 cursor-not-allowed pointer-events-none'
              : ''}"
          >
            <span class="{tab.icon} w-5 h-5"></span>
            <span
              class="text-sm font-bold uppercase font-header tracking-wider hidden md:block"
              >{tab.label}</span
            >

            {#if modalUIStore.activeSettingsTab === tab.id}
              <div
                class="absolute left-0 top-0 bottom-0 w-1 bg-chrome-accent shadow-[0_0_10px_var(--chrome-accent)]"
              ></div>
            {/if}
          </button>
        {/each}
      </div>

      <div
        class="mt-auto p-4 md:p-6 text-[10px] font-header text-chrome-muted/40 uppercase hidden md:block"
      >
        Version {VERSION} // Build {CODENAME}
      </div>
    </div>

    <!-- Content Area -->
    <div class="flex-1 flex flex-col min-w-0 bg-chrome-bg">
      <!-- Header -->
      <div
        class="px-8 py-6 flex justify-between items-center border-b border-chrome-border"
      >
        <h2
          id="settings-heading"
          class="text-lg font-bold text-chrome-text uppercase font-header tracking-widest flex items-center gap-3"
        >
          <span
            class="{tabs.find((t) => t.id === modalUIStore.activeSettingsTab)
              ?.icon} text-chrome-accent opacity-50"
          ></span>
          {tabs.find((t) => t.id === modalUIStore.activeSettingsTab)?.label}
        </h2>
        <button
          type="button"
          onclick={close}
          aria-disabled={modalUIStore.isImporting ? "true" : "false"}
          title={modalUIStore.isImporting
            ? "Import in progress"
            : "Close Settings"}
          class="text-chrome-muted hover:text-chrome-text transition-colors {modalUIStore.isImporting
            ? 'opacity-30 cursor-not-allowed'
            : ''}"
          aria-label="Close Settings"
        >
          <span aria-hidden="true" class="icon-[lucide--x] w-6 h-6"></span>
        </button>
      </div>

      <!-- Body -->
      <div class="flex-1 overflow-y-auto p-8 custom-scrollbar">
        {#if modalUIStore.activeSettingsTab === "vault"}
          <div
            role="tabpanel"
            id="settings-panel-vault"
            aria-labelledby="settings-tab-vault"
            class="space-y-6 max-w-3xl mx-auto"
          >
            <section>
              <h3
                class="text-sm font-bold text-chrome-accent uppercase font-header mb-3 tracking-widest"
              >
                Active Archive
              </h3>
              <div
                class="bg-chrome-surface border border-chrome-border p-4 rounded font-body"
              >
                <div
                  class="text-[11px] text-chrome-muted uppercase mb-1 font-header"
                >
                  Status
                </div>
                <div class="text-sm text-chrome-text mb-4">
                  {vault.isInitialized
                    ? "Connected to Local Archive (OPFS)"
                    : "No Vault Active"}
                </div>

                <div
                  class="text-[11px] text-chrome-muted uppercase mb-1 font-header"
                >
                  Entity Count
                </div>
                <div class="text-sm text-chrome-text">
                  {vault.allEntities.length} tracked entities
                </div>
              </div>
            </section>

            <section class="border-t border-chrome-border pt-6">
              <VaultSettings />
            </section>

            <section class="border-t border-chrome-border pt-6">
              <h3
                class="text-sm font-bold text-chrome-accent uppercase font-header mb-3 tracking-widest"
              >
                Archive Importer
              </h3>
              <p class="text-sm text-chrome-text/70 leading-relaxed mb-6">
                Import existing documents, lore bibles, or JSON data via the
                dedicated importer. This allows for continuous imports without
                interrupting your current session.
              </p>
              <button
                onclick={() => openImportWindow()}
                class="w-full py-4 border border-chrome-accent/50 text-chrome-accent font-bold uppercase font-header tracking-[0.2em] text-xs rounded-lg hover:bg-chrome-accent/10 transition-all active:scale-95 flex items-center justify-center gap-2 group"
              >
                <span
                  class="icon-[lucide--folder-input] w-4 h-4 transition-transform group-hover:-translate-y-1"
                ></span>
                Launch Dedicated Importer
              </button>
            </section>
          </div>
        {:else if modalUIStore.activeSettingsTab === "intelligence"}
          <div
            role="tabpanel"
            id="settings-panel-intelligence"
            aria-labelledby="settings-tab-intelligence"
            class="space-y-8 max-w-3xl mx-auto"
          >
            <section>
              <div
                class="bg-chrome-surface border border-chrome-border p-6 rounded-lg mb-8 flex items-center justify-between shadow-sm"
              >
                <div>
                  <label
                    class="block text-sm font-bold text-chrome-text uppercase font-header cursor-pointer"
                    for="ai-disabled-toggle">AI Disabled</label
                  >
                  <p class="text-[11px] text-chrome-muted">
                    Disable all AI-powered features (Oracle chat, image
                    generation, tag suggestions).
                  </p>
                </div>
                <input
                  id="ai-disabled-toggle"
                  type="checkbox"
                  checked={discoveryPolicyStore.aiDisabled}
                  onchange={(e) =>
                    discoveryPolicyStore.toggleAiDisabled(
                      e.currentTarget.checked,
                    )}
                  class="w-4 h-4 accent-chrome-accent cursor-pointer"
                />
              </div>

              <div
                class="transition-all duration-300 {discoveryPolicyStore.aiDisabled
                  ? 'opacity-40 grayscale pointer-events-none select-none'
                  : ''}"
              >
                <p class="text-sm text-chrome-text/70 leading-relaxed">
                  Manage AI integration settings. Codex Cryptica uses Google
                  Gemini to provide context-aware reasoning, automated tagging,
                  and image generation.
                </p>
                <AISettings />
              </div>
            </section>

            <section>
              <h3
                class="text-sm font-bold text-chrome-accent uppercase font-header mb-3 tracking-widest"
              >
                World Eras
              </h3>
              <p class="text-sm text-chrome-text/70 leading-relaxed mb-4">
                Define chronological boundaries for your world's history. These
                will be visualized on the timeline graph.
              </p>
              <EraEditor />
            </section>
          </div>
        {:else if modalUIStore.activeSettingsTab === "schema"}
          <div
            role="tabpanel"
            id="settings-panel-schema"
            aria-labelledby="settings-tab-schema"
            class="space-y-6 max-w-3xl mx-auto"
          >
            <p class="text-sm text-chrome-text/70 leading-relaxed">
              Define the ontology of your world. Custom categories allow you to
              color-code nodes and group entities by their role in your
              narrative.
            </p>
            <div
              class="bg-chrome-surface border border-chrome-border p-6 rounded"
            >
              <CategorySettings />
            </div>

            <h3
              class="text-sm font-bold text-chrome-accent uppercase font-header mt-8 mb-3 tracking-widest"
            >
              Campaign Labels
            </h3>
            <p class="text-sm text-chrome-text/70 mb-4 leading-relaxed">
              Manage the custom labels used across your entities. Renaming a
              label here will update all labeled files project-wide.
            </p>
            <LabelSettings />
          </div>
        {:else if modalUIStore.activeSettingsTab === "theme"}
          <div
            role="tabpanel"
            id="settings-panel-theme"
            aria-labelledby="settings-tab-theme"
            class="space-y-10 max-w-3xl mx-auto"
          >
            <section>
              <h3
                class="text-sm font-bold text-chrome-accent uppercase font-header tracking-widest mb-4"
              >
                Interface Configuration
              </h3>
              <div
                class="bg-chrome-bg/50 border border-chrome-border p-6 rounded-lg space-y-6"
              >
                <div class="flex items-center justify-between pb-4">
                  <div>
                    <label
                      class="block text-sm font-bold text-chrome-text uppercase font-header cursor-pointer"
                      for="skip-welcome-screen-toggle"
                      >Skip Welcome Screen</label
                    >
                    <p class="text-[11px] text-chrome-muted">
                      Hide the marketing landing page on startup even when no
                      vault is initialized.
                    </p>
                  </div>
                  <input
                    id="skip-welcome-screen-toggle"
                    type="checkbox"
                    checked={onboardingStore.skipWelcomeScreen}
                    onchange={(e) =>
                      onboardingStore.toggleWelcomeScreen(
                        e.currentTarget.checked,
                      )}
                    class="w-4 h-4 accent-chrome-accent cursor-pointer"
                  />
                </div>
              </div>
            </section>

            <section>
              <p class="text-sm text-chrome-text/70 leading-relaxed">
                Shift the visual dimension of your workspace. Themes redefine
                the interface aesthetic to match your world's genre.
              </p>
              <ThemeSelector />
            </section>
          </div>
        {:else if modalUIStore.activeSettingsTab === "publishing"}
          <div
            role="tabpanel"
            id="settings-panel-publishing"
            aria-labelledby="settings-tab-publishing"
            class="space-y-6 max-w-3xl mx-auto font-body"
          >
            <PublishingSettings />
          </div>
        {:else if modalUIStore.activeSettingsTab === "help"}
          <div
            role="tabpanel"
            id="settings-panel-help"
            aria-labelledby="settings-tab-help"
            class="space-y-6 max-w-3xl mx-auto"
          >
            <p class="text-sm text-chrome-text/70 leading-relaxed">
              Access system documentation and interactive guides to master the
              art of lore management.
            </p>
            <HelpTab />
          </div>
        {:else if modalUIStore.activeSettingsTab === "about"}
          <div
            role="tabpanel"
            id="settings-panel-about"
            aria-labelledby="settings-tab-about"
            class="space-y-8 max-w-3xl mx-auto"
          >
            <section>
              <h3
                class="text-sm font-bold text-chrome-accent uppercase font-header mb-4 tracking-widest border-b border-chrome-border pb-2"
              >
                Manifest
              </h3>
              <div class="grid grid-cols-2 gap-4 font-body text-[11px]">
                <div>
                  <div class="text-chrome-muted uppercase mb-1 font-header">
                    Software
                  </div>
                  <div class="text-chrome-text">Codex Cryptica</div>
                </div>
                <div>
                  <div class="text-chrome-muted uppercase mb-1 font-header">
                    Version
                  </div>
                  <div class="text-chrome-text">{VERSION}</div>
                </div>
                <div>
                  <div class="text-chrome-muted uppercase mb-1 font-header">
                    Codename
                  </div>
                  <div class="text-chrome-text">
                    {CODENAME}
                  </div>
                </div>
                <div>
                  <div class="text-chrome-muted uppercase mb-1 font-header">
                    Architecture
                  </div>
                  <div class="text-chrome-text">Local-First / Svelte 5</div>
                </div>
                <div>
                  <div class="text-chrome-muted uppercase mb-1 font-header">
                    License
                  </div>
                  <div class="text-chrome-text">
                    Polyform Noncommercial License 1.0.0
                  </div>
                </div>
              </div>

              <div class="mt-6">
                <button
                  onclick={() => (onboardingStore.showChangelog = true)}
                  data-testid="show-changelog-button"
                  class="w-full p-4 bg-chrome-accent/10 border border-chrome-accent/30 hover:border-chrome-accent text-chrome-accent transition-all rounded group flex items-center justify-between"
                >
                  <div class="flex items-center gap-3">
                    <span class="icon-[lucide--sparkles] w-5 h-5"></span>
                    <span
                      class="text-sm font-bold uppercase font-header tracking-widest"
                      >What's New in Codex</span
                    >
                  </div>
                  <span
                    class="icon-[lucide--chevron-right] w-4 h-4 group-hover:translate-x-1 transition-transform"
                  ></span>
                </button>

                <a
                  href="{base}/changelog"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="mt-3 flex items-center justify-between p-4 bg-chrome-surface border border-chrome-border hover:border-chrome-accent transition-all rounded group"
                >
                  <div class="flex items-center gap-3">
                    <span
                      class="icon-[lucide--history] w-5 h-5 text-chrome-muted group-hover:text-chrome-accent transition-colors"
                    ></span>
                    <span
                      class="text-sm font-bold uppercase font-header tracking-widest text-chrome-muted group-hover:text-chrome-text transition-colors"
                      >Full Chronology</span
                    >
                  </div>
                  <span
                    class="icon-[lucide--external-link] w-4 h-4 text-chrome-muted group-hover:text-chrome-accent group-hover:translate-x-1 transition-all"
                  ></span>
                </a>
              </div>
            </section>

            <section>
              <h3
                class="text-sm font-bold text-chrome-accent uppercase font-header mb-4 tracking-widest border-b border-chrome-border pb-2"
              >
                Legal Compliance
              </h3>
              <div class="flex flex-col gap-3">
                <a
                  href="{base}/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="flex items-center justify-between p-3 bg-chrome-surface border border-chrome-border hover:border-chrome-accent transition-all rounded group"
                >
                  <span
                    class="text-sm text-chrome-text uppercase tracking-widest font-bold font-header"
                    >Privacy Policy</span
                  >
                  <span
                    class="icon-[lucide--external-link] w-4 h-4 text-chrome-muted group-hover:text-chrome-accent"
                  ></span>
                </a>
                <a
                  href="{base}/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="flex items-center justify-between p-3 bg-chrome-surface border border-chrome-border hover:border-chrome-accent transition-all rounded group"
                >
                  <span
                    class="text-sm text-chrome-text uppercase tracking-widest font-bold font-header"
                    >Terms of Service</span
                  >
                  <span
                    class="icon-[lucide--external-link] w-4 h-4 text-chrome-muted group-hover:text-chrome-accent"
                  ></span>
                </a>
              </div>
            </section>

            <section class="pt-4 text-center">
              <div
                class="text-[10px] font-header text-chrome-muted/40 uppercase tracking-[0.5em] mb-2"
              >
                Secure Connection Protocol Active
              </div>
              <div
                class="text-[8px] font-header text-chrome-muted/20 uppercase"
              >
                No telemetry detected // User privacy prioritized
              </div>
            </section>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}
