<script lang="ts">
  import SEOGeneratorLayout from "$lib/components/seo/SEOGeneratorLayout.svelte";
  import {
    generatorEngine,
    npcConfig,
    settlementConfig,
    magicItemConfig,
    factionConfig,
  } from "$lib/services/seo/generator-engine";

  let { data } = $props();

  // NPC state
  let npcRace = $state(npcConfig.races[0]);
  let npcRole = $state(npcConfig.roles[0]);
  let npcAlignment = $state(npcConfig.alignments[0]);
  let npcCampaignContext = $state("");

  // Settlement state
  let settlementSize = $state(settlementConfig.sizes[2].name);
  let settlementEconomy = $state(settlementConfig.economies[0]);

  // Magic item state
  let magicItemType = $state(magicItemConfig.types[0]);
  let magicItemRarity = $state(magicItemConfig.rarities[1]);

  // Faction state
  let factionType = $state(factionConfig.types[0]);
  let factionScope = $state(factionConfig.scopes[1]);
  let factionAlignment = $state(factionConfig.alignments[0]);
  let factionCampaignContext = $state("");

  let useAI = $state(true);

  async function generate() {
    if (data.slug === "npc") {
      return generatorEngine.generateNPC({
        race: npcRace,
        role: npcRole,
        alignment: npcAlignment,
        campaignContext: npcCampaignContext,
        useAI,
      });
    } else if (data.slug === "settlement") {
      return generatorEngine.generateSettlement({
        size: settlementSize,
        economy: settlementEconomy,
        useAI,
      });
    } else if (data.slug === "magic-item") {
      return generatorEngine.generateMagicItem({
        type: magicItemType,
        rarity: magicItemRarity,
        useAI,
      });
    } else {
      return generatorEngine.generateFaction({
        type: factionType,
        scope: factionScope,
        alignment: factionAlignment,
        campaignContext: factionCampaignContext,
        useAI,
      });
    }
  }

  const selectClass =
    "w-full bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-xs text-theme-text focus:outline-none focus:border-theme-primary/60";
  const labelClass =
    "text-[10px] font-bold uppercase tracking-wider text-theme-muted";
</script>

<SEOGeneratorLayout {generate}>
  {#snippet formFields()}
    {#if data.slug === "npc"}
      <div class="flex flex-col gap-1.5">
        <label for="race-select" class={labelClass}>Race</label>
        <select id="race-select" bind:value={npcRace} class={selectClass}>
          {#each npcConfig.races as r (r)}
            <option value={r}>{r}</option>
          {/each}
        </select>
      </div>

      <div class="flex flex-col gap-1.5">
        <label for="role-select" class={labelClass}>Role / Class</label>
        <select id="role-select" bind:value={npcRole} class={selectClass}>
          {#each npcConfig.roles as r (r)}
            <option value={r}>{r}</option>
          {/each}
        </select>
      </div>

      <div class="flex flex-col gap-1.5">
        <label for="alignment-select" class={labelClass}>Alignment</label>
        <select
          id="alignment-select"
          bind:value={npcAlignment}
          class={selectClass}
        >
          {#each npcConfig.alignments as a (a)}
            <option value={a}>{a}</option>
          {/each}
        </select>
      </div>

      <div class="flex flex-col gap-1.5">
        <label for="campaign-context" class={labelClass}
          >Optional Campaign Context</label
        >
        <textarea
          id="campaign-context"
          name="campaign_context"
          bind:value={npcCampaignContext}
          maxlength="240"
          rows="4"
          class="w-full min-h-24 bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-base md:text-xs text-theme-text focus:outline-none focus:border-theme-primary/60 resize-y"
        ></textarea>
      </div>
    {:else if data.slug === "settlement"}
      <div class="flex flex-col gap-1.5">
        <label for="size-select" class={labelClass}>Settlement Size</label>
        <select
          id="size-select"
          bind:value={settlementSize}
          class={selectClass}
        >
          {#each settlementConfig.sizes as s (s.name)}
            <option value={s.name}>{s.name} ({s.range})</option>
          {/each}
        </select>
      </div>

      <div class="flex flex-col gap-1.5">
        <label for="economy-select" class={labelClass}>Primary Economy</label>
        <select
          id="economy-select"
          bind:value={settlementEconomy}
          class={selectClass}
        >
          {#each settlementConfig.economies as e (e)}
            <option value={e}>{e}</option>
          {/each}
        </select>
      </div>
    {:else if data.slug === "magic-item"}
      <div class="flex flex-col gap-1.5">
        <label for="item-type-select" class={labelClass}>Item Type</label>
        <select
          id="item-type-select"
          bind:value={magicItemType}
          class={selectClass}
        >
          {#each magicItemConfig.types as t (t)}
            <option value={t}>{t}</option>
          {/each}
        </select>
      </div>

      <div class="flex flex-col gap-1.5">
        <label for="rarity-select" class={labelClass}>Rarity</label>
        <select
          id="rarity-select"
          bind:value={magicItemRarity}
          class={selectClass}
        >
          {#each magicItemConfig.rarities as r (r)}
            <option value={r}>{r}</option>
          {/each}
        </select>
      </div>
    {:else}
      <div class="flex flex-col gap-1.5">
        <label for="faction-type-select" class={labelClass}>Faction Type</label>
        <select
          id="faction-type-select"
          name="faction_type"
          bind:value={factionType}
          class={selectClass}
        >
          {#each factionConfig.types as type (type)}
            <option value={type}>{type}</option>
          {/each}
        </select>
      </div>

      <div class="flex flex-col gap-1.5">
        <label for="faction-scope-select" class={labelClass}
          >Operating Scope</label
        >
        <select
          id="faction-scope-select"
          name="faction_scope"
          bind:value={factionScope}
          class={selectClass}
        >
          {#each factionConfig.scopes as scope (scope)}
            <option value={scope}>{scope}</option>
          {/each}
        </select>
      </div>

      <div class="flex flex-col gap-1.5">
        <label for="faction-alignment-select" class={labelClass}
          >Moral Posture</label
        >
        <select
          id="faction-alignment-select"
          name="faction_alignment"
          bind:value={factionAlignment}
          class={selectClass}
        >
          {#each factionConfig.alignments as alignment (alignment)}
            <option value={alignment}>{alignment}</option>
          {/each}
        </select>
      </div>

      <div class="flex flex-col gap-1.5">
        <label for="faction-campaign-context" class={labelClass}
          >Optional Campaign Context</label
        >
        <textarea
          id="faction-campaign-context"
          name="campaign_context"
          bind:value={factionCampaignContext}
          maxlength="240"
          rows="4"
          class="w-full min-h-24 bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-base md:text-xs text-theme-text focus:outline-none focus:border-theme-primary/60 resize-y"
        ></textarea>
      </div>
    {/if}

    <div class="flex items-center gap-2 pt-2">
      <input
        type="checkbox"
        id="ai-toggle"
        bind:checked={useAI}
        class="w-4 h-4 rounded border-theme-border/60 bg-theme-bg/60 text-theme-primary focus:ring-theme-primary/40 focus:outline-none"
      />
      <label
        for="ai-toggle"
        class="text-[10px] font-bold uppercase tracking-wider text-theme-muted cursor-pointer flex items-center gap-1"
      >
        <span class="icon-[lucide--sparkles] text-theme-primary w-3.5 h-3.5"
        ></span>
        AI Lore Co-Author Mode
      </label>
    </div>
  {/snippet}
</SEOGeneratorLayout>
