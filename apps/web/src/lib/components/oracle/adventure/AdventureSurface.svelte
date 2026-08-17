<script lang="ts">
  import { oracle } from "$lib/stores/oracle.svelte";
  import AdventureStart from "./AdventureStart.svelte";
  import AdventurePlay from "./AdventurePlay.svelte";
  import AdventureRollPrompt from "./AdventureRollPrompt.svelte";
  import AdventureStateSummary from "./AdventureStateSummary.svelte";
  import AdventureArchive from "./AdventureArchive.svelte";
  import AdventureProvisionalFacts from "./AdventureProvisionalFacts.svelte";
  import { adventureContextService } from "$lib/services/adventure/adventure-context-service";
  import { adventureSessionRepository } from "$lib/services/adventure/adventure-session-repository";
  import { createAdventureEntityDraft } from "$lib/services/adventure/adventure-provisional-fact-creator";
  import { notificationStore } from "$lib/stores/ui/notification.svelte";
  import type { ProvisionalFact } from "@codex/adventure-engine";

  let vaultId = $derived(oracle.vault.activeVaultId ?? "default");
  let restoringActiveAdventure = $state(true);
  let activeRestoreRequest = 0;
  let existingEntityTitles = $derived(
    oracle.vault.allEntities.map((entity) => entity.title),
  );
  adventureSessionRepository.setRootResolver(async (id) => {
    const handle = await oracle.vault.getSpecificVaultHandle(id);
    if (!handle) throw new Error("vault-not-open");
    return handle;
  });
  adventureContextService.setResolver({
    async getById(vaultId, recordId) {
      if (oracle.vault.activeVaultId !== vaultId) return null;
      await oracle.vault.loadEntityContent(recordId);
      const entity = oracle.vault.entities[recordId];
      if (!entity) return null;
      return {
        id: entity.id,
        title: entity.title,
        type: entity.type,
        text: entity.content,
        lore: entity.lore || undefined,
      };
    },
    async search(vaultId, query, limit) {
      if (oracle.vault.activeVaultId !== vaultId || !query.trim()) return [];
      const services = await oracle.vault.serviceRegistry.ensureInitialized();
      const matches = await services.search.search(query, { limit });
      const records = await Promise.all(
        matches.map(async (match) => {
          await oracle.vault.loadEntityContent(match.id);
          const entity = oracle.vault.entities[match.id];
          if (!entity) return null;
          return {
            id: entity.id,
            title: entity.title,
            type: entity.type,
            text: entity.content,
            lore: entity.lore || undefined,
          };
        }),
      );
      return records.filter((record): record is NonNullable<typeof record> =>
        Boolean(record?.text.trim()),
      );
    },
  });

  async function addProvisionalFact(fact: ProvisionalFact): Promise<void> {
    const session = oracle.adventure.session;
    if (!session) throw new Error("No active adventure.");
    const draft = createAdventureEntityDraft(fact, session.title);
    if (!draft) throw new Error("This discovery is not available to save.");
    const existing = oracle.vault.allEntities.find(
      (entity) =>
        entity.title.trim().toLocaleLowerCase() ===
        draft.title.toLocaleLowerCase(),
    );
    if (existing) {
      notificationStore.notify(`${draft.title} is already in Codex.`, "info");
      return;
    }
    await oracle.vault.createEntity(draft.type, draft.title, draft.initialData);
    notificationStore.notify(`Added ${draft.title} to Codex.`, "success");
  }

  $effect(() => {
    const currentVaultId = vaultId;
    const request = ++activeRestoreRequest;
    restoringActiveAdventure = true;
    void oracle.adventure
      .openActive(currentVaultId)
      .catch((error) => {
        notificationStore.notify(
          error instanceof Error
            ? `Unable to open active adventure: ${error.message}`
            : "Unable to open the active adventure.",
          "error",
        );
      })
      .finally(() => {
        if (request === activeRestoreRequest) restoringActiveAdventure = false;
      });
  });
</script>

<div class="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
  {#if restoringActiveAdventure}
    <div
      class="flex items-center gap-2 rounded-md border border-theme-border px-3 py-2 text-sm text-theme-secondary"
      role="status"
      aria-live="polite"
    >
      <span
        aria-hidden="true"
        class="icon-[lucide--loader-2] h-4 w-4 animate-spin"
      ></span>
      Checking for an active adventure…
    </div>
  {:else if oracle.adventure.session}
    <AdventureStateSummary manager={oracle.adventure} />
    <AdventurePlay manager={oracle.adventure} />
    <AdventureRollPrompt manager={oracle.adventure} />
    <AdventureProvisionalFacts
      facts={oracle.adventure.session.provisionalFacts}
      existingTitles={existingEntityTitles}
      onAdd={addProvisionalFact}
    />
  {:else}
    <AdventureStart manager={oracle.adventure} {vaultId} />
  {/if}
  <AdventureArchive
    repository={adventureSessionRepository}
    {vaultId}
    onResume={(sessionId) => oracle.adventure.open(vaultId, sessionId)}
  />
</div>
