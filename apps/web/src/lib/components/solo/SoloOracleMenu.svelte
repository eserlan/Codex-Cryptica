<script lang="ts">
  import {
    buildOracleShortcutPrompt,
    type OracleShortcut,
  } from "solo-session-engine";
  import { recentResults } from "session-journal-engine";
  import { discoveryPolicyStore } from "$lib/stores/ui/discovery-policy.svelte";
  import { layoutUIStore } from "$lib/stores/ui/layout-ui.svelte";
  import { oracle } from "$lib/stores/oracle.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { sessionJournalStore } from "$lib/stores/session-journal.svelte";
  import { soloSessionStore } from "$lib/stores/solo-session-instance";
  import SoloMenu from "./SoloMenu.svelte";

  const SHORTCUTS: { kind: OracleShortcut; label: string }[] = [
    { kind: "npc-reaction", label: "How does this NPC react?" },
    { kind: "complication", label: "Add a complication" },
    { kind: "place-knowledge", label: "What is known about this place?" },
    { kind: "what-next", label: "What happens next?" },
  ];

  function openOracle() {
    layoutUIStore.activeSidebarTool = "oracle";
  }

  function currentMapName(): string | null {
    const mapId = soloSessionStore.session?.mapId;
    return mapId ? (vault.maps?.[mapId]?.name ?? null) : null;
  }

  function recentContent(): string[] {
    const entries = sessionJournalStore.current?.entries ?? [];
    return recentResults(entries).map((e) => e.content);
  }

  /** Fills the Oracle's input with the question and session context. Sends nothing. */
  function shortcut(kind: OracleShortcut) {
    oracle.ui.setPendingPrompt(
      buildOracleShortcutPrompt(kind, {
        sceneName: soloSessionStore.session?.sceneName ?? "",
        mapName: currentMapName(),
        partyNames: soloSessionStore.party.map((m) => m.name),
        recent: recentContent(),
      }),
    );
    openOracle();
  }
</script>

{#if !discoveryPolicyStore.aiDisabled}
  <SoloMenu
    label="Ask Oracle"
    testId="solo-oracle-menu"
    helpTarget="solo-oracle-menu"
  >
    <ul class="flex w-72 flex-col gap-1" role="menu">
      <li>
        <button
          type="button"
          role="menuitem"
          class="w-full rounded-md px-3 py-1.5 text-left text-sm font-bold text-theme-primary hover:bg-theme-primary/10"
          data-testid="solo-oracle-open"
          onclick={openOracle}
        >
          Open Oracle
        </button>
      </li>
      {#each SHORTCUTS as item (item.kind)}
        <li>
          <button
            type="button"
            role="menuitem"
            class="w-full rounded-md px-3 py-1.5 text-left text-sm text-theme-text hover:bg-theme-primary/10"
            data-testid="solo-oracle-shortcut"
            onclick={() => shortcut(item.kind)}
          >
            {item.label}
          </button>
        </li>
      {/each}
    </ul>
  </SoloMenu>
{/if}
