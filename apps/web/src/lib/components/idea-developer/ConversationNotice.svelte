<script lang="ts">
  import { IDEA_DEVELOPER_COPY } from "$lib/content/idea-developer-notice";

  const { notice } = IDEA_DEVELOPER_COPY;
</script>

<div
  class="flex items-start gap-2 rounded-lg border border-theme-border/60 bg-theme-surface/40 p-3 text-xs text-theme-muted"
  data-testid="conversation-notice"
>
  <span
    class="icon-[lucide--info] mt-0.5 h-4 w-4 shrink-0 text-theme-primary"
    aria-hidden="true"
  ></span>
  <div class="flex flex-col gap-1">
    <p class="leading-relaxed">{notice.text}</p>
    <p class="flex flex-wrap gap-x-3">
      <a
        href={notice.privacyHref}
        class="font-bold text-theme-primary underline underline-offset-2"
        >{notice.privacyLabel}</a
      >
      <a
        href={notice.helpHref}
        class="font-bold text-theme-primary underline underline-offset-2"
        >{notice.helpLabel}</a
      >
    </p>
  </div>
</div>
