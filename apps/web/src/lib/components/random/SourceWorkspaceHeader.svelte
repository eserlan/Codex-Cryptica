<script lang="ts">
  /* eslint-disable svelte/no-useless-mustaches -- Class expressions retain the inline contrast-review notes for inherited styles. */
  import { basePath } from "#lib/utils/base-path.js";
  import type { SourceMode } from "./source-workspace";
  let {
    kind,
    heading,
    mode,
    saving,
    onMode,
  }: {
    kind: "table" | "deck";
    heading: string;
    mode: SourceMode;
    saving: boolean;
    onMode: (mode: SourceMode) => void;
  } = $props();
  const MODES = [
    { id: "use", label: "Use", icon: "icon-[lucide--dices]" },
    { id: "build", label: "Build", icon: "icon-[lucide--pencil]" },
  ] as const;

  /** Both toggles share one shape so the header reads as one control strip. */
  const toggleClass = (current: boolean) =>
    `flex items-center rounded px-2 py-1 font-header text-micro font-bold uppercase tracking-wider transition-colors ${
      current
        ? "bg-theme-primary/15 text-theme-primary"
        : "text-theme-muted hover:text-theme-text"
    }`;

  /**
   * The two kinds share one Activity Bar slot, so switching between them
   * happens here instead. Plain links rather than local state: each kind keeps
   * its own URL, so a deck is still something you can bookmark and link to.
   */
  const KINDS = [
    {
      id: "table",
      label: "Tables",
      href: "/tables",
      icon: "icon-[lucide--list-tree]",
    },
    {
      id: "deck",
      label: "Decks",
      href: "/decks",
      icon: "icon-[lucide--layers]",
    },
  ] as const;
</script>

<header
  class="flex shrink-0 items-center justify-between gap-2 border-b border-theme-border bg-theme-surface px-3 py-2"
>
  <h1 class="sr-only">{heading}</h1>

  <!-- Both toggles on one row: on a phone this bar is pure chrome, and two
         rows of it push the thing you came for below the fold. -->
  <div class="flex min-w-0 items-center gap-1.5">
    <nav
      class="flex shrink-0 items-center gap-0.5 rounded-md border border-theme-border bg-theme-bg p-0.5"
      aria-label="Random source kind"
    >
      {#each KINDS as option}
        {@const current = option.id === kind}
        <a
          href="{basePath()}{option.href}"
          aria-current={current ? "page" : undefined}
          class="{toggleClass(current)} gap-1"
          data-testid="source-kind-{option.id}"
        >
          <span aria-hidden="true" class="{option.icon} h-3.5 w-3.5"></span>
          {option.label}
        </a>
      {/each}
    </nav>

    <nav
      class="flex shrink-0 items-center gap-0.5 rounded-md border border-theme-border bg-theme-bg p-0.5"
      aria-label="Workspace mode"
    >
      {#each MODES as option}
        {@const current = option.id === mode}
        <button
          type="button"
          aria-pressed={current}
          onclick={() => onMode(option.id)}
          class="{toggleClass(current)} gap-1"
          data-testid="source-mode-{option.id}"
        >
          <span aria-hidden="true" class="{option.icon} h-3.5 w-3.5"></span>
          {option.label}
        </button>
      {/each}
    </nav>
  </div>

  {#if saving}
    <span
      class={// ui-check-ignore: Existing SourceWorkspace colours preserved during decomposition; contrast repair is separate work.
      "shrink-0 font-mono text-nano uppercase tracking-widest text-theme-muted/60"}
      data-testid="workspace-saving">Saving…</span
    >
  {/if}
</header>
