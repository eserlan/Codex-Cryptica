<script lang="ts">
  import { FEATURE_HINTS } from "$lib/config/help-content";
  import { FEATURE_GROUPS } from "$lib/config/feature-groups";
  import { base } from "$app/paths";
  import { fly } from "svelte/transition";

  // Grouped by the job a reader is trying to do, rather than mapping the whole
  // hint record. See feature-groups.ts for what moved to Help and why.
  const groups = FEATURE_GROUPS.map((group) => {
    const hints = group.hintIds
      .map((id) => FEATURE_HINTS[id])
      .filter((hint) => !!hint);
    return {
      ...group,
      lead: hints.slice(0, group.leadCount),
      rest: hints.slice(group.leadCount),
    };
  });
</script>

<svelte:head>
  <title>Features | Codex Cryptica</title>
  <meta
    name="description"
    content="Explore the advanced protocols of Codex Cryptica. AI image generation, knowledge graphs, era-based timelines, and local-first data management."
  />
</svelte:head>

<div
  class="min-h-screen bg-theme-bg text-theme-text font-body selection:bg-theme-primary selection:text-theme-bg transition-colors duration-300 overflow-y-auto"
  style:background-image="var(--bg-texture-overlay)"
>
  <div class="max-w-6xl mx-auto px-4 sm:px-6 py-20">
    <!-- Header -->
    <header class="mb-20 text-center">
      <h1
        class="text-5xl md:text-7xl font-bold font-header tracking-tight mb-6"
      >
        Core <span class="text-theme-primary">Features</span>
      </h1>
      <p
        class="text-xl text-theme-muted max-w-2xl mx-auto leading-relaxed font-light"
      >
        Grouped by what you are trying to do: build a world, see how it
        connects, run the session, get unstuck, and keep it all yours.
      </p>
    </header>

    <!-- Grouped by job -->
    <div class="space-y-20 mb-32">
      {#each groups as group, groupIndex (group.id)}
        <section
          aria-labelledby={"group-" + group.id}
          data-testid="feature-group"
        >
          <header class="mb-8 max-w-2xl">
            <h2
              id={"group-" + group.id}
              class="text-3xl md:text-4xl font-bold font-header text-theme-text mb-3"
            >
              {group.title}
            </h2>
            <p class="text-lg text-theme-muted leading-relaxed font-light">
              {group.outcome}
            </p>
          </header>

          <div class="grid md:grid-cols-2 gap-6">
            {#each group.lead as feature, i (feature.id)}
              <div
                class="p-8 bg-theme-surface border border-theme-border rounded-xl hover:border-theme-primary/40 transition-all group relative overflow-hidden shadow-lg"
                style:background-image="var(--bg-texture-overlay)"
                in:fly={{
                  y: 20,
                  delay: groupIndex * 40 + i * 40,
                  duration: 400,
                }}
                data-testid="feature-lead"
              >
                <div
                  class="absolute -right-4 -top-4 w-32 h-32 bg-theme-primary/5 rounded-full blur-3xl group-hover:bg-theme-primary/10 transition-colors"
                ></div>

                <div class="relative z-10">
                  <div class="flex items-center gap-4 mb-4">
                    <div
                      class="w-11 h-11 rounded-2xl bg-theme-primary/10 flex items-center justify-center border border-theme-primary/20 group-hover:scale-110 transition-transform duration-300"
                    >
                      <span
                        aria-hidden="true"
                        class="{feature.icon ||
                          'icon-[lucide--zap]'} text-theme-primary w-6 h-6"
                      ></span>
                    </div>
                    <h3 class="text-lg font-bold font-header text-theme-text">
                      {feature.title}
                    </h3>
                  </div>
                  <p class="text-theme-muted leading-relaxed">
                    {feature.content}
                  </p>
                </div>
              </div>
            {/each}
          </div>

          <!-- Everything else in the group, listed rather than carded: a
               seventeen-card group is the wall this page is replacing. -->
          {#if group.rest.length > 0}
            <ul
              class="mt-6 grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3"
              data-testid="feature-rest"
            >
              {#each group.rest as feature (feature.id)}
                <li class="flex gap-3 text-sm">
                  <span
                    aria-hidden="true"
                    class="{feature.icon ||
                      'icon-[lucide--zap]'} mt-0.5 h-4 w-4 shrink-0 text-theme-primary/70"
                  ></span>
                  <span class="text-theme-muted">
                    <span class="font-bold text-theme-text"
                      >{feature.title}.</span
                    >
                    {feature.content}
                  </span>
                </li>
              {/each}
            </ul>
          {/if}
        </section>
      {/each}
    </div>

    <!-- CTA -->
    <section
      class="bg-theme-surface/30 border border-theme-border/20 rounded-3xl p-16 text-center relative overflow-hidden"
      style:background-image="var(--bg-texture-overlay)"
    >
      <div
        class="absolute inset-0 bg-theme-primary/5 pointer-events-none"
      ></div>
      <div class="relative z-10">
        <h2 class="text-4xl font-header font-bold mb-6 text-theme-text">
          Ready to start?
        </h2>
        <p
          class="text-theme-muted mb-12 max-w-xl mx-auto text-lg leading-relaxed"
        >
          Join the next generation of storytellers. Start building your world
          with absolute privacy and smart tools.
        </p>
        <a
          href="{base}/?utm_source=features-page&utm_medium=features-cta&utm_campaign=marketing"
          class="inline-block px-12 py-5 bg-theme-primary text-theme-bg font-bold font-header text-sm rounded-lg hover:bg-theme-primary/90 hover:shadow-[0_0_40px_var(--color-accent-primary)] transition-all active:scale-95"
        >
          Enter the Codex
        </a>
      </div>
    </section>
  </div>
</div>
