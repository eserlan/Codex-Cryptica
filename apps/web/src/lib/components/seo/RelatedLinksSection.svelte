<script lang="ts">
  import { base } from "$app/paths";

  const cleanBase = base === "/" ? "" : base;

  let { relatedLinks }: { relatedLinks: { href: string; label: string }[] } =
    $props();
</script>

{#if relatedLinks.length > 0}
  <section
    class="border-t border-theme-border/40 px-6 py-12 text-center bg-theme-surface/5"
  >
    <div class="max-w-4xl mx-auto">
      <h2
        class="font-header font-bold text-xs uppercase tracking-widest text-theme-muted mb-6"
      >
        More RPG Worldbuilding Tools
      </h2>
      <div class="flex flex-wrap justify-center gap-3">
        {#each relatedLinks as link (link.href)}
          <a
            href="{cleanBase}{link.href}"
            class="px-4 py-2 bg-theme-surface/30 border border-theme-border/40 hover:border-theme-primary/60 text-xs font-bold uppercase tracking-wider text-theme-text rounded-full shadow-sm hover:bg-theme-surface/50 transition-all flex items-center gap-1.5"
          >
            <span>{link.label}</span>
            <span
              class="icon-[lucide--arrow-right] w-3.5 h-3.5"
              aria-hidden="true"
            ></span>
          </a>
        {/each}
      </div>
    </div>
  </section>
{/if}
