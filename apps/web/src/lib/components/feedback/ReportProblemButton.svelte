<script lang="ts">
  import { feedbackDialog } from "#lib/stores/ui/feedback-dialog.svelte.js";

  let {
    area = undefined,
    label = "Report a problem",
  }: {
    /** The area the report comes from; see FEEDBACK_AREAS. */
    area?: string;
    label?: string;
  } = $props();
</script>

<button
  type="button"
  class="inline-flex items-center gap-1 text-xs text-theme-link underline-offset-2 hover:underline"
  onclick={() => feedbackDialog.open({ area })}
>
  <span
    class="icon-[lucide--message-square-warning] h-3.5 w-3.5"
    aria-hidden="true"
  ></span>
  {label}
</button>
