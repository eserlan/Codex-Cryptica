<script lang="ts">
  import type { Component } from "svelte";
  import { feedbackDialog } from "$lib/stores/ui/feedback-dialog.svelte";

  // The dialog's code is loaded the first time anyone opens it, so the app's
  // first paint does not pay for it.
  let Dialog = $state<Component<{ store: typeof feedbackDialog }> | null>(null);

  $effect(() => {
    if (feedbackDialog.isOpen && Dialog === null) {
      void import("./FeedbackDialog.svelte").then((module) => {
        Dialog = module.default;
      });
    }
  });
</script>

{#if Dialog}
  <Dialog store={feedbackDialog} />
{/if}
