<script lang="ts">
  import type { Snippet } from "svelte";
  import type { AdventureManager } from "#lib/stores/oracle/adventure-manager.svelte.js";
  import { formatWorldElapsedMinutes } from "@codex/adventure-engine";
  import { batchFilterPromotableFacts } from "#lib/services/adventure/adventure-provisional-fact-creator.js";
  import { extractActiveHeardScenarios } from "#lib/stores/oracle/adventure-scenarios.js";
  import {
    deriveAdventureHeaderStatus,
    derivePhoneToolsSummary,
  } from "./adventure-header-state.js";
  let {
    manager,
    existingTitles,
    phone,
    adventureTitle,
    toolsOpen,
    toolsButton = $bindable(),
    onToggleTools,
    controls,
    fullscreenControl,
    management,
  }: {
    manager: AdventureManager;
    existingTitles: string[];
    phone: boolean;
    adventureTitle: string;
    toolsOpen: boolean;
    toolsButton?: HTMLButtonElement;
    onToggleTools: () => void;
    controls: Snippet<[boolean]>;
    fullscreenControl: Snippet<[boolean]>;
    management: Snippet<[boolean]>;
  } = $props();
  const elapsedLabel = $derived(
    manager.session?.worldTime
      ? formatWorldElapsedMinutes(manager.session.worldTime.elapsedMinutes)
      : null,
  );
  const pendingDiscoveriesCount = $derived(
    batchFilterPromotableFacts(
      manager.session?.provisionalFacts ?? [],
      existingTitles,
      manager.session?.dismissedProvisionalFactIds ?? [],
    ).length,
  );
  const activeSituationsCount = $derived(
    extractActiveHeardScenarios(manager.session).length,
  );
  const headerStatus = $derived(
    deriveAdventureHeaderStatus({
      readOnly: manager.readOnly,
      phase: manager.phase,
      pendingRoll: manager.session?.pendingRoll,
      elapsedLabel,
    }),
  );
  const phoneToolsSummary = $derived(
    derivePhoneToolsSummary({
      discoveriesCount: pendingDiscoveriesCount,
      situationsCount: activeSituationsCount,
      readOnly: manager.readOnly,
    }),
  );
</script>

{#snippet statusLabel()}
  <p
    class={[
      "flex items-center gap-1.5 truncate text-xs font-medium sm:block sm:text-sm sm:font-normal",
      phone && headerStatus.tone === "danger"
        ? "text-theme-text"
        : "text-theme-text",
    ]}
    data-testid="adventure-header-status"
  >
    {#if phone}
      <span
        class={[
          "inline-flex min-w-0 items-center gap-1.5 truncate",
          headerStatus.tone === "primary"
            ? "rounded bg-theme-primary/15 px-1.5 py-0.5 font-semibold"
            : "",
        ]}
      >
        {#if headerStatus.icon}
          <span
            aria-hidden="true"
            class={[
              headerStatus.icon,
              "h-3.5 w-3.5 shrink-0",
              headerStatus.busy
                ? "animate-spin motion-reduce:animate-none"
                : "",
            ]}
          ></span>
        {/if}
        <span class="min-w-0 truncate">{headerStatus.phoneLabel}</span>
      </span>
    {:else}
      {headerStatus.desktopLabel}
      {#if elapsedLabel}
        <span
          class="ml-2 normal-case tracking-normal"
          title="Elapsed fictional time since the adventure began"
        >
          · {elapsedLabel} elapsed
        </span>
      {/if}
    {/if}
  </p>
{/snippet}

<header
  class="flex shrink-0 flex-nowrap items-center justify-between gap-2 border-b border-theme-border bg-theme-surface px-3 py-2 pt-[calc(0.5rem+env(safe-area-inset-top))] sm:flex-wrap sm:gap-3 sm:px-4 sm:py-3"
>
  <div class="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
    <button
      type="button"
      class="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-md border border-theme-text text-theme-text transition hover:bg-theme-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-primary sm:min-h-10 sm:min-w-10"
      onclick={() => void manager.close()}
      title="Leave adventure (saves automatically)"
      aria-label="Leave adventure"
    >
      <span aria-hidden="true" class="icon-[lucide--arrow-left] h-4 w-4"></span>
    </button>
    <div class="min-w-0 flex-1">
      <h2
        id="adventure-heading"
        class="font-header truncate text-base font-bold leading-tight text-theme-text sm:text-lg"
        title={adventureTitle}
        aria-label={adventureTitle}
      >
        {adventureTitle}
      </h2>
      {@render statusLabel()}
    </div>
  </div>
  <div class="flex shrink-0 items-center gap-1 sm:gap-2">
    {#if !phone}
      <div class="hidden sm:contents">
        {@render controls(false)}
      </div>
    {/if}
    <button
      bind:this={toolsButton}
      class="relative flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-md border border-theme-text px-2 text-theme-text transition hover:bg-theme-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-primary sm:min-h-12 sm:px-3"
      type="button"
      aria-label={phone ? phoneToolsSummary.ariaLabel : "Adventure tools"}
      title={phone ? phoneToolsSummary.ariaLabel : "Adventure tools"}
      aria-controls="adventure-utilities"
      aria-expanded={toolsOpen}
      onclick={onToggleTools}
    >
      <span class="inline-flex items-center gap-2">
        <span
          aria-hidden="true"
          class={[
            phone
              ? "icon-[lucide--more-vertical]"
              : "icon-[lucide--panel-right]",
            "h-4 w-4",
          ]}
        ></span>
        <span class="hidden sm:inline">Adventure tools</span>
      </span>
      {#if phone && phoneToolsSummary.badgeText}
        <span
          aria-hidden="true"
          data-testid="adventure-tools-badge"
          class={[
            "pointer-events-none absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-micro font-bold leading-none tabular-nums",
            phoneToolsSummary.badgeTone === "danger"
              ? "border border-theme-border-interactive bg-theme-surface text-theme-text"
              : "bg-theme-primary text-theme-on-primary",
          ]}
        >
          {phoneToolsSummary.badgeText}
        </span>
      {:else if phone && phoneToolsSummary.badgeTone === "danger"}
        <span
          aria-hidden="true"
          data-testid="adventure-tools-urgent-dot"
          class="pointer-events-none absolute right-1 top-1 h-2 w-2 rounded-full border border-theme-text bg-theme-danger"
        ></span>
      {/if}
    </button>
    {#if !phone}
      <div class="hidden sm:contents">
        {@render fullscreenControl(false)}
        {@render management(false)}
      </div>
    {/if}
  </div>
  {#if phone}
    <div
      class="sr-only"
      aria-live="polite"
      aria-atomic="true"
      data-testid="adventure-phone-live-status"
    >
      {phoneToolsSummary.liveAnnouncement}
    </div>
  {/if}
</header>
