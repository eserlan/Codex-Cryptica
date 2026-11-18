<script lang="ts">
  import { tick } from "svelte";
  import { projectPackageProgressAudit } from "@codex/adventure-engine";
  import type { AdventureManager } from "#lib/stores/oracle/adventure-manager.svelte.js";
  import AdventurePackageAuditList from "./AdventurePackageAuditList.svelte";
  import { trackSourcePackage } from "./adventure-source-package.svelte.js";

  let { manager }: { manager: AdventureManager } = $props();

  type Mode = "hidden" | "warning" | "revealed";
  let mode = $state<Mode>("hidden");
  let warning = $state<HTMLElement>();
  let showButton = $state<HTMLButtonElement>();
  const source = trackSourcePackage(() => manager);

  $effect(() => {
    void manager.session?.id;
    void manager.session?.sourcePackage?.hash;
    mode = "hidden";
  });

  const audit = $derived(
    mode === "revealed" && source.current
      ? projectPackageProgressAudit(
          source.current,
          manager.session?.packageProgress,
        )
      : [],
  );

  async function askToReveal() {
    mode = "warning";
    await tick();
    warning?.focus();
  }

  async function cancel() {
    mode = "hidden";
    await tick();
    showButton?.focus();
  }
</script>

{#if manager.session?.sourcePackage && source.current}
  <section
    class="space-y-3 rounded-lg border border-theme-border p-4"
    aria-labelledby="adventure-package-audit-heading"
    data-testid="adventure-package-audit"
  >
    <h3
      id="adventure-package-audit-heading"
      class="font-header font-semibold text-theme-text"
    >
      GM details
    </h3>
    {#if mode === "hidden"}
      <button
        bind:this={showButton}
        type="button"
        class="flex items-center gap-2 rounded border border-theme-border px-3 py-2 text-sm text-theme-text hover:bg-theme-surface focus-visible:ring-2 focus-visible:ring-theme-primary focus-visible:outline-none"
        aria-expanded="false"
        onclick={askToReveal}
      >
        <span class="icon-[lucide--eye] h-4 w-4" aria-hidden="true"></span>
        Show GM details
      </button>
    {:else if mode === "warning"}
      <div
        bind:this={warning}
        role="alert"
        tabindex="-1"
        class="space-y-3 rounded border border-theme-border p-3 focus-visible:ring-2 focus-visible:ring-theme-primary focus-visible:outline-none"
      >
        <p class="text-sm break-words text-theme-text">
          Spoiler warning: this reveals GM-only package content, including
          secrets and everything the ledger has recorded.
        </p>
        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            class="rounded border border-theme-border px-3 py-2 text-sm text-theme-text hover:bg-theme-surface focus-visible:ring-2 focus-visible:ring-theme-primary focus-visible:outline-none"
            onclick={() => (mode = "revealed")}
          >
            Reveal GM details
          </button>
          <button
            type="button"
            class="rounded border border-theme-border px-3 py-2 text-sm text-theme-text hover:bg-theme-surface focus-visible:ring-2 focus-visible:ring-theme-primary focus-visible:outline-none"
            onclick={cancel}
          >
            Cancel
          </button>
        </div>
      </div>
    {:else}
      <button
        type="button"
        class="flex items-center gap-2 rounded border border-theme-border px-3 py-2 text-sm text-theme-text hover:bg-theme-surface focus-visible:ring-2 focus-visible:ring-theme-primary focus-visible:outline-none"
        aria-expanded="true"
        onclick={() => (mode = "hidden")}
      >
        <span class="icon-[lucide--eye-off] h-4 w-4" aria-hidden="true"></span>
        Hide GM details
      </button>
      <AdventurePackageAuditList entries={audit} />
    {/if}
  </section>
{/if}
