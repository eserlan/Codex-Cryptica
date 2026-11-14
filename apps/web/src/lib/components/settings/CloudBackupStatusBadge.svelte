<script lang="ts">
  /** The live sync status label beside the Cloud Backup heading. */
  interface Props {
    isOn: boolean;
    isError: boolean;
    text: string;
  }

  let { isOn, isError, text }: Props = $props();
</script>

{#if isOn}
  <span
    class="shrink-0 font-mono text-micro uppercase tracking-wider {isError
      ? 'text-red-400'
      : 'text-theme-text'}"
    aria-live="polite"
  >
    {text}
  </span>
{/if}
