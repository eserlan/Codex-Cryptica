<script lang="ts">
  import EntityActionMenu from "./EntityActionMenu.svelte";
  import type { EntityAction } from "./entity-actions.svelte.js";

  // Compact (phones): only Edit and Copy link stay on the bar, as icons; the
  // other primary actions move to the top of the More menu.
  let {
    actions,
    compact = false,
  }: { actions: EntityAction[]; compact?: boolean } = $props();

  const keepsOnBar = (a: EntityAction) =>
    a.placement === "primary" &&
    (!compact || a.id === "edit" || a.id === "copy-link");
  const primary = $derived(actions.filter(keepsOnBar));
  const menu = $derived(actions.filter((a) => !keepsOnBar(a)));
</script>

<div
  class="flex min-w-0 items-center justify-end gap-1 {compact
    ? ''
    : 'flex-wrap'}"
>
  {#each primary as action (action.id)}
    <button
      type="button"
      onclick={() => void action.run()}
      disabled={action.disabled}
      aria-label={action.ariaLabel ?? action.label}
      aria-busy={action.state === "busy" ? "true" : "false"}
      title={action.label}
      data-testid={action.testId}
      data-help-target={action.helpTarget}
      class="touch-target flex items-center justify-center gap-1.5 rounded px-2 py-1 text-sm transition hover:bg-theme-primary/10 hover:text-theme-primary focus-visible:outline-2 focus-visible:outline-theme-primary disabled:opacity-50 text-theme-text"
    >
      <span aria-hidden="true" class="{action.icon} h-5 w-5 shrink-0"></span>
      <span
        class={compact
          ? "sr-only"
          : action.id === "edit"
            ? ""
            : "@max-[300px]:hidden"}>{action.label}</span
      >
    </button>
  {/each}
  <EntityActionMenu items={menu} {compact} />
</div>
