<script lang="ts">
  import { PUBLIC_WORLDS_NOTICE } from "$lib/config/public-worlds-notice";

  interface Props {
    fanContent?: boolean;
    customDisclaimer?: string | null;
  }

  let { fanContent = false, customDisclaimer = null }: Props = $props();

  let displayText = $derived.by(() => {
    if (!fanContent) return "";
    const trimmed = customDisclaimer?.trim();
    if (trimmed && trimmed.length > 0) {
      return trimmed.slice(0, 500);
    }
    return PUBLIC_WORLDS_NOTICE.DEFAULT_FAN_CONTENT_DISCLAIMER;
  });
</script>

{#if fanContent}
  <div
    class="my-6 rounded-lg border border-theme-border/60 bg-theme-surface/40 p-4 text-xs text-theme-text/80"
    data-testid="fan-content-disclaimer"
  >
    <div
      class="flex items-center gap-2 font-header font-bold text-theme-text mb-1.5"
    >
      <span class="icon-[lucide--info] h-4 w-4 text-theme-primary"></span>
      <span>Unofficial Fan Content Notice</span>
    </div>
    <p class="leading-relaxed whitespace-pre-wrap">{displayText}</p>
  </div>
{/if}
