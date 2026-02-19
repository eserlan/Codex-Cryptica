<script lang="ts">
  import { chatCommands, type ChatCommand } from "../../config/chat-commands";
  import { computePosition, flip, shift, offset } from "@floating-ui/dom";
  import { searchService } from "../../services/search";
  import { categories } from "../../stores/categories.svelte";
  import { getIconClass } from "../../utils/icon";
  import { ui } from "../../stores/ui.svelte";
  import { vault } from "../../stores/vault.svelte";
  import { isEntityVisible } from "schema";
  import type { SearchResult } from "schema";

  let {
    input = $bindable(""),
    anchorEl,
    onSelect,
    onClose,
  } = $props<{
    input: string;
    anchorEl: HTMLElement | null;
    onSelect: (command: ChatCommand) => void;
    onClose: () => void;
  }>();

  let menuEl = $state<HTMLDivElement>();
  let selectedIndex = $state(0);
  let entityResults = $state<SearchResult[]>([]);
  let isSearchingEntities = $state(false);

  // Wizard State
  type WizardStep = "COMMAND" | "FROM" | "LABEL" | "TO";
  let activeStep = $state<WizardStep>("COMMAND");

  // Standard relationship suggestions for Step 2
  const relationshipSuggestions = [
    { title: "is the leader of", type: "suggestion" },
    { title: "is the rival of", type: "suggestion" },
    { title: "is the creator of", type: "suggestion" },
    { title: "is located in", type: "suggestion" },
    { title: "is allied with", type: "suggestion" },
  ];

  // Derive step from input content if changed manually
  $effect(() => {
    if (!input.startsWith("/connect") && !input.startsWith("/merge")) {
      activeStep = "COMMAND";
      return;
    }

    const parts = input.split('"');
    if (parts.length === 1) activeStep = "FROM";
    else if (parts.length === 2) activeStep = "FROM";
    else if (parts.length === 3) activeStep = "LABEL";
    else if (parts.length === 4) activeStep = "TO";
    else if (parts.length >= 5) activeStep = "TO";
  });

  // Filter commands OR search entities based on step
  let filteredCommands = $derived.by(() => {
    if (activeStep !== "COMMAND" || !input.startsWith("/")) return [];
    const term = input.slice(1).toLowerCase();
    return chatCommands.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        c.description.toLowerCase().includes(term),
    );
  });

  // Reactive entity/suggestion search
  $effect(() => {
    if (activeStep === "COMMAND") {
      entityResults = [];
      return;
    }

    if (activeStep === "LABEL") {
      if (input.startsWith("/merge")) {
        entityResults = [];
        return;
      }
      // Show standard suggestions for relationships
      const parts = input.split('"');
      const term = (parts[2] || "").trim().toLowerCase();
      entityResults = relationshipSuggestions.filter((s) =>
        s.title.includes(term),
      ) as any;
      return;
    }

    // Entity search for FROM and TO
    const parts = input.split('"');
    const term =
      activeStep === "FROM"
        ? parts.length > 1
          ? parts[1].trim()
          : parts[0].replace(/\/connect|\/merge/, "").trim()
        : parts[parts.length - 1].trim();

    if (term.length >= 3) {
      isSearchingEntities = true;
      searchService.search(term, { limit: 5 }).then((res) => {
        // Filter results based on visibility settings (same as searchStore and Autocomplete)
        const settings = {
          sharedMode: ui.sharedMode,
          defaultVisibility: vault.defaultVisibility,
        };

        const filtered = res.filter((result) => {
          const entity = vault.entities[result.id];
          if (!entity) return false;
          return isEntityVisible(entity, settings);
        });

        entityResults = filtered;
        isSearchingEntities = false;
      });
    } else {
      entityResults = [];
    }
  });

  // Combined list for the UI
  let displayList = $derived(
    filteredCommands.length > 0 ? filteredCommands : entityResults,
  );

  // Reset selection when list changes
  $effect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    displayList;
    selectedIndex = 0;
  });

  // Position the menu
  $effect(() => {
    if (
      anchorEl &&
      menuEl &&
      (displayList.length > 0 || activeStep !== "COMMAND")
    ) {
      computePosition(anchorEl, menuEl, {
        strategy: "absolute",
        placement: "top-start",
        middleware: [offset(12), flip(), shift({ padding: 12 })],
      }).then(({ x, y }) => {
        if (menuEl) {
          menuEl.style.left = `${x}px`;
          menuEl.style.top = `${y}px`;
          menuEl.style.opacity = "1";
        }
      });
    }
  });

  const handleEntitySelect = (result: any) => {
    // Sanitize title to prevent breaking wizard input logic
    const safeTitle = result.title.replace(/"/g, "'");
    const isMerge = input.startsWith("/merge");
    const cmd = isMerge ? "/merge" : "/connect";

    if (activeStep === "FROM") {
      input = `${cmd} "${safeTitle}" `;
    } else if (activeStep === "LABEL") {
      const parts = input.split('"');
      input = `${cmd} "${parts[1]}" ${safeTitle} "`;
    } else if (activeStep === "TO") {
      const parts = input.split('"');
      const label = (parts[2] || "").trim();
      input = `${cmd} "${parts[1]}" ${label} "${safeTitle}" `;
      onClose(); // Wizard complete
    }
  };

  const advanceStep = () => {
    const isMerge = input.startsWith("/merge");
    const cmd = isMerge ? "/merge" : "/connect";

    if (activeStep === "FROM") {
      const term = input.replace(cmd, "").trim();
      if (term && !input.includes('"')) {
        input = `${cmd} "${term}" `;
      } else if (!input.endsWith(" ")) {
        input += " ";
      }
      return true;
    }
    if (activeStep === "LABEL") {
      const parts = input.split('"');
      let label = (parts[2] || "").trim();
      if (isMerge && !label) {
        label = "into";
      }
      if (!input.endsWith(" ")) input += " ";
      input = `${cmd} "${parts[1]}" ${label} "`;
      return true;
    }
    return false;
  };

  export const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      if (displayList.length === 0) return false;
      e.preventDefault();
      selectedIndex = (selectedIndex + 1) % displayList.length;
      return true;
    } else if (e.key === "ArrowUp") {
      if (displayList.length === 0) return false;
      e.preventDefault();
      selectedIndex =
        (selectedIndex - 1 + displayList.length) % displayList.length;
      return true;
    } else if (e.key === "Tab") {
      if (input.startsWith("/connect") || input.startsWith("/merge")) {
        e.preventDefault();
        if (displayList.length > 0) {
          const selected = displayList[selectedIndex];
          handleEntitySelect(selected);
        } else {
          advanceStep();
        }
        return true;
      }
      // For general command selection
      if (displayList.length > 0) {
        e.preventDefault();
        const selected = displayList[selectedIndex];
        if ("name" in selected) {
          onSelect(selected as ChatCommand);
          onClose();
        }
        return true;
      }
    } else if (e.key === "Enter") {
      if (displayList.length > 0) {
        e.preventDefault();
        const selected = displayList[selectedIndex];
        if ("name" in selected) {
          onSelect(selected as ChatCommand);
          onClose();
        } else {
          handleEntitySelect(selected);
        }
        return true;
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return true;
    }
    return false;
  };
</script>

{#if displayList.length > 0 || input.startsWith("/connect") || input.startsWith("/merge")}
  <div
    bind:this={menuEl}
    class="absolute z-[100] w-64 bg-theme-surface border border-theme-border rounded shadow-2xl overflow-hidden flex flex-col opacity-0 transition-opacity duration-150"
  >
    <div
      class="px-3 py-2 bg-theme-bg/50 border-b border-theme-border text-[9px] uppercase tracking-widest font-bold text-theme-muted flex justify-between items-center"
    >
      <div class="flex gap-1 items-center">
        <span class={activeStep === "FROM" ? "text-theme-primary" : ""}
          >{input.startsWith("/merge") ? "SOURCE" : "FROM"}</span
        >
        <span class="opacity-30">/</span>
        <span class={activeStep === "LABEL" ? "text-theme-primary" : ""}
          >{input.startsWith("/merge") ? "INTO" : "LABEL"}</span
        >
        <span class="opacity-30">/</span>
        <span class={activeStep === "TO" ? "text-theme-primary" : ""}
          >{input.startsWith("/merge") ? "TARGET" : "TO"}</span
        >
      </div>
      {#if isSearchingEntities}
        <div
          class="w-2 h-2 border border-theme-primary/30 border-t-theme-primary rounded-full animate-spin"
        ></div>
      {/if}
    </div>
    <div class="max-h-60 overflow-y-auto p-1">
      {#each displayList as item, i}
        <button
          class="w-full text-left px-3 py-2 rounded flex flex-col gap-0.5 transition-colors
            {i === selectedIndex
            ? 'bg-theme-primary/20 text-theme-primary'
            : 'hover:bg-theme-bg/30 text-theme-text'}"
          onclick={() => {
            if ("name" in item) {
              onSelect(item as ChatCommand);
              onClose();
            } else {
              handleEntitySelect(item);
            }
          }}
        >
          {#if "name" in item}
            <!-- Command Item -->
            <div class="flex items-center gap-2">
              <span class="font-mono text-sm font-bold">{item.name}</span>
              {#if item.parameters}
                <span class="text-[10px] opacity-50 font-mono"
                  >{item.parameters.join(" ")}</span
                >
              {/if}
            </div>
            <div class="text-[10px] opacity-70 leading-tight">
              {item.description}
            </div>
          {:else if item.type === "suggestion"}
            <!-- Relationship Suggestion -->
            <div class="flex items-center gap-2">
              <span
                class="icon-[heroicons--chat-bubble-left-right] w-3 h-3 text-theme-secondary opacity-50"
              ></span>
              <span class="text-xs font-mono">{item.title}</span>
            </div>
          {:else}
            <!-- Entity Item -->
            <div class="flex items-center gap-2 w-full overflow-hidden">
              {#if item.type}
                <span
                  class="{getIconClass(
                    categories.getCategory(item.type)?.icon,
                  )} w-3.5 h-3.5 shrink-0"
                  style="color: {categories.getColor(item.type)}"
                ></span>
              {/if}
              <div class="flex flex-col min-w-0 flex-1">
                <span class="text-xs font-bold truncate text-theme-text"
                  >{item.title}</span
                >
                {#if item.type}
                  <span
                    class="text-[8px] uppercase opacity-50 font-bold tracking-widest text-theme-muted"
                  >
                    {categories.getCategory(item.type)?.label || item.type}
                  </span>
                {/if}
              </div>
            </div>
          {/if}
        </button>
      {/each}
    </div>
    {#if activeStep === "LABEL"}
      <div
        class="px-3 py-1 bg-theme-primary/5 text-[8px] text-theme-muted font-mono border-t border-theme-border/30"
      >
        Type relationship and press TAB to select target
      </div>
    {/if}
  </div>
{/if}
