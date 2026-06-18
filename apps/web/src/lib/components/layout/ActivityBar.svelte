<script lang="ts">
  import { vault } from "$lib/stores/vault.svelte";
  import { quickNoteStore } from "$lib/stores/quicknote.svelte";
  import { page } from "$app/state";
  import { base } from "$app/paths";
  import { layoutUIStore } from "$lib/stores/ui/layout-ui.svelte";
  import { discoveryPolicyStore } from "$lib/stores/ui/discovery-policy.svelte";

  interface NavItem {
    id: string;
    icon: string;
    label: string;
    /** Optional richer hover tooltip; falls back to `label` when unset. */
    title?: string;
    href?: string;
    action?: () => void;
  }

  const views: NavItem[] = [
    {
      id: "graph",
      icon: "icon-[lucide--network]",
      label: "Graph",
      title: "Knowledge Graph",
      href: `${base}/`,
    },
    {
      id: "map",
      icon: "icon-[lucide--compass]",
      label: "Map",
      title: "World Map",
      href: `${base}/map`,
    },
    {
      id: "canvas",
      icon: "icon-[lucide--layout]",
      label: "Canvas",
      title: "Spatial Canvas",
      href: `${base}/canvas`,
    },
    {
      id: "timeline",
      icon: "icon-[lucide--calendar-days]",
      label: "Timeline",
      title: "World Chronology",
      href: `${base}/timeline`,
    },
  ];

  const tools = $derived.by<NavItem[]>(() => {
    const list: NavItem[] = [
      {
        id: "oracle",
        icon: "icon-[lucide--sparkles]",
        label: "Oracle",
        title:
          "Lore Oracle — optional AI assist. Ask for summaries, plot hooks, and connections when you choose. AI is an assistive layer, never required.",
        action: () => layoutUIStore.toggleSidebarTool("oracle"),
      },
      {
        id: "explorer",
        icon: "icon-[lucide--database]",
        label: "Entities",
        title: "Entity Explorer",
        action: () => layoutUIStore.toggleSidebarTool("explorer"),
      },
      {
        id: "quicknote",
        icon: "icon-[lucide--zap]",
        label: "Notes",
        title: "QuickNote Scratchpad",
        action: () => quickNoteStore.toggle(),
      },
    ];

    if (vault.isGuest || !discoveryPolicyStore.aiDisabled) {
      list.push({
        id: "guest-chat",
        icon: "icon-[lucide--messages-square]",
        label: "Chat",
        title: "Guest Chat — speak with enabled characters in-character.",
        action: () => {
          if (layoutUIStore.mainViewMode === "guest-chat") {
            layoutUIStore.mainViewMode = "visualization";
          } else {
            layoutUIStore.mainViewMode = "guest-chat";
            layoutUIStore.leftSidebarOpen = false;
          }
        },
      });
    }

    return list;
  });

  const isViewActive = (item: NavItem) => {
    if (!item.href) return false;
    if (item.id === "graph") return page.url.pathname === `${base}/`;
    return page.url.pathname.startsWith(item.href);
  };
</script>

<nav
  class="bg-chrome-surface border-chrome-border flex shrink-0 z-[80]
    flex-row md:flex-col items-center justify-center md:justify-start py-2 md:py-4 gap-2 md:gap-4
    w-full md:w-14 h-14 md:h-full border-t md:border-t-0 md:border-r"
  aria-label="Activity Bar"
  data-testid="activity-bar"
>
  <!-- Main Views -->
  {#each views as view}
    {@const active = isViewActive(view)}
    <a
      href={view.href}
      class="w-10 h-10 flex items-center justify-center rounded-md transition-all duration-200 group relative border {active
        ? 'bg-chrome-accent/10 text-chrome-accent border-chrome-accent/30 shadow-sm'
        : 'border-transparent text-chrome-muted hover:text-chrome-text hover:bg-chrome-muted/10'}"
      aria-label={view.label}
      title={view.title ?? view.label}
      data-testid={`activity-bar-${view.id}`}
    >
      <span
        class="{view.icon} w-5 h-5 transition-transform duration-200 group-hover:scale-110"
        aria-hidden="true"
      ></span>

      {#if active}
        <div
          class="absolute md:left-0 md:top-1/2 md:-translate-y-1/2 md:w-1 md:h-6
                 bottom-0 left-1/2 -translate-x-1/2 w-6 h-1
                 bg-chrome-accent rounded-t-full md:rounded-r-full md:rounded-t-none"
        ></div>
      {/if}
    </a>
  {/each}

  <!-- Separator -->
  <div
    class="w-px h-6 bg-chrome-border md:w-8 md:h-px my-1 md:my-2 opacity-50"
  ></div>

  <!-- Sidecar Tools -->
  {#each tools as tool}
    {@const active =
      tool.id === "guest-chat"
        ? layoutUIStore.mainViewMode === "guest-chat"
        : layoutUIStore.activeSidebarTool === tool.id}
    <button
      onclick={tool.action}
      class="w-10 h-10 flex items-center justify-center rounded-md transition-all duration-200 group relative border {active
        ? 'bg-chrome-accent/10 text-chrome-accent border-chrome-accent/30 shadow-sm'
        : 'border-transparent text-chrome-muted hover:text-chrome-text hover:bg-chrome-muted/10'}"
      aria-label={tool.label}
      title={tool.title ?? tool.label}
      data-testid={`activity-bar-${tool.id}`}
    >
      <span
        class="{tool.icon} w-5 h-5 transition-transform duration-200 group-hover:scale-110"
        aria-hidden="true"
      ></span>

      {#if tool.id === "quicknote" && quickNoteStore.count > 0}
        <span
          class="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-bold text-chrome-bg bg-chrome-accent shadow-md"
        >
          {quickNoteStore.count}
        </span>
      {/if}

      {#if active}
        <div
          class="absolute md:left-0 md:top-1/2 md:-translate-y-1/2 md:w-1 md:h-6
                 bottom-0 left-1/2 -translate-x-1/2 w-6 h-1
                 bg-chrome-accent rounded-t-full md:rounded-r-full md:rounded-t-none"
        ></div>
      {/if}
    </button>
  {/each}
</nav>
