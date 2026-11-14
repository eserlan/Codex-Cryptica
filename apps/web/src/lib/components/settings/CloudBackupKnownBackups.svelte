<script lang="ts">
  /** Backups this device already holds the recovery key for; pick one to fill the restore key. */
  import type { KnownCloudBackup } from "@codex/cloud-backup-sync";

  interface Props {
    backups: KnownCloudBackup[];
    label: (backup: KnownCloudBackup) => string;
    savedAt: (iso: string | null) => string;
    onpick: (recoveryKey: string) => void;
  }

  let { backups, label, savedAt, onpick }: Props = $props();
</script>

{#if backups.length > 0}
  <div class="flex flex-col gap-2">
    <p class="text-sm text-theme-text">
      Backups this device already has the key to:
    </p>
    <ul class="flex flex-col gap-1">
      {#each backups as backup (backup.backupId)}
        <li>
          <button
            type="button"
            onclick={() => onpick(backup.recoveryKey)}
            class="flex w-full items-baseline justify-between gap-3 border border-theme-border px-3 py-2 text-left transition-colors hover:border-theme-primary/40"
          >
            <span class="text-sm text-theme-text">{label(backup)}</span>
            <span class="font-mono text-micro uppercase text-theme-text">
              {savedAt(backup.lastPushedAt)}
            </span>
          </button>
        </li>
      {/each}
    </ul>
  </div>
{/if}
