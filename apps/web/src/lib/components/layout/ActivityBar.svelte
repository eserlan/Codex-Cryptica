<script lang="ts">
  import { uiStore } from "$lib/stores/ui.svelte";
  import { themeStore } from "$lib/stores/theme.svelte";
  import { Sparkles, Database, Network, Compass, Layout } from "lucide-svelte";
  import { page } from "$app/state";
  import { base } from "$app/paths";

  interface NavItem {
    id: string;
    icon: any;
    label: string;
    href?: string;
    action?: () => void;
  }

  const views: NavItem[] = [
    {
      id: "graph",
      icon: Network,
      label: "Knowledge Graph",
      href: `${base}/`,
    },
    {
      id: "map",
      icon: Compass,
      label: "World Map",
      href: `${base}/map`,
    },
    {
      id: "canvas",
      icon: Layout,
      label: "Spatial Canvas",
      href: `${base}/canvas`,
    },
  ];

  const tools: NavItem[] = [
    {
      id: "oracle",
      icon: Sparkles,
      label: "Lore Oracle",
      action: () => uiStore.toggleSidebarTool("oracle"),
    },
    {
      id: "explorer",
      icon: Database,
      label: "Entity Explorer",
      action: () => uiStore.toggleSidebarTool("explorer"),
    },
  ];

  const isViewActive = (item: NavItem) => {
    if (!item.href) return false;
    if (item.id === "graph") return page.url.pathname === `${base}/`;
    return page.url.pathname.startsWith(item.href);
  };

  const isFantasyTheme = $derived(themeStore.activeTheme.id === "fantasy");
</script>

<nav
  class="bg-theme-surface border-theme-border flex shrink-0 z-[80]
    flex-row md:flex-col items-center justify-center md:justify-start py-2 md:py-4 gap-2 md:gap-4
    w-full md:w-14 h-14 md:h-full border-t md:border-t-0 md:border-r"
  aria-label="Activity Bar"
  data-testid="activity-bar"
  style:background-image="var(--bg-texture-overlay)"
>
  <!-- Main Views -->
  {#each views as view}
    {@const Icon = view.icon}
    {@const active = isViewActive(view)}
    <a
      href={view.href}
      class="w-10 h-10 flex items-center justify-center rounded-md transition-all duration-200 group relative border {active
        ? isFantasyTheme
          ? 'text-[color:var(--theme-focus)] border-[color:var(--theme-focus-border)] shadow-none'
          : 'bg-theme-primary/10 text-theme-primary border-theme-primary/30 shadow-sm'
        : isFantasyTheme
          ? 'text-[color:var(--theme-icon-default)] border-transparent hover:text-[color:var(--theme-title-ink)]'
          : 'border-transparent text-theme-muted hover:text-theme-text hover:bg-theme-primary/5'}"
      style:background-color={active && isFantasyTheme
        ? "var(--theme-focus-bg)"
        : undefined}
      aria-label={view.label}
      title={view.label}
      data-testid={`activity-bar-${view.id}`}
    >
      <Icon
        class="w-5 h-5 transition-transform duration-200 group-hover:scale-110"
      />

      {#if active}
        <div
          class="absolute md:left-0 md:top-1/2 md:-translate-y-1/2 md:w-1 md:h-6
                 bottom-0 left-1/2 -translate-x-1/2 w-6 h-1
                 bg-theme-primary rounded-t-full md:rounded-r-full md:rounded-t-none"
          style:background-color={isFantasyTheme
            ? "var(--theme-focus)"
            : undefined}
        ></div>
      {/if}
    </a>
  {/each}

  <!-- Separator -->
  <div
    class="w-px h-6 bg-theme-border md:w-8 md:h-px my-1 md:my-2 opacity-50"
  ></div>

  <!-- Sidecar Tools -->
  {#each tools as tool}
    {@const Icon = tool.icon}
    {@const active = uiStore.activeSidebarTool === tool.id}
    <button
      onclick={tool.action}
      class="w-10 h-10 flex items-center justify-center rounded-md transition-all duration-200 group relative border {active
        ? isFantasyTheme
          ? 'text-[color:var(--theme-focus)] border-[color:var(--theme-focus-border)] shadow-none'
          : 'bg-theme-primary/10 text-theme-primary border-theme-primary/30 shadow-sm'
        : isFantasyTheme
          ? 'text-[color:var(--theme-icon-default)] border-transparent hover:text-[color:var(--theme-title-ink)]'
          : 'border-transparent text-theme-muted hover:text-theme-text hover:bg-theme-primary/5'}"
      style:background-color={active && isFantasyTheme
        ? "var(--theme-focus-bg)"
        : undefined}
      aria-label={tool.label}
      title={tool.label}
      data-testid={`activity-bar-${tool.id}`}
    >
      <Icon
        class="w-5 h-5 transition-transform duration-200 group-hover:scale-110"
      />

      {#if active}
        <div
          class="absolute md:left-0 md:top-1/2 md:-translate-y-1/2 md:w-1 md:h-6
                 bottom-0 left-1/2 -translate-x-1/2 w-6 h-1
                 bg-theme-primary rounded-t-full md:rounded-r-full md:rounded-t-none"
          style:background-color={isFantasyTheme
            ? "var(--theme-focus)"
            : undefined}
        ></div>
      {/if}
    </button>
  {/each}
</nav>
