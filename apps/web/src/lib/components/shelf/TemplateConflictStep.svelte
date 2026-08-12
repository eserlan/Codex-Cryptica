<script lang="ts">
  import type { TemplateDecision } from "@codex/entity-shelf";

  let {
    conflicts,
    onChoose,
  }: {
    conflicts: TemplateDecision[];
    onChoose: (
      templateId: string,
      choice: "keep-existing" | "bring-in",
    ) => void;
  } = $props();
</script>

<!--
  Every conflict is settled here, before anything is written — each template
  once, however many of the imported entities depend on it. Deciding up front
  is also what keeps a dialog out of the write phase: a prompt left open by a
  closed tab would strand a half-finished import behind it.
-->
<div class="space-y-4" data-testid="template-conflict-step">
  <p class="text-sm text-theme-text-muted">
    This vault already has a stat sheet template under the same name, with
    different contents. Choose which to use — nothing is written until you
    decide.
  </p>

  {#each conflicts as conflict (conflict.templateId)}
    <div class="border border-theme-border rounded-lg p-3 space-y-3">
      <p class="text-sm text-theme-text font-medium">{conflict.templateName}</p>

      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          class="px-3 py-1.5 text-xs uppercase tracking-widest border border-theme-border rounded hover:border-theme-primary hover:text-theme-primary transition-colors"
          onclick={() => onChoose(conflict.templateId, "keep-existing")}
        >
          Keep this vault’s
        </button>
        <button
          type="button"
          class="px-3 py-1.5 text-xs uppercase tracking-widest border border-theme-border rounded hover:border-theme-primary hover:text-theme-primary transition-colors"
          onclick={() => onChoose(conflict.templateId, "bring-in")}
        >
          Bring the shelved one across
        </button>
      </div>

      <p class="text-[11px] text-theme-text-muted">
        Bringing the shelved one across adds it alongside the existing template
        rather than replacing it, so nothing you already have is lost.
      </p>
    </div>
  {/each}
</div>
