<script lang="ts">
  import { base } from "$app/paths";
  import { browser } from "$app/environment";
  import { fade } from "svelte/transition";
  import { themeStore } from "$lib/stores/theme.svelte";

  const cleanBase = base === "/" ? "" : base;

  let { canonicalPath, eyebrow }: { canonicalPath?: string; eyebrow: string } =
    $props();

  // Paths that only make sense in a fantasy context
  const FANTASY_ONLY = new Set([
    "/generators/dnd-npc",
    "/generators/fantasy-names",
    "/generators/magic-item",
    "/generators/kingdom",
    "/generators/pantheon-generator",
    "/generators/god-generator",
    "/generators/tavern",
  ]);

  // Paths specific to the horror/vampire theme
  const HORROR_ONLY = new Set(["/generators/vampire-clan"]);

  const GENERATOR_GROUPS = [
    {
      label: "Characters & Names",
      items: [
        { label: "RPG NPC Generator", path: "/generators/npc" },
        { label: "D&D NPC Generator", path: "/generators/dnd-npc" },
        { label: "Vampire Clan Generator", path: "/generators/vampire-clan" },
        { label: "Nomad Clan Generator", path: "/generators/nomad-clan" },
        { label: "RPG Name Generator", path: "/generators/names" },
        { label: "Fantasy Name Generator", path: "/generators/fantasy-names" },
      ],
    },
    {
      label: "Worldbuilding",
      items: [
        { label: "Faction Generator", path: "/generators/faction" },
        { label: "Settlement Generator", path: "/generators/settlement" },
        {
          label: "Language Profile Generator",
          path: "/generators/language-generator",
        },
        { label: "Kingdom Generator", path: "/generators/kingdom" },
        { label: "Nation Generator", path: "/generators/nation" },
        { label: "Pantheon Generator", path: "/generators/pantheon-generator" },
        { label: "God & Deity Generator", path: "/generators/god-generator" },
      ],
    },
    {
      label: "Adventure",
      items: [
        { label: "Quest Hook Generator", path: "/generators/quest" },
        { label: "Magic Item Generator", path: "/generators/magic-item" },
        { label: "Tavern Generator", path: "/generators/tavern" },
        { label: "Social Hub Generator", path: "/generators/social-hub" },
      ],
    },
  ];

  const visibleGroups = $derived.by(() => {
    const themeId = themeStore.worldThemeId;
    const isFantasy = themeId === "fantasy" || themeId === "workspace";
    const isHorror = themeId === "horror";
    return GENERATOR_GROUPS.map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (isFantasy) return true;
        if (FANTASY_ONLY.has(item.path)) return false;
        if (HORROR_ONLY.has(item.path)) return isHorror;
        return true;
      }),
    })).filter((group) => group.items.length > 0);
  });

  let showGeneratorMenu = $state(false);
  let menuButtonEl = $state<HTMLButtonElement | null>(null);
  let menuEl = $state<HTMLDivElement | null>(null);

  function handleMenuKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") showGeneratorMenu = false;
  }

  function handleOutsideClick(e: MouseEvent) {
    if (
      menuButtonEl &&
      menuEl &&
      !menuButtonEl.contains(e.target as Node) &&
      !menuEl.contains(e.target as Node)
    ) {
      showGeneratorMenu = false;
    }
  }

  $effect(() => {
    if (browser && showGeneratorMenu) {
      document.addEventListener("click", handleOutsideClick);
      document.addEventListener("keydown", handleMenuKeydown);
      return () => {
        document.removeEventListener("click", handleOutsideClick);
        document.removeEventListener("keydown", handleMenuKeydown);
      };
    }
  });
</script>

<div class="relative mb-4">
  <button
    type="button"
    id="generator-switcher-btn"
    bind:this={menuButtonEl}
    onclick={() => (showGeneratorMenu = !showGeneratorMenu)}
    aria-haspopup="true"
    aria-expanded={showGeneratorMenu}
    class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-medium bg-theme-primary/10 border border-theme-primary/20 text-theme-primary hover:bg-theme-primary/20 transition-colors"
  >
    <span class="icon-[lucide--wand-sparkles] w-3.5 h-3.5" aria-hidden="true"
    ></span>
    {eyebrow}
    <span
      class="icon-[lucide--chevron-down] w-3 h-3 transition-transform {showGeneratorMenu
        ? 'rotate-180'
        : ''}"
      aria-hidden="true"
    ></span>
  </button>

  {#if showGeneratorMenu}
    <div
      bind:this={menuEl}
      transition:fade={{ duration: 100 }}
      class="absolute left-0 top-full mt-1.5 z-50 w-64 rounded-xl border border-theme-border/60 bg-theme-surface shadow-xl backdrop-blur-sm overflow-hidden"
      role="menu"
      aria-labelledby="generator-switcher-btn"
    >
      {#each visibleGroups as group (group.label)}
        <div class="px-3 pt-3 pb-1">
          <p
            class="text-[9px] font-bold uppercase tracking-widest text-theme-muted/70 font-header mb-1.5"
          >
            {group.label}
          </p>
          {#each group.items as item (item.path)}
            {@const isCurrent =
              canonicalPath === item.path ||
              canonicalPath?.startsWith(item.path + "/")}
            <a
              href="{cleanBase}{item.path}"
              role="menuitem"
              onclick={() => (showGeneratorMenu = false)}
              class="flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11px] font-medium transition-colors {isCurrent
                ? 'text-theme-primary bg-theme-primary/10'
                : 'text-theme-text/80 hover:bg-theme-surface/80 hover:text-theme-primary'}"
            >
              {#if isCurrent}
                <span
                  class="icon-[lucide--check] w-3 h-3 text-theme-primary shrink-0"
                  aria-hidden="true"
                ></span>
              {:else}
                <span class="w-3 h-3 shrink-0"></span>
              {/if}
              {item.label}
            </a>
          {/each}
        </div>
      {/each}
      <div class="px-3 py-2 mt-1 border-t border-theme-border/40">
        <a
          href="{cleanBase}/generators"
          role="menuitem"
          onclick={() => (showGeneratorMenu = false)}
          class="flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11px] font-medium text-theme-muted hover:text-theme-primary hover:bg-theme-surface/80 transition-colors"
        >
          <span
            class="icon-[lucide--layout-grid] w-3 h-3 shrink-0"
            aria-hidden="true"
          ></span>
          All generators
        </a>
      </div>
    </div>
  {/if}
</div>
