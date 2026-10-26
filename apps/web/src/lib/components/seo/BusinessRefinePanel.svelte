<script lang="ts">
  import { onDestroy } from "svelte";
  import {
    businessSectionLabel,
    type BusinessDocument,
    type BusinessSectionId,
  } from "generator-engine";
  import { generatorEngine } from "#lib/services/seo/generator-engine.js";
  import RefineNotice from "./RefineNotice.svelte";

  let {
    business,
    useAI = false,
    onReplace,
  }: {
    business: BusinessDocument;
    useAI?: boolean;
    onReplace: (next: BusinessDocument) => void;
  } = $props();

  let busyId = $state<BusinessSectionId | null>(null);
  let steer = $state("");
  let notice = $state<string | null>(null);
  let warnings = $state<string[]>([]);
  let controller: AbortController | null = null;
  let token = 0;

  onDestroy(() => {
    controller?.abort();
    token += 1;
  });

  const sections = $derived<Array<{ id: BusinessSectionId; label: string }>>([
    { id: "identity", label: "Identity" },
    { id: "operations", label: "What it does" },
    {
      id: "leadership",
      label: `${business.leadership.name}, ${business.leadership.role}`,
    },
    ...business.staff.map((p) => ({
      id: `staff:${p.id}` as BusinessSectionId,
      label: p.name === business.leadership.name ? `${p.name} (staff)` : p.name,
    })),
    { id: "clientele", label: "Clientele" },
    { id: "dependencies", label: "Dependencies" },
    { id: "relationships", label: "Relationships" },
    { id: "reputation", label: "Reputation" },
    { id: "pressure", label: "Current pressure" },
    { id: "asset", label: "Unusual asset" },
    { id: "secret", label: "Secret" },
    { id: "opportunity", label: "Opportunity" },
    { id: "complication", label: "Complication" },
    { id: "hooks", label: "Adventure hooks" },
    ...(business.options.playersOwn
      ? [{ id: "management" as BusinessSectionId, label: "Management" }]
      : []),
  ]);

  function successNotice(
    renamed: { from: string; to: string } | undefined,
    steerText: string,
    part: string,
  ): string {
    if (renamed)
      return `Renamed ${renamed.from} to ${renamed.to} in other sections.`;
    return `${steerText.trim() ? "Revised" : "Rewrote"} the ${part}. Everything else is unchanged.`;
  }

  function describe(id: BusinessSectionId, label: string): string {
    if (id.startsWith("staff:")) return `key staff ${label}`;
    if (id === "leadership") return "leadership";
    return businessSectionLabel(id);
  }

  async function rewrite(id: BusinessSectionId, label: string) {
    if (busyId) return;
    busyId = id;
    notice = null;
    warnings = [];
    const started = business;
    const current = ++token;
    controller = new AbortController();
    try {
      const result = await generatorEngine.regenerateBusinessSection(
        started,
        id,
        {
          useAI,
          instruction: useAI ? steer : "",
          signal: controller.signal,
        },
      );
      if (current !== token || business !== started) return;
      warnings = result.warnings;
      onReplace(result.document);
      const part = describe(id, label);
      notice = successNotice(result.renamed, steer, part);
    } catch {
      if (current === token) notice = "That didn't work. Nothing was changed.";
    } finally {
      if (current === token) {
        busyId = null;
        controller = null;
      }
    }
  }

  const buttonClass =
    "flex items-center gap-1.5 px-2.5 py-1 bg-theme-surface/60 border border-theme-border/60 rounded-lg text-micro font-bold uppercase tracking-wider text-theme-text hover:bg-theme-primary hover:text-theme-on-primary hover:border-theme-primary transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";
</script>

<section
  class="mt-4 rounded-xl border border-theme-border/60 bg-theme-surface/40 p-4"
  aria-labelledby="business-refine-heading"
  data-testid="business-refine-panel"
>
  <h2
    id="business-refine-heading"
    class="text-meta font-bold uppercase tracking-wider text-theme-text/80"
  >
    Refine one part
  </h2>
  <p class="mt-1 text-micro text-theme-muted leading-relaxed">
    Rewrite a single section{useAI ? ", or tell it what to change" : ""}.
    Everything else stays as it is.
  </p>

  {#if useAI}
    <label class="mt-3 flex flex-col gap-1 text-micro text-theme-muted">
      <span>Steer (optional)</span>
      <textarea
        rows="2"
        class="w-full bg-theme-bg/60 border border-theme-border/60 rounded-lg px-3 py-2 text-xs text-theme-text"
        bind:value={steer}
        placeholder="For example: make it about the harbour"
      ></textarea>
    </label>
  {/if}

  <ul class="mt-3 flex flex-col gap-1.5">
    {#each sections as section (section.id)}
      <li>
        <button
          type="button"
          class={buttonClass}
          disabled={busyId !== null}
          aria-label={`Rewrite ${section.label}`}
          onclick={() => rewrite(section.id, section.label)}
        >
          <span class="icon-[lucide--refresh-cw] h-3.5 w-3.5" aria-hidden="true"
          ></span>
          {section.label}
        </button>
      </li>
    {/each}
  </ul>

  <RefineNotice {notice} {warnings} />
</section>
