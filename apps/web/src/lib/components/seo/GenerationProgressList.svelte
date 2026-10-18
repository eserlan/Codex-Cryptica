<script lang="ts">
  import type { OneShotProgressStep } from "generator-engine";

  let { steps }: { steps: OneShotProgressStep[] } = $props();

  const ICONS: Record<OneShotProgressStep["status"], string> = {
    done: "icon-[lucide--check] text-theme-primary",
    active: "icon-[lucide--loader-2] animate-spin text-theme-primary",
    pending: "icon-[lucide--circle] text-theme-muted/60",
    fallback: "icon-[lucide--triangle-alert] text-theme-warning",
    skipped: "icon-[lucide--minus] text-theme-muted",
  };

  const NOTES: Partial<Record<OneShotProgressStep["status"], string>> = {
    fallback: "used a template",
    skipped: "skipped",
  };
</script>

<ol class="flex flex-col gap-1.5 text-xs" data-testid="generation-progress">
  {#each steps as step (step.id)}
    <li
      class="flex items-center gap-2"
      class:text-theme-text={step.status === "active"}
      class:font-bold={step.status === "active"}
      class:text-theme-muted={step.status === "pending"}
      aria-current={step.status === "active" ? "step" : undefined}
    >
      <span class="{ICONS[step.status]} h-3.5 w-3.5 shrink-0" aria-hidden="true"
      ></span>
      <span>
        {step.label}{#if step.detail}<span class="text-theme-muted">
            · {step.detail}</span
          >{/if}{#if NOTES[step.status] && !step.detail}<span
            class="text-theme-muted"
          >
            · {NOTES[step.status]}</span
          >{/if}
      </span>
      <span class="sr-only">({step.status})</span>
    </li>
  {/each}
</ol>
