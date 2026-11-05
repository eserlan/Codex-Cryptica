<script lang="ts">
  let {
    onDiscover,
    onOwnPremise,
    onEnterWorld = () => {},
    canDiscover = true,
  }: {
    onDiscover: () => void;
    onOwnPremise: () => void;
    onEnterWorld?: () => void;
    canDiscover?: boolean;
  } = $props();
</script>

<section
  class="mx-auto w-full max-w-5xl space-y-5"
  aria-labelledby="adventure-entry-heading"
  data-testid="adventure-entry-choices"
>
  <header class="space-y-2">
    <p class="text-xs font-semibold uppercase tracking-widest text-theme-text">
      Adventure Mode
    </p>
    <h1
      id="adventure-entry-heading"
      class="font-header text-2xl font-semibold text-theme-text sm:text-3xl"
    >
      Where will your story begin?
    </h1>
    <p class="max-w-2xl text-sm leading-relaxed text-theme-text">
      Choose how to enter your adventure. You decide what your character does;
      Oracle responds as the world around them.
    </p>
  </header>

  <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
    <button
      type="button"
      data-testid="adventure-discover"
      class="group flex min-h-44 flex-col items-start gap-3 rounded-xl border border-theme-primary/40 bg-theme-surface p-5 text-left transition hover:border-theme-primary hover:bg-theme-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-primary disabled:cursor-not-allowed disabled:opacity-60"
      disabled={!canDiscover}
      onclick={() => {
        if (canDiscover) onDiscover();
      }}
      aria-describedby="adventure-discover-description"
    >
      <span
        class="flex h-10 w-10 items-center justify-center rounded-lg bg-theme-primary/10 text-theme-text"
        aria-hidden="true"
      >
        <span class="icon-[lucide--sparkles] h-5 w-5"></span>
      </span>
      <span class="font-header text-base font-semibold text-theme-text">
        Discover an Adventure
      </span>
      <span
        id="adventure-discover-description"
        class="text-sm leading-relaxed text-theme-text"
      >
        Get six rumours instantly, choose a lead, and discover what happens when
        you investigate—or walk away.
      </span>
      {#if !canDiscover}
        <span class="text-xs text-theme-text">
          Open a fully loaded Vault to generate rumours.
        </span>
      {/if}
    </button>

    <button
      type="button"
      data-testid="adventure-own-premise"
      class="group flex min-h-44 flex-col items-start gap-3 rounded-xl border border-theme-border bg-theme-surface p-5 text-left transition hover:border-theme-primary hover:bg-theme-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-primary"
      onclick={onOwnPremise}
      aria-describedby="adventure-premise-description"
    >
      <span
        class="flex h-10 w-10 items-center justify-center rounded-lg bg-theme-primary/10 text-theme-text"
        aria-hidden="true"
      >
        <span class="icon-[lucide--book-open] h-5 w-5"></span>
      </span>
      <span class="font-header text-base font-semibold text-theme-text">
        Create Your Own Premise
      </span>
      <span
        id="adventure-premise-description"
        class="text-sm leading-relaxed text-theme-text"
      >
        Describe a starting situation, pick your character, and let Oracle bring
        the world to life.
      </span>
    </button>

    <button
      type="button"
      class="group flex min-h-44 flex-col items-start gap-3 rounded-xl border border-theme-border bg-theme-surface p-5 text-left transition hover:border-theme-primary hover:bg-theme-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-primary sm:col-span-2 xl:col-span-1"
      data-testid="adventure-enter-world"
      onclick={onEnterWorld}
      aria-describedby="adventure-world-description"
    >
      <span
        class="flex h-10 w-10 items-center justify-center rounded-lg bg-theme-primary/10 text-theme-text"
        aria-hidden="true"
      >
        <span class="icon-[lucide--globe-2] h-5 w-5"></span>
      </span>
      <span class="font-header text-base font-semibold text-theme-text">
        Enter Your World
      </span>
      <span
        id="adventure-world-description"
        class="text-sm leading-relaxed text-theme-text"
      >
        Choose a character, place, time and opening style. Explore your Vault
        without a prepared quest.
      </span>
    </button>
  </div>
</section>
