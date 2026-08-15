<script lang="ts">
  import type {
    AdventureArchiveEntry,
    AdventureSessionRepository,
  } from "$lib/services/adventure/adventure-session-repository";
  import { onMount } from "svelte";
  import AdventureTranscript from "./AdventureTranscript.svelte";
  import {
    createPlayerTranscript,
    type AdventureSession,
  } from "@codex/adventure-engine";
  let {
    repository,
    vaultId,
  }: { repository: AdventureSessionRepository; vaultId: string } = $props();
  let entries = $state<AdventureArchiveEntry[]>([]);
  let selected = $state<string | null>(null);
  let selectedSession = $state<AdventureSession | null>(null);
  async function refresh() {
    entries = (await repository.list(vaultId)).entries;
  }
  async function open(id: string) {
    selected = id;
    const loaded = await repository.load(vaultId, id);
    selectedSession = loaded.condition === "unreadable" ? null : loaded.session;
  }
  onMount(() => {
    void refresh();
  });
</script>

<section class="space-y-3" aria-labelledby="adventure-archive-heading">
  <h2
    id="adventure-archive-heading"
    class="text-lg font-semibold text-theme-primary"
  >
    Adventure archive
  </h2>
  {#if entries.length === 0}<p class="text-sm text-theme-secondary">
      No archived adventures yet.
    </p>{:else}<ul class="space-y-2">
      {#each entries as entry (entry.id)}<li>
          <button
            class="flex min-h-12 w-full items-center justify-between rounded-md border border-theme-border px-3 text-left text-theme-primary"
            type="button"
            onclick={() => void open(entry.id)}
            ><span>{entry.title}</span><span
              class="text-xs text-theme-secondary"
              >{entry.loadCondition === "unreadable"
                ? "Unreadable"
                : entry.status}</span
            ></button
          >
        </li>{/each}
    </ul>{/if}
  {#if selected}<p class="text-sm text-theme-secondary">
      This transcript is read-only. Resume and edit controls are unavailable.
    </p>{/if}
  {#if selectedSession}<AdventureTranscript
      transcript={createPlayerTranscript(selectedSession)}
    />{/if}
</section>
