<script lang="ts">
  /** Shown when another device updated the backup and automatic sync is paused. */
  interface Props {
    conflict: boolean;
    message: string | null;
    onkeep: () => void;
  }

  let { conflict, message, onkeep }: Props = $props();
</script>

{#if conflict}
  <div class="border border-red-400/40 p-3">
    <p class="text-sm text-red-400" role="alert">
      {message ??
        "Another device updated this backup. Automatic sync is paused so nothing is overwritten — both versions are preserved."}
    </p>
    <p class="mt-1 text-sm text-theme-text">
      Keep editing safely: nothing will upload until you choose. To see the
      cloud version, restore it into a new vault from the recovery key below.
    </p>
    <button
      type="button"
      onclick={onkeep}
      class="mt-2 bg-theme-primary px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-theme-on-primary transition-colors hover:bg-theme-primary/90"
    >
      Keep my version
    </button>
  </div>
{/if}
