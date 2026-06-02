<script lang="ts">
  import { base } from "$app/paths";
  import { fade } from "svelte/transition";
  import {
    generatorEngine,
    type GeneratorOutput,
    npcConfig,
    settlementConfig,
    magicItemConfig,
  } from "$lib/services/seo/generator-engine";

  let {
    slug,
  }: {
    slug: "npc" | "settlement" | "magic-item";
  } = $props();

  // Selected parameters
  let npcRace = $state(npcConfig.races[0]);
  let npcRole = $state(npcConfig.roles[0]);
  let npcAlignment = $state(npcConfig.alignments[0]);

  let settlementSize = $state(settlementConfig.sizes[2].name); // Default to Town
  let settlementEconomy = $state(settlementConfig.economies[0]);

  let magicItemType = $state(magicItemConfig.types[0]);
  let magicItemRarity = $state(magicItemConfig.rarities[1]); // Default to Uncommon

  // Generator UI state
  let isGenerating = $state(false);
  let generatedData = $state<GeneratorOutput | null>(null);
  let errorMessage = $state<string | null>(null);
  let useAI = $state(true);

  // Fallback Copy to Clipboard state
  let copied = $state(false);

  async function handleGenerate() {
    isGenerating = true;
    errorMessage = null;
    try {
      if (slug === "npc") {
        generatedData = await generatorEngine.generateNPC({
          race: npcRace,
          role: npcRole,
          alignment: npcAlignment,
          useAI,
        });
      } else if (slug === "settlement") {
        generatedData = await generatorEngine.generateSettlement({
          size: settlementSize,
          economy: settlementEconomy,
          useAI,
        });
      } else if (slug === "magic-item") {
        generatedData = await generatorEngine.generateMagicItem({
          type: magicItemType,
          rarity: magicItemRarity,
          useAI,
        });
      }
    } catch (err: any) {
      errorMessage = "Failed to generate: " + (err.message || err);
    } finally {
      isGenerating = false;
    }
  }

  const escapeHtml = (value: string) =>
    value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const renderMarkdown = (value: string) =>
    escapeHtml(value)
      .replace(
        /^### (.*)$/gm,
        '<h3 class="font-header font-bold text-base mt-4 mb-2 text-theme-primary">$1</h3>',
      )
      .replace(
        /^## (.*)$/gm,
        '<h2 class="font-header font-bold text-lg mt-6 mb-3 border-b border-theme-border/40 pb-1">$1</h2>',
      )
      .replace(
        /^- \*\*(.*?)\*\*: (.*)$/gm,
        '<div class="flex flex-col mb-1"><span class="font-bold text-theme-muted uppercase tracking-wider text-[9px]">$1</span><span>$2</span></div>',
      )
      .replace(/^- (.*)$/gm, '<li class="list-disc ml-4">$1</li>')
      .replace(/\n\n/g, "<br/><br/>");

  function handleSaveToCodex() {
    if (!generatedData) return;

    try {
      const payload = {
        type: generatedData.type,
        title: generatedData.title,
        content: generatedData.content,
        lore: generatedData.lore,
        labels: generatedData.labels,
        status: generatedData.status,
      };

      localStorage.setItem("__codex_pending_import", JSON.stringify(payload));
      // Redirect to workspace app root
      window.location.href = `${base}/`;
    } catch {
      errorMessage =
        "Storage access is blocked. Please copy the Markdown below instead.";
    }
  }

  async function handleCopyMarkdown() {
    if (!generatedData) return;

    const markdownText = `# ${generatedData.title}
Labels: ${generatedData.labels.join(", ")}

${generatedData.content}

${generatedData.lore}`;

    try {
      await navigator.clipboard.writeText(markdownText);
      copied = true;
      setTimeout(() => {
        copied = false;
      }, 2000);
    } catch (err) {
      console.error("Failed to copy markdown:", err);
    }
  }
</script>

<svelte:head>
  <title
    >Free RPG {slug === "npc"
      ? "NPC"
      : slug === "settlement"
        ? "Settlement"
        : "Magic Item"} Generator | Codex Cryptica</title
  >
  <meta
    name="description"
    content="Generate high-quality detailed campaign drafts using our interactive local-first generators."
  />
  <link rel="help" href="{base}/llms.txt" />
</svelte:head>

<div
  class="min-h-screen bg-theme-bg text-theme-text font-body selection:bg-theme-primary selection:text-theme-bg flex flex-col"
  style:background-image="var(--bg-texture-overlay)"
>
  <!-- Marketing Header -->
  <header
    class="w-full border-b border-theme-border/60 bg-theme-surface/40 backdrop-blur-md px-6 py-4 sticky top-0 z-50"
  >
    <div class="max-w-6xl mx-auto flex items-center justify-between">
      <a href="{base}/" class="flex items-center gap-2 group" id="logo-link">
        <span
          class="icon-[lucide--castle] text-theme-primary w-6 h-6 transition-transform group-hover:rotate-12"
        ></span>
        <span
          class="font-header font-bold text-sm uppercase tracking-[0.2em] text-theme-text group-hover:text-theme-primary transition-colors"
        >
          Codex Cryptica
        </span>
      </a>
      <nav
        class="hidden md:flex items-center gap-6 text-xs font-bold uppercase tracking-widest font-header text-theme-muted"
      >
        <a
          href="{base}/features"
          class="hover:text-theme-primary transition-colors">Features</a
        >
        <a href="{base}/blog" class="hover:text-theme-primary transition-colors"
          >Devlog</a
        >
        <a
          href="{base}/tools/dnd-npc-generator"
          class="hover:text-theme-primary transition-colors">Generators</a
        >
      </nav>
      <div>
        <a
          href="{base}/"
          class="px-5 py-2.5 bg-theme-primary text-theme-bg font-bold uppercase font-header tracking-wider text-[10px] rounded-lg hover:brightness-110 shadow-sm transition-all"
          id="nav-cta-btn"
        >
          Open App
        </a>
      </div>
    </div>
  </header>

  <div
    class="max-w-6xl mx-auto px-6 py-12 w-full flex-grow grid grid-cols-1 lg:grid-cols-12 gap-10"
  >
    <!-- Parameters Column -->
    <div class="lg:col-span-4 space-y-6">
      <div
        class="p-6 bg-theme-surface/40 border border-theme-border/60 rounded-2xl shadow-sm"
      >
        <h1
          class="font-header font-bold text-lg uppercase tracking-wider text-theme-primary mb-4"
          id="generator-title"
        >
          {#if slug === "npc"}
            NPC Generator
          {:else}
            {slug === "settlement" ? "Settlement" : "Magic Item"} Generator
          {/if}
        </h1>
        <p class="text-xs text-theme-muted leading-relaxed mb-6">
          Customize options and instantly generate structured drafts to populate
          your campaign lore database.
        </p>

        <!-- Generation Inputs -->
        <div class="space-y-4">
          {#if slug === "npc"}
            <div class="flex flex-col gap-1.5">
              <label
                for="race-select"
                class="text-[10px] font-bold uppercase tracking-wider text-theme-muted"
                >Race</label
              >
              <select
                id="race-select"
                bind:value={npcRace}
                class="w-full bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-xs text-theme-text focus:outline-none focus:border-theme-primary/60"
              >
                {#each npcConfig.races as r (r)}
                  <option value={r}>{r}</option>
                {/each}
              </select>
            </div>

            <div class="flex flex-col gap-1.5">
              <label
                for="role-select"
                class="text-[10px] font-bold uppercase tracking-wider text-theme-muted"
                >Role / Class</label
              >
              <select
                id="role-select"
                bind:value={npcRole}
                class="w-full bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-xs text-theme-text focus:outline-none focus:border-theme-primary/60"
              >
                {#each npcConfig.roles as r (r)}
                  <option value={r}>{r}</option>
                {/each}
              </select>
            </div>

            <div class="flex flex-col gap-1.5">
              <label
                for="alignment-select"
                class="text-[10px] font-bold uppercase tracking-wider text-theme-muted"
                >Alignment</label
              >
              <select
                id="alignment-select"
                bind:value={npcAlignment}
                class="w-full bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-xs text-theme-text focus:outline-none focus:border-theme-primary/60"
              >
                {#each npcConfig.alignments as a (a)}
                  <option value={a}>{a}</option>
                {/each}
              </select>
            </div>
          {:else}
            {#if slug === "settlement"}
              <div class="flex flex-col gap-1.5">
                <label
                  for="size-select"
                  class="text-[10px] font-bold uppercase tracking-wider text-theme-muted"
                  >Settlement Size</label
                >
                <select
                  id="size-select"
                  bind:value={settlementSize}
                  class="w-full bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-xs text-theme-text focus:outline-none focus:border-theme-primary/60"
                >
                  {#each settlementConfig.sizes as s (s.name)}
                    <option value={s.name}>{s.name} ({s.range})</option>
                  {/each}
                </select>
              </div>

              <div class="flex flex-col gap-1.5">
                <label
                  for="economy-select"
                  class="text-[10px] font-bold uppercase tracking-wider text-theme-muted"
                  >Primary Economy</label
                >
                <select
                  id="economy-select"
                  bind:value={settlementEconomy}
                  class="w-full bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-xs text-theme-text focus:outline-none focus:border-theme-primary/60"
                >
                  {#each settlementConfig.economies as e (e)}
                    <option value={e}>{e}</option>
                  {/each}
                </select>
              </div>
            {:else}
              <div class="flex flex-col gap-1.5">
                <label
                  for="item-type-select"
                  class="text-[10px] font-bold uppercase tracking-wider text-theme-muted"
                  >Item Type</label
                >
                <select
                  id="item-type-select"
                  bind:value={magicItemType}
                  class="w-full bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-xs text-theme-text focus:outline-none focus:border-theme-primary/60"
                >
                  {#each magicItemConfig.types as t (t)}
                    <option value={t}>{t}</option>
                  {/each}
                </select>
              </div>

              <div class="flex flex-col gap-1.5">
                <label
                  for="rarity-select"
                  class="text-[10px] font-bold uppercase tracking-wider text-theme-muted"
                  >Rarity</label
                >
                <select
                  id="rarity-select"
                  bind:value={magicItemRarity}
                  class="w-full bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-xs text-theme-text focus:outline-none focus:border-theme-primary/60"
                >
                  {#each magicItemConfig.rarities as r (r)}
                    <option value={r}>{r}</option>
                  {/each}
                </select>
              </div>
            {/if}
          {/if}

          <!-- AI Toggle Option -->
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
              <span
                class="icon-[lucide--sparkles] text-theme-primary w-3.5 h-3.5"
              ></span>
              AI Lore Co-Author Mode
            </label>
          </div>

          <button
            type="button"
            onclick={handleGenerate}
            disabled={isGenerating}
            class="w-full py-3 mt-4 bg-theme-primary text-theme-bg font-bold uppercase font-header tracking-widest text-xs rounded-xl shadow-lg hover:brightness-110 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            id="generate-button"
          >
            {#if isGenerating}
              <span class="icon-[lucide--loader-2] animate-spin w-4 h-4"></span>
              Forging Lore...
            {:else}
              <span class="icon-[lucide--dice-5] w-4 h-4"></span>
              ✦ Generate RPG Draft ✦
            {/if}
          </button>
        </div>

        {#if errorMessage}
          <div
            class="mt-4 p-3 border border-red-500/30 bg-red-500/10 rounded-xl text-red-400 text-xs"
          >
            {errorMessage}
          </div>
        {/if}
      </div>
    </div>

    <!-- Output Card Column -->
    <div class="lg:col-span-8 flex flex-col">
      <div
        class="flex-grow p-6 md:p-8 bg-theme-surface/30 border border-theme-border/60 rounded-2xl shadow-sm flex flex-col min-h-[400px]"
      >
        {#if generatedData}
          <div in:fade={{ duration: 250 }} class="flex flex-col flex-grow">
            <!-- Header section of character sheet -->
            <div
              class="border-b border-theme-border/60 pb-4 mb-6 flex flex-wrap items-center justify-between gap-4"
            >
              <div>
                <h2
                  class="font-header font-extrabold text-2xl md:text-3xl tracking-wide uppercase text-theme-primary"
                >
                  {generatedData.title}
                </h2>
                <div class="flex gap-2 mt-2">
                  {#each generatedData.labels as label (label)}
                    <span
                      class="rounded-full border border-theme-primary/20 bg-theme-primary/10 px-2.5 py-0.5 text-[9px] uppercase tracking-wider font-mono font-bold text-theme-primary"
                    >
                      {label}
                    </span>
                  {/each}
                </div>
              </div>
              <div class="flex gap-2">
                <button
                  type="button"
                  onclick={handleSaveToCodex}
                  class="px-4 py-2 bg-theme-primary text-theme-bg font-bold uppercase font-header tracking-wider text-[10px] rounded-lg hover:brightness-110 shadow-sm transition-all"
                  id="save-to-codex-btn"
                >
                  Save to Codex
                </button>
                <button
                  type="button"
                  onclick={handleCopyMarkdown}
                  class="px-4 py-2 bg-theme-surface border border-theme-border/80 text-theme-text font-bold uppercase font-header tracking-wider text-[10px] rounded-lg hover:border-theme-primary/60 transition-all flex items-center gap-1.5"
                  id="copy-markdown-btn"
                >
                  <span class="icon-[lucide--copy] w-3.5 h-3.5"></span>
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>

            <!-- Immersive layout with Alegreya typography, borders, subtle textures -->
            <div
              class="grid grid-cols-1 md:grid-cols-12 gap-8 flex-grow"
              data-world-theme="workspace"
            >
              <!-- Content Story column -->
              <div
                class="md:col-span-7 space-y-4 text-xs md:text-sm leading-relaxed text-theme-text/90"
              >
                {@html renderMarkdown(generatedData.content)}
              </div>

              <!-- Lore Stats column (styled like a side sheet) -->
              <div
                class="md:col-span-5 p-4 border border-theme-border/60 bg-theme-bg/40 rounded-xl space-y-4"
              >
                <h4
                  class="font-header font-bold text-xs uppercase tracking-widest text-theme-primary"
                >
                  GM Stats & Info
                </h4>
                <div class="text-xs space-y-3 leading-relaxed">
                  {@html renderMarkdown(generatedData.lore)}
                </div>
              </div>
            </div>
          </div>
        {:else}
          <div
            in:fade={{ duration: 150 }}
            class="flex flex-col items-center justify-center flex-grow text-center text-theme-muted max-w-sm mx-auto"
          >
            <span
              class="icon-[lucide--swords] text-theme-muted/30 w-16 h-16 mb-4"
            ></span>
            <h3
              class="font-header font-bold text-sm uppercase tracking-widest mb-2"
            >
              No Draft Generated
            </h3>
            <p class="text-[11px] leading-relaxed">
              Use the sidebar generator control panel to customize parameters,
              then trigger the generation engine to forge details.
            </p>
          </div>
        {/if}
      </div>
    </div>
  </div>

  <!-- Marketing Footer -->
  <footer
    class="border-t border-theme-border/60 bg-theme-surface/20 px-6 py-8 mt-auto text-center text-[10px] text-theme-muted tracking-wider uppercase font-header"
  >
    <div
      class="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4"
    >
      <div>© 2026 Codex Cryptica. All rights reserved.</div>
      <div class="flex gap-6">
        <a
          href="{base}/terms"
          class="hover:text-theme-primary transition-colors">Terms</a
        >
        <a
          href="{base}/privacy"
          class="hover:text-theme-primary transition-colors">Privacy</a
        >
        <a
          href="{base}/sitemap.xml"
          class="hover:text-theme-primary transition-colors">Sitemap</a
        >
        <a
          href="{base}/llms.txt"
          class="hover:text-theme-primary transition-colors">LLM Docs</a
        >
      </div>
    </div>
  </footer>
</div>
