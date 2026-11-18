<script lang="ts">
  import type { PackageAuditEntry } from "@codex/adventure-engine";

  let { entries }: { entries: PackageAuditEntry[] } = $props();

  const tag = "rounded border border-theme-border px-1 text-xs";
</script>

{#if entries.length === 0}
  <p class="text-sm text-theme-text">
    No package records have been touched yet.
  </p>
{:else}
  <ul class="space-y-3">
    {#each entries as entry (entry.recordId)}
      <li class="space-y-1 text-sm break-words">
        <p class="font-semibold text-theme-text">{entry.label}</p>
        <p class="text-xs text-theme-text">
          {entry.kind} · {entry.visibility} · {entry.status}
        </p>
        <ul class="space-y-1 pl-3">
          {#each entry.events as event (event.id)}
            <li class="text-theme-text">
              <span>{event.from} → {event.to}</span>
              <span class={tag}
                >{event.certainty === "claimed" ? "Claimed" : "Confirmed"}</span
              >
              {#if event.supersededBy}
                <span class={tag}>Superseded</span>
              {/if}
              <span class="block text-theme-text">{event.note}</span>
            </li>
          {/each}
        </ul>
      </li>
    {/each}
  </ul>
{/if}
