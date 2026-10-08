<script lang="ts">
  import { soloSessionStore } from "$lib/stores/solo-session-instance";
  import { quickNoteStore } from "$lib/stores/quicknote.svelte";
  import SoloMenu from "./SoloMenu.svelte";
  import SoloSceneField from "./SoloSceneField.svelte";

  const scenes = $derived(soloSessionStore.scenes);
  const currentIndex = $derived(scenes.length - 1);

  function open(sectionId: string | null) {
    quickNoteStore.openJournal(sectionId ? { sectionId } : {});
  }
</script>

<SoloMenu label="Scenes" testId="solo-scene-menu" helpTarget="solo-scene-menu">
  <div class="flex w-72 flex-col gap-2">
    <SoloSceneField />
    {#if scenes.length > 0}
      <ul
        class="flex flex-col gap-1 border-t border-theme-border pt-2"
        role="list"
      >
        {#each scenes as scene, index (index)}
          <li
            class="flex items-center justify-between gap-2 rounded-md px-2 py-1 text-sm"
            data-testid="solo-scene-item"
            aria-current={index === currentIndex ? "true" : undefined}
          >
            <span class="min-w-0 truncate text-theme-text">
              {scene.name}{index === currentIndex ? " · current" : ""}
            </span>
            <span
              class="flex shrink-0 gap-2 text-xs font-bold uppercase tracking-wider"
            >
              <button
                type="button"
                role="menuitem"
                class="text-theme-primary"
                aria-label={`Open ${scene.name} in the journal`}
                onclick={() => open(scene.sectionId)}
              >
                Open
              </button>
              {#if index !== currentIndex}
                <button
                  type="button"
                  role="menuitem"
                  class="text-theme-muted hover:text-theme-primary"
                  aria-label={`Return to scene: ${scene.name}`}
                  onclick={() => void soloSessionStore.returnToScene(index)}
                >
                  Return to scene
                </button>
              {/if}
            </span>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</SoloMenu>
