<script lang="ts">
  import {
    loadGuestDisplayName,
    saveGuestDisplayName,
  } from "$lib/utils/guest-name-storage";

  let {
    onJoin,
    rejectionMessage = null,
  }: { onJoin: (username: string) => void; rejectionMessage?: string | null } =
    $props();

  const getGuestStorage = () => {
    if (typeof window === "undefined") return null;
    try {
      return window.localStorage;
    } catch {
      return null;
    }
  };

  let username = $state(loadGuestDisplayName(getGuestStorage()));
  let error = $state<string | null>(null);

  $effect(() => {
    if (rejectionMessage) {
      error = rejectionMessage;
    }
  });

  const handleSubmit = (e: SubmitEvent) => {
    e.preventDefault();
    error = null;
    if (!username.trim()) {
      error = "Name is required";
      return;
    }
    const trimmed = username.trim();
    saveGuestDisplayName(trimmed, getGuestStorage());
    onJoin(trimmed);
  };

  const handleInput = () => {
    if (error) error = null;
  };
</script>

<svelte:window
  onkeydown={(e) => {
    if (
      e.key === "Enter" &&
      document.activeElement?.tagName !== "INPUT" &&
      document.activeElement?.tagName !== "TEXTAREA"
    ) {
      e.preventDefault();
      const form = document.querySelector("form");
      if (form) form.requestSubmit();
    }
  }}
/>

<div
  class="fixed inset-0 bg-theme-bg/90 backdrop-blur-md flex items-center justify-center z-[100] p-4 font-mono text-theme-text"
>
  <div
    class="relative max-w-md w-full overflow-hidden rounded-2xl border border-theme-primary/30 bg-theme-surface/95 p-7 text-center shadow-2xl shadow-black/40"
  >
    <div
      class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-theme-primary/60 to-transparent"
    ></div>

    <div class="mb-5 flex justify-center">
      <span
        class="icon-[lucide--globe] w-10 h-10 text-theme-primary animate-pulse"
      ></span>
    </div>

    <h2
      class="text-xl font-bold text-theme-primary mb-2 tracking-[0.18em] uppercase font-header"
    >
      Shared Campaign
    </h2>

    <p class="text-theme-text/70 text-xs mb-6 leading-relaxed">
      Enter a display name so the GM can identify your session.
    </p>

    <form onsubmit={handleSubmit} class="space-y-4">
      <div class="relative">
        <label for="username-input" class="sr-only"> Display name </label>
        <input
          id="username-input"
          bind:value={username}
          oninput={handleInput}
          placeholder="Your name"
          class="w-full rounded-lg border border-theme-border bg-theme-bg/70 py-3 px-4 text-center text-theme-text outline-none transition-colors placeholder:text-theme-muted/70 focus:border-theme-primary focus:ring-2 focus:ring-theme-primary/20"
          aria-invalid={!!error}
          aria-describedby={error ? "username-error" : undefined}
        />
        {#if error}
          <p
            id="username-error"
            role="alert"
            class="absolute -bottom-5 left-0 right-0 text-[10px] text-red-400 uppercase tracking-tighter"
          >
            {error}
          </p>
        {/if}
      </div>

      <button
        type="submit"
        class="w-full rounded-lg border border-theme-primary/30 bg-theme-primary py-3 font-bold tracking-[0.24em] uppercase font-header text-theme-bg transition shadow-lg shadow-theme-primary/10 hover:bg-theme-primary/90 hover:border-theme-primary"
      >
        JOIN
      </button>
    </form>

    <p class="mt-6 text-[10px] text-theme-muted/80 uppercase tracking-widest">
      Read-only mode enabled. No changes will be persisted.
    </p>
  </div>
</div>
