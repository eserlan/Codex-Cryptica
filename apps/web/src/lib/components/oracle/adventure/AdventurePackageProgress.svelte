<script lang="ts">
  import { projectPlayerPackageProgress } from "@codex/adventure-engine";
  import type { AdventureManager } from "#lib/stores/oracle/adventure-manager.svelte.js";
  import { trackSourcePackage } from "./adventure-source-package.svelte.js";

  let { manager }: { manager: AdventureManager } = $props();

  const source = trackSourcePackage(() => manager);

  type Item = { id: string; title?: string; text: string };
  const groups = $derived.by((): { label: string; items: Item[] }[] | null => {
    const pkg = source.current;
    if (!pkg || !manager.session?.sourcePackage) return null;
    const view = projectPlayerPackageProgress(
      pkg,
      manager.session.packageProgress,
    );
    const asItem = (scene: { id: string; title: string; summary: string }) => ({
      id: scene.id,
      title: scene.title,
      text: scene.summary,
    });
    return [
      {
        label: "Current scene",
        items: view.currentScene ? [asItem(view.currentScene)] : [],
      },
      { label: "Scenes visited", items: view.visitedScenes.map(asItem) },
      { label: "Clues found", items: view.foundClues },
    ].filter((group) => group.items.length > 0);
  });
</script>

{#if groups}
  <section
    class="space-y-3 rounded-lg border border-theme-border p-4"
    aria-labelledby="adventure-package-progress-heading"
    data-testid="adventure-package-progress"
  >
    <h3
      id="adventure-package-progress-heading"
      class="font-header font-semibold text-theme-primary"
    >
      Package progress
    </h3>
    {#each groups as group (group.label)}
      <div class="space-y-1">
        <h4 class="text-xs font-semibold text-theme-secondary uppercase">
          {group.label}
        </h4>
        <ul class="space-y-2">
          {#each group.items as item (item.id)}
            <li class="text-sm break-words">
              {#if item.title}
                <span class="block font-semibold text-theme-primary"
                  >{item.title}</span
                >
              {/if}
              <span class="block text-theme-secondary">{item.text}</span>
            </li>
          {/each}
        </ul>
      </div>
    {:else}
      <p class="text-sm text-theme-secondary">Nothing discovered yet.</p>
    {/each}
  </section>
{/if}
