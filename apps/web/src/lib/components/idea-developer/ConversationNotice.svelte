<script lang="ts">
  import { IDEA_DEVELOPER_COPY } from "$lib/content/idea-developer-notice";

  const { notice } = IDEA_DEVELOPER_COPY;
</script>

<div
  class="border-t border-theme-border/40 pt-5 text-base sm:text-sm text-theme-muted"
  data-testid="conversation-notice"
>
  <p class="leading-relaxed">{notice.text}</p>
  <p class="mt-2 flex flex-wrap gap-x-4 gap-y-1">
    <a
      href={notice.privacyHref}
      class="inline-flex min-h-6 items-center font-bold text-theme-primary underline underline-offset-2"
      >{notice.privacyLabel}</a
    >
    <a
      href={notice.helpHref}
      class="inline-flex min-h-6 items-center font-bold text-theme-primary underline underline-offset-2"
      >{notice.helpLabel}</a
    >
  </p>
</div>
