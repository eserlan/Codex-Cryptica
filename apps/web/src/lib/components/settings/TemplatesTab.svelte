<script lang="ts">
  import StatSheetTemplateSettings from "./StatSheetTemplateSettings.svelte";
  import EntityTemplateSettings from "./entity-templates/EntityTemplateSettings.svelte";
  import FeatureHint from "$lib/components/help/FeatureHint.svelte";

  const sections = [
    {
      id: "entity",
      label: "Entity templates",
      icon: "icon-[lucide--layout-template]",
      intro:
        "Choose the text a new note starts with, like a character's Appearance and Goals headings.",
    },
    {
      id: "stats",
      label: "Stat sheets",
      icon: "icon-[lucide--list-checks]",
      intro:
        "Reusable stat sheet layouts you can apply to any entity from its Stats tab. Built-in layouts are always available; ones you save are kept in this vault.",
    },
  ] as const;

  type SectionId = (typeof sections)[number]["id"];

  let active = $state<SectionId>("entity");
  const current = $derived(sections.find((s) => s.id === active)!);

  function onKeydown(e: KeyboardEvent) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const index = sections.findIndex((s) => s.id === active);
    const step = e.key === "ArrowRight" ? 1 : -1;
    active = sections[(index + step + sections.length) % sections.length].id;
    document.getElementById(`templates-subtab-${active}`)?.focus();
  }
</script>

<div
  role="tabpanel"
  id="settings-panel-templates"
  aria-labelledby="settings-tab-templates"
  class="space-y-6 max-w-3xl mx-auto"
>
  <div
    role="tablist"
    aria-label="Template types"
    class="flex gap-1 border-b border-chrome-border"
    data-testid="templates-subtabs"
  >
    {#each sections as section (section.id)}
      <button
        type="button"
        role="tab"
        id="templates-subtab-{section.id}"
        aria-selected={active === section.id}
        aria-controls="templates-subpanel"
        tabindex={active === section.id ? 0 : -1}
        onclick={() => (active = section.id)}
        onkeydown={onKeydown}
        data-testid="templates-subtab-{section.id}"
        class="-mb-px flex items-center gap-2 border-b-2 px-4 py-2 text-xs font-bold uppercase tracking-wide transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-chrome-accent {active ===
        section.id
          ? 'border-chrome-accent text-chrome-accent'
          : 'border-transparent text-chrome-muted hover:text-chrome-text'}"
      >
        <span class="{section.icon} h-4 w-4" aria-hidden="true"></span>
        {section.label}
      </button>
    {/each}
  </div>

  <div
    role="tabpanel"
    id="templates-subpanel"
    aria-labelledby="templates-subtab-{active}"
    class="space-y-4"
  >
    <p class="text-sm text-chrome-text/70 leading-relaxed">{current.intro}</p>

    {#if active === "entity"}
      <FeatureHint hintId="entity-templates" />
      <EntityTemplateSettings />
    {:else}
      <StatSheetTemplateSettings />
    {/if}
  </div>
</div>
