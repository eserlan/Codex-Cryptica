<script lang="ts">
  import { feedbackDialog } from "#lib/stores/ui/feedback-dialog.svelte.js";

  let {
    mode,
    area,
    phase,
    errorCode,
    isRetrying = false,
    diagnosticSummary,
    onRetry,
    onReload,
    secondaryHref,
    secondaryLabel,
  }: {
    mode: "vault-stalled" | "vault-failed" | "chunk-failed";
    area: "graph" | "tables";
    phase?: string;
    errorCode?: string;
    isRetrying?: boolean;
    diagnosticSummary?: string;
    onRetry: () => void;
    onReload?: () => void;
    secondaryHref?: string;
    secondaryLabel?: string;
  } = $props();

  const heading = $derived.by(() => {
    switch (mode) {
      case "vault-stalled":
        return "Opening your vault is taking longer than expected";
      case "vault-failed":
        return "We couldn't finish opening your vault";
      case "chunk-failed":
        return "We couldn't load the graph view";
    }
  });

  const detail = $derived.by(() => {
    if (mode === "chunk-failed") {
      if (errorCode === "offline") {
        return "Your browser appears to be offline, so this view module couldn't be downloaded right now.";
      }
      if (errorCode === "version_skew") {
        return "A newer version of Codex Cryptica may have been deployed while this tab was open. Reloading the page usually resolves it.";
      }
      return "A required view file failed to load. You can retry loading it, reload the page, or open Entity Table.";
    }

    if (errorCode === "quota_exceeded") {
      return "Your browser reported that local storage space is full while opening this vault.";
    }
    if (errorCode === "storage_denied") {
      return "Your browser blocked access to local storage for this site.";
    }
    if (errorCode === "vault_handle_missing") {
      return "The browser couldn't open the local vault storage handle.";
    }
    if (mode === "vault-stalled") {
      return "Startup is still waiting on local browser storage. Retrying will safely re-check without interrupting any background save or migration.";
    }
    return "An unexpected storage error prevented the vault from loading.";
  });

  const iconClass = $derived(
    mode === "vault-stalled"
      ? "icon-[lucide--clock-alert] text-theme-primary"
      : "icon-[lucide--alert-triangle] text-theme-danger",
  );

  function handleReload() {
    if (onReload) {
      onReload();
    } else if (typeof window !== "undefined") {
      window.location.reload();
    }
  }

  function handleReport() {
    feedbackDialog.open({
      kind: "problem",
      area,
      description: diagnosticSummary ?? "",
    });
  }
</script>

<div
  role="alert"
  data-testid="vault-startup-recovery"
  data-recovery-mode={mode}
  class="w-full max-w-lg rounded-xl border border-theme-border bg-theme-surface p-6 text-left shadow-xl"
>
  <div class="flex items-start gap-3">
    <span class="{iconClass} mt-0.5 h-6 w-6 shrink-0" aria-hidden="true"></span>
    <div class="min-w-0 flex-1 space-y-2">
      <h2 class="font-header text-lg font-bold text-theme-text">
        {heading}
      </h2>
      <p class="font-body text-sm leading-relaxed text-theme-text">
        {detail}
      </p>
      <p class="font-body text-xs leading-relaxed text-theme-text">
        Your local vault files have not been modified or removed.
      </p>

      {#if phase || errorCode}
        <p
          class="font-mono text-xs text-theme-text"
          data-testid="vault-recovery-meta"
        >
          {#if phase}Phase: {phase}{/if}
          {#if phase && errorCode}
            ·
          {/if}
          {#if errorCode}Code: {errorCode}{/if}
        </p>
      {/if}
    </div>
  </div>

  <div class="mt-5 flex flex-wrap items-center gap-2.5">
    <button
      type="button"
      onclick={onRetry}
      disabled={isRetrying}
      data-testid="vault-recovery-retry"
      class="inline-flex items-center gap-1.5 rounded-xl border border-theme-primary bg-theme-primary px-4 py-2 font-body text-sm font-bold text-theme-on-primary transition-all hover:brightness-110 disabled:cursor-not-allowed"
    >
      <span
        class="icon-[lucide--refresh-cw] h-4 w-4 {isRetrying
          ? 'animate-spin motion-reduce:animate-none'
          : ''}"
        aria-hidden="true"
      ></span>
      {isRetrying ? "Retrying…" : "Retry"}
    </button>

    <button
      type="button"
      onclick={handleReload}
      data-testid="vault-recovery-reload"
      class="inline-flex items-center gap-1.5 rounded-xl border border-theme-text/75 bg-theme-bg/50 px-4 py-2 font-body text-sm font-bold text-theme-text transition-all hover:border-theme-primary hover:bg-theme-bg"
    >
      <span class="icon-[lucide--rotate-cw] h-4 w-4" aria-hidden="true"></span>
      Reload page
    </button>

    {#if secondaryHref && secondaryLabel}
      <a
        href={secondaryHref}
        data-testid="vault-recovery-secondary"
        class="inline-flex items-center gap-1.5 rounded-xl border border-theme-text/75 bg-theme-bg/50 px-4 py-2 font-body text-sm font-bold text-theme-text transition-all hover:border-theme-primary hover:bg-theme-bg"
      >
        <span class="icon-[lucide--table] h-4 w-4" aria-hidden="true"></span>
        {secondaryLabel}
      </a>
    {/if}

    <button
      type="button"
      onclick={handleReport}
      data-testid="vault-recovery-report"
      class="ml-auto inline-flex items-center gap-1.5 font-body text-xs text-theme-link underline-offset-2 hover:underline"
    >
      <span
        class="icon-[lucide--message-square-warning] h-3.5 w-3.5"
        aria-hidden="true"
      ></span>
      Report a problem
    </button>
  </div>
</div>
