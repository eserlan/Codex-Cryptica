<script lang="ts">
  import type { Entity, VaultEntitySummary } from "schema";
  import type { SoundBiteVoiceMode } from "schema";
  import { vault } from "$lib/stores/vault.svelte";
  import { soundBiteService } from "$lib/services/SoundBiteService.svelte";
  import { p2pHost } from "$lib/cloud-bridge/p2p/host-service.svelte";
  import { onMount } from "svelte";

  let { entity, onClose } = $props<{ entity: Entity; onClose?: () => void }>();

  // ─── State ────────────────────────────────────────────────────────────────

  let voiceMode = $state<SoundBiteVoiceMode>("entity");
  let audioObjectUrl = $state<string | null>(null);
  let audioLoading = $state(false); // true while resolving audioFile from vault
  let showOverwriteConfirm = $state(false);
  let audioEl = $state<HTMLAudioElement | null>(null);

  // ─── Derived ──────────────────────────────────────────────────────────────

  const isGuest = $derived(vault.isGuest);
  const saved = $derived(soundBiteService.savedSoundBite);
  const result = $derived(soundBiteService.result);
  const isGenerating = $derived(soundBiteService.isGenerating);
  const error = $derived(soundBiteService.error);
  const hasGuests = $derived(
    p2pHost.isHosting && p2pHost.connections.length > 0,
  );

  /** The sound bite to display: transient result takes priority over saved */
  const displayed = $derived(result ?? saved ?? null);

  /** True when the displayed bite has usable audio (or is loading it) */
  const hasAudio = $derived(
    !!result?.audioBlob || !!displayed?.audioFile || !!displayed?.audioData,
  );
  /** True when the audio URL is ready to play */
  const audioReady = $derived(hasAudio && !!audioObjectUrl && !audioLoading);

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  onMount(() => {
    const autoPlay = soundBiteService.pendingAutoPlay;
    // keepAutoPlay=true so the flag survives the loadFromEntity reset and we
    // can read it below in the auto-play effect.
    soundBiteService.loadFromEntity(entity, true);

    if (!autoPlay) {
      soundBiteService.pendingAutoPlay = false;
    }
  });

  // Rebuild audio object URL whenever the audio source changes.
  // Resolution priority: transient blob > saved file path > legacy base64.
  // The effect only READS reactive deps, then WRITES audioObjectUrl without
  // reading it back — no feedback loop. Cleanup revokes the URL on re-run.
  $effect(() => {
    const blob = result?.audioBlob ?? null;
    const audioFile = displayed?.audioFile ?? null;
    const audioData = displayed?.audioData ?? null;

    let newUrl: string | null = null;

    if (blob) {
      newUrl = URL.createObjectURL(blob);
      audioObjectUrl = newUrl;
      audioLoading = false;
    } else if (audioFile) {
      // Async resolution from vault. Use a local `cancelled` flag so that a
      // stale promise from a previous effect run can't overwrite the new URL.
      audioLoading = true;
      audioObjectUrl = null;
      let cancelled = false;
      vault.resolveImageUrl(audioFile).then((url) => {
        if (!cancelled) {
          audioObjectUrl = url || null;
          audioLoading = false;
        }
      });
      return () => {
        cancelled = true;
      };
    } else if (audioData) {
      // Legacy: base64-encoded audio stored directly in the entity.
      const bytes = atob(audioData);
      const arr = new Uint8Array(bytes.length);
      for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
      const legacyBlob = new Blob([arr], { type: "audio/wav" });
      newUrl = URL.createObjectURL(legacyBlob);
      audioObjectUrl = newUrl;
      audioLoading = false;
    } else {
      audioObjectUrl = null;
      audioLoading = false;
    }

    return () => {
      if (newUrl) URL.revokeObjectURL(newUrl);
    };
  });

  // Auto-play when the host broadcasts a sound bite to all guests.
  // Fires once the audio URL is resolved and the <audio> element is mounted.
  $effect(() => {
    if (!soundBiteService.pendingAutoPlay) return;
    if (!audioReady || !audioObjectUrl) return;
    if (!audioEl) return;

    soundBiteService.pendingAutoPlay = false;
    audioEl.play().catch(() => {
      // Auto-play blocked by browser policy — user can click play manually.
    });
  });

  // ─── Actions ──────────────────────────────────────────────────────────────

  function buildVaultSummaries(): VaultEntitySummary[] {
    return Object.values(vault.entities)
      .filter((e) => e.id !== entity.id)
      .slice(0, 30)
      .map((e) => ({
        title: e.title,
        type: e.type,
        summary: (e.content ?? "").slice(0, 150),
      }));
  }

  async function handleGenerate() {
    await soundBiteService.generate(entity, voiceMode, buildVaultSummaries());
  }

  async function handleSave() {
    if (saved) {
      showOverwriteConfirm = true;
      return;
    }
    await soundBiteService.save(entity);
  }

  async function confirmOverwrite() {
    showOverwriteConfirm = false;
    await soundBiteService.save(entity);
  }

  async function handleDelete() {
    // Release vault-cached URL before deleting (keeps AssetManager ref-counts correct).
    const fileToRelease = saved?.audioFile;
    await soundBiteService.deleteSoundBite(entity);
    if (fileToRelease) {
      vault.releaseImageUrl(fileToRelease);
    }
    audioObjectUrl = null;
  }

  async function handleCopy() {
    if (displayed?.transcript) {
      await navigator.clipboard.writeText(displayed.transcript);
    }
  }
</script>

<!-- ─── Sound Bite Section ─────────────────────────────────────────────────── -->
<!-- When used as a modal (onClose provided) the outer padding is removed; the
     modal card wrapper already handles spacing and rounded corners. -->
<div class={onClose ? "" : "px-4 md:px-6 pb-4 md:pb-6"}>
  <div
    class={onClose
      ? ""
      : "border border-theme-border rounded-lg overflow-hidden"}
  >
    <!-- Header -->
    <div
      class="flex items-center gap-2 px-4 py-2 bg-theme-surface-alt border-b border-theme-border"
    >
      <span class="icon-[lucide--mic] w-3.5 h-3.5 text-theme-accent shrink-0"
      ></span>
      <span
        class="text-xs uppercase tracking-widest font-header text-theme-muted"
      >
        Sound Bite
      </span>

      {#if onClose}
        <button
          class="ml-auto p-0.5 text-theme-muted hover:text-theme-text transition-colors"
          onclick={onClose}
          aria-label="Close sound bite"
          title="Close"
        >
          <span class="icon-[lucide--x] w-4 h-4"></span>
        </button>
      {:else if !isGuest && !displayed}
        <!-- Voice mode selector -->
        <div class="ml-auto flex items-center gap-1 text-xs">
          <button
            class="px-2 py-0.5 rounded transition-colors {voiceMode === 'entity'
              ? 'bg-theme-accent text-white'
              : 'text-theme-muted hover:text-theme-text'}"
            onclick={() => (voiceMode = "entity")}
            aria-pressed={voiceMode === "entity"}
          >
            Entity
          </button>
          <button
            class="px-2 py-0.5 rounded transition-colors {voiceMode ===
            'scholar'
              ? 'bg-theme-accent text-white'
              : 'text-theme-muted hover:text-theme-text'}"
            onclick={() => (voiceMode = "scholar")}
            aria-pressed={voiceMode === "scholar"}
          >
            Scholar
          </button>
        </div>
      {/if}
    </div>

    <div class="p-4">
      <!-- Error state -->
      {#if error}
        <p class="text-sm text-theme-muted italic mb-3">{error}</p>
        {#if !isGuest}
          <button
            class="text-xs text-theme-accent hover:underline"
            onclick={handleGenerate}
          >
            Try again
          </button>
        {/if}

        <!-- Loading state -->
      {:else if isGenerating}
        <div class="flex items-center gap-2 text-sm text-theme-muted">
          <span
            class="icon-[lucide--loader-2] w-4 h-4 animate-spin text-theme-accent"
          ></span>
          Generating sound bite…
        </div>

        <!-- Result / Saved state -->
      {:else if displayed}
        <!-- Audio player -->
        {#if audioReady}
          <audio
            bind:this={audioEl}
            src={audioObjectUrl}
            controls
            aria-label="Sound bite audio player"
            class="w-full h-8 mb-3 rounded"
          ></audio>
        {:else if audioLoading}
          <div class="flex items-center gap-1.5 text-xs text-theme-muted mb-3">
            <span class="icon-[lucide--loader-2] w-3 h-3 animate-spin"></span>
            Loading audio…
          </div>
        {:else if !hasAudio}
          <p class="text-xs text-theme-muted italic mb-2">
            Audio unavailable — transcript only.
          </p>
        {/if}

        <!-- Transcript -->
        <blockquote class="text-sm text-theme-text leading-relaxed italic">
          "{displayed.transcript}"
        </blockquote>

        <!-- Scholar byline -->
        {#if displayed.voiceMode === "scholar" && (displayed.scholarName || soundBiteService.result?.scholarAttribution)}
          {@const name =
            displayed.scholarName ??
            soundBiteService.result?.scholarAttribution?.name}
          {@const title =
            displayed.scholarTitle ??
            soundBiteService.result?.scholarAttribution?.title}
          <p class="text-xs text-theme-muted mt-2 text-right">
            — {name}{title ? `, ${title}` : ""}
          </p>
        {/if}

        <!-- Voice profile badge — shows saved voice characteristics -->
        {#if displayed.voiceProfile}
          {@const vp = displayed.voiceProfile}
          {@const parts = [
            vp.ageRange?.replace("-", " "),
            vp.gender,
            vp.accent ? `· ${vp.accent} accent` : null,
            vp.tone ? `· ${vp.tone}` : null,
          ].filter(Boolean)}
          <p
            class="text-xs text-theme-muted mt-2 flex items-center gap-1 flex-wrap"
          >
            <span class="icon-[lucide--mic] w-2.5 h-2.5 shrink-0 opacity-60"
            ></span>
            {parts.join(" ")}
          </p>
        {/if}

        <!-- Host controls -->
        {#if !isGuest}
          <div
            class="flex items-center gap-2 mt-3 pt-3 border-t border-theme-border"
          >
            <!-- Regenerate -->
            <button
              class="flex items-center gap-1 text-xs text-theme-muted hover:text-theme-text transition-colors"
              onclick={handleGenerate}
              disabled={isGenerating}
              title="Regenerate sound bite"
            >
              <span class="icon-[lucide--refresh-cw] w-3 h-3"></span>
              Regenerate
            </button>

            <div class="flex-1"></div>

            <!-- Play for all guests -->
            {#if hasGuests && saved}
              <button
                class="flex items-center gap-1 text-xs text-theme-accent hover:opacity-80 transition-opacity"
                onclick={() => p2pHost.broadcastSoundBitePlay(entity.id)}
                title="Play sound bite for all connected guests"
              >
                <span class="icon-[lucide--radio] w-3 h-3"></span>
                Play for all
              </button>
            {/if}

            <!-- Copy -->
            <button
              class="flex items-center gap-1 text-xs text-theme-muted hover:text-theme-text transition-colors"
              onclick={handleCopy}
              title="Copy transcript"
            >
              <span class="icon-[lucide--copy] w-3 h-3"></span>
              Copy
            </button>

            <!-- Save / Remove -->
            {#if saved}
              <button
                class="flex items-center gap-1 text-xs text-theme-muted hover:text-theme-danger transition-colors"
                onclick={handleDelete}
                title="Remove saved sound bite"
              >
                <span class="icon-[lucide--trash-2] w-3 h-3"></span>
                Remove
              </button>
            {:else}
              <button
                class="flex items-center gap-1 text-xs text-theme-accent hover:opacity-80 transition-opacity"
                onclick={handleSave}
                title="Save sound bite to entity"
              >
                <span class="icon-[lucide--save] w-3 h-3"></span>
                Save
              </button>
            {/if}
          </div>
        {/if}

        <!-- Empty state — host -->
      {:else if !isGuest}
        <div class="flex flex-col items-center gap-3 py-2">
          <p class="text-xs text-theme-muted text-center">
            Generate a short audio clip in the voice of this entity or a named
            scholar.
          </p>

          <!-- Voice mode selector (empty state) -->
          <div
            class="flex items-center gap-1 text-xs"
            role="group"
            aria-label="Voice mode"
          >
            <button
              class="px-3 py-1 rounded transition-colors {voiceMode === 'entity'
                ? 'bg-theme-accent text-white'
                : 'bg-theme-surface text-theme-muted hover:text-theme-text border border-theme-border'}"
              onclick={() => (voiceMode = "entity")}
              aria-pressed={voiceMode === "entity"}
            >
              Entity Voice
            </button>
            <button
              class="px-3 py-1 rounded transition-colors {voiceMode ===
              'scholar'
                ? 'bg-theme-accent text-white'
                : 'bg-theme-surface text-theme-muted hover:text-theme-text border border-theme-border'}"
              onclick={() => (voiceMode = "scholar")}
              aria-pressed={voiceMode === "scholar"}
            >
              Scholar Voice
            </button>
          </div>

          <button
            class="flex items-center gap-2 px-4 py-1.5 rounded bg-theme-accent text-white text-xs font-medium hover:opacity-90 transition-opacity"
            onclick={handleGenerate}
            disabled={isGenerating}
          >
            <span class="icon-[lucide--mic] w-3.5 h-3.5"></span>
            Generate Sound Bite
          </button>
        </div>

        <!-- Empty state — guest (no saved sound bite) -->
      {:else}
        <!-- Nothing shown to guests when no saved sound bite -->
      {/if}
    </div>
  </div>
</div>

<!-- Overwrite confirmation -->
{#if showOverwriteConfirm}
  <div
    class="fixed inset-0 z-[120] flex items-center justify-center bg-black/50"
    role="dialog"
    aria-modal="true"
    aria-label="Overwrite saved sound bite"
  >
    <div
      class="bg-theme-surface border border-theme-border rounded-lg p-5 max-w-sm mx-4 shadow-xl"
    >
      <p class="text-sm text-theme-text mb-4">
        This entity already has a saved sound bite. Replace it with the new one?
      </p>
      <div class="flex gap-2 justify-end">
        <button
          class="px-3 py-1.5 text-xs rounded border border-theme-border text-theme-muted hover:text-theme-text"
          onclick={() => (showOverwriteConfirm = false)}
        >
          Cancel
        </button>
        <button
          class="px-3 py-1.5 text-xs rounded bg-theme-accent text-white hover:opacity-90"
          onclick={confirmOverwrite}
        >
          Replace
        </button>
      </div>
    </div>
  </div>
{/if}
