<script lang="ts">
  import type { EpistemicStatus } from "@codex/adventure-engine";
  let { status }: { status: EpistemicStatus } = $props();

  function badgeClass(value: EpistemicStatus): string {
    switch (value) {
      case "explicit":
        return "border-theme-primary/40 bg-theme-primary/10 text-theme-text";
      case "inferred":
        return "border-theme-accent/40 bg-theme-accent/10 text-theme-text";
      case "ambiguous":
      case "unresolved":
        return "border-theme-danger/50 bg-theme-danger/10 text-theme-text";
    }
  }
</script>

<span
  class="rounded-full border px-2 py-0.5 text-xs font-medium {badgeClass(
    status,
  )}"
  aria-label={status}
>
  {status}
</span>
