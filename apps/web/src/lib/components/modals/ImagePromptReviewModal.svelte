<script lang="ts">
  import { fade, scale } from "svelte/transition";
  import { focusTrap } from "$lib/actions/focusTrap";
  import { oracle } from "$lib/stores/oracle.svelte";
  import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
  import { notificationStore } from "$lib/stores/ui/notification.svelte";

  const dialog = $derived(modalUIStore.imagePromptReview);
  const target = $derived(dialog.target);
  let editedPrompt = $state("");
  let negativeTerms = $state<string[]>([]);
  let error = $state("");
  let isRevisingPrompt = $state(false);
  let showAdvanced = $state(false);

  // Advanced Art Direction settings. Ordinary use never touches these; the
  // category and theme defaults already supply framing and style.
  let cameraVariant = $state("");
  let styleReferenceMode = $state<"named" | "name-free" | "disabled">("named");
  let stature = $state("");
  // What the last revision actually composed at. Stature is normally read from
  // the entity's labels, so without this the setting is invisible until an
  // image comes back looking wrong.
  let resolvedStature = $state("");
  let resolvedStatureSource = $state("");

  const CAMERA_VARIANTS = [
    { value: "", label: "Category default" },
    { value: "portrait", label: "Portrait (characters)" },
    { value: "anatomy", label: "Anatomy study (creatures)" },
    { value: "interior", label: "Interior (locations)" },
    { value: "in-hand", label: "In hand (items)" },
    { value: "authority", label: "Authority (factions)" },
    { value: "ranks", label: "Massed ranks (factions)" },
    { value: "aftermath", label: "Aftermath (events)" },
  ];

  const STATURES = [
    { value: "", label: "Auto (from labels)" },
    { value: "mundane", label: "Mundane" },
    { value: "renowned", label: "Renowned" },
    { value: "mythic", label: "Mythic" },
    { value: "divine", label: "Divine" },
  ];

  const STATURE_SOURCES: Record<string, string> = {
    explicit: "your choice",
    labels: "from labels",
    inferred: "read from your lore",
  };

  const STATURE_LABELS: Record<string, string> = {
    mundane: "Mundane",
    renowned: "Renowned",
    mythic: "Mythic",
    divine: "Divine",
  };

  const STYLE_MODES = [
    { value: "named", label: "Named style lineage" },
    { value: "name-free", label: "Name-free description" },
    { value: "disabled", label: "No style lineage" },
  ] as const;

  $effect(() => {
    if (dialog.open) {
      editedPrompt = dialog.prompt;
      negativeTerms = dialog.negativeTerms;
      error = "";
      isRevisingPrompt = false;
      showAdvanced = false;
      cameraVariant = "";
      styleReferenceMode = "named";
      stature = "";
      resolvedStature = "";
      resolvedStatureSource = "";
    }
  });

  const isRevising = $derived.by(() => {
    if (!target) return false;
    return target.kind === "entity"
      ? oracle.isVisualizingEntity(target.id)
      : oracle.isVisualizingMessage(target.id);
  });
  const isBusy = $derived(isRevising || isRevisingPrompt);

  const handleCancel = () => {
    if (isBusy) return;
    modalUIStore.closeImagePromptReview();
  };

  const handleSubmit = async (event: SubmitEvent) => {
    event.preventDefault();
    if (!target || isBusy) return;

    const prompt = editedPrompt.trim();
    if (!prompt) {
      error = "Prompt is required.";
      return;
    }

    error = "";
    if (target.kind === "entity") {
      await oracle.generateEntityFromPrompt(target.id, prompt);
    } else {
      await oracle.generateMessageFromPrompt(target.id, prompt);
    }
    modalUIStore.closeImagePromptReview();
  };

  const copyPrompt = async () => {
    // Negatives are part of the request, so an external generator needs them
    // too — otherwise a pasted prompt behaves differently from ours.
    const text = negativeTerms.length
      ? `${editedPrompt}\n\nNegative prompt:\n${negativeTerms.join(", ")}`
      : editedPrompt;
    try {
      await navigator.clipboard.writeText(text);
      notificationStore.notify("Copied image prompt", "success");
    } catch {
      notificationStore.notify("Could not copy image prompt.", "error");
    }
  };

  const regeneratePrompt = async () => {
    if (!target || isBusy) return;

    isRevisingPrompt = true;
    error = "";
    try {
      const options = {
        cameraVariant: cameraVariant || undefined,
        styleReferenceMode,
        stature: stature || undefined,
      };
      const result =
        target.kind === "entity"
          ? await oracle.regenerateEntityPrompt(target.id, options)
          : await oracle.regenerateMessagePrompt(target.id, options);
      if (result?.prompt?.trim()) {
        editedPrompt = result.prompt.trim();
        negativeTerms = result.negativeTerms;
        resolvedStature = result.statureId || "mundane";
        resolvedStatureSource = result.statureSource || "";
      } else {
        error = "Could not revise a prompt.";
      }
    } catch (err) {
      error = err instanceof Error ? err.message : "Could not revise a prompt.";
    } finally {
      isRevisingPrompt = false;
    }
  };

  const handleKeydown = (event: KeyboardEvent) => {
    if (!dialog.open) return;
    if (event.key === "Escape") {
      handleCancel();
    }
  };
</script>

<svelte:window onkeydown={handleKeydown} />

{#if dialog.open && target}
  <div
    class="fixed inset-0 z-[210] flex items-center justify-center p-3 md:p-6"
    transition:fade={{ duration: 160 }}
  >
    <button
      type="button"
      class="absolute inset-0 h-full w-full bg-black/85 backdrop-blur-md focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-theme-primary cursor-default"
      aria-label="Close Image Prompt Review Dialog"
      onclick={handleCancel}
    ></button>
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="image-prompt-title"
      aria-describedby="image-prompt-help"
      tabindex="-1"
      use:focusTrap
      class="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-theme-border bg-theme-surface shadow-2xl"
      transition:scale={{ duration: 180, start: 0.97 }}
      onclick={(event) => event.stopPropagation()}
      onkeydown={(event) => event.stopPropagation()}
    >
      <form class="flex min-h-0 flex-1 flex-col" onsubmit={handleSubmit}>
        <div
          class="flex items-start justify-between gap-4 border-b border-theme-border px-4 py-4 md:px-6"
        >
          <div class="min-w-0">
            <h2
              id="image-prompt-title"
              class="font-header text-sm font-bold uppercase tracking-widest text-theme-primary"
            >
              Review Image Prompt
            </h2>
            <p
              id="image-prompt-help"
              class="mt-1 truncate text-xs text-theme-muted"
            >
              {target.title}
            </p>
          </div>
          <button
            type="button"
            onclick={handleCancel}
            disabled={isBusy}
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-theme-border text-theme-muted transition hover:border-theme-primary hover:text-theme-primary disabled:cursor-wait disabled:opacity-50"
            aria-label="Close prompt review"
            title="Close"
          >
            <span aria-hidden="true" class="icon-[lucide--x] h-4 w-4"></span>
          </button>
        </div>

        <div class="flex-1 overflow-y-auto px-4 py-4 md:px-6">
          <label
            for="image-prompt-review-text"
            class="mb-2 block text-[10px] font-bold uppercase tracking-widest text-theme-secondary"
          >
            Prompt
          </label>
          <textarea
            id="image-prompt-review-text"
            name="prompt"
            bind:value={editedPrompt}
            required
            rows="14"
            aria-describedby={error
              ? "image-prompt-error"
              : "image-prompt-help"}
            class="min-h-72 w-full resize-y rounded border border-theme-border bg-theme-bg/60 p-3 font-body text-sm leading-relaxed text-theme-text outline-none transition focus:border-theme-primary focus:ring-1 focus:ring-theme-primary"
          ></textarea>
          {#if error}
            <p
              id="image-prompt-error"
              class="mt-2 text-xs font-bold text-red-400"
              aria-live="polite"
            >
              {error}
            </p>
          {/if}

          {#if negativeTerms.length}
            <div class="mt-4">
              <p
                class="mb-2 text-[10px] font-bold uppercase tracking-widest text-theme-secondary"
              >
                Negative prompt
              </p>
              <p
                data-testid="image-prompt-negative"
                class="rounded border border-theme-border bg-theme-bg/40 p-3 font-body text-xs leading-relaxed text-theme-muted"
              >
                {negativeTerms.join(", ")}
              </p>
              <p class="mt-1 text-[10px] text-theme-muted">
                Sent separately where your image provider supports it, and
                folded into the prompt where it does not.
              </p>
            </div>
          {/if}

          <div class="mt-4 border-t border-theme-border pt-3">
            <button
              type="button"
              onclick={() => (showAdvanced = !showAdvanced)}
              aria-expanded={showAdvanced}
              class="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-theme-muted transition hover:text-theme-primary"
            >
              <span
                class="h-3 w-3 {showAdvanced
                  ? 'icon-[lucide--chevron-down]'
                  : 'icon-[lucide--chevron-right]'}"
                aria-hidden="true"
              ></span>
              Advanced art direction
            </button>

            {#if showAdvanced}
              <div class="mt-3 grid gap-3 md:grid-cols-2">
                <label class="block">
                  <span
                    class="mb-1 block text-[10px] font-bold uppercase tracking-widest text-theme-secondary"
                  >
                    Camera
                  </span>
                  <select
                    bind:value={cameraVariant}
                    data-testid="image-prompt-camera-variant"
                    class="w-full rounded border border-theme-border bg-theme-bg/60 p-2 font-body text-sm text-theme-text outline-none transition focus:border-theme-primary"
                  >
                    {#each CAMERA_VARIANTS as variant (variant.value)}
                      <option value={variant.value}>{variant.label}</option>
                    {/each}
                  </select>
                </label>

                <label class="block">
                  <span
                    class="mb-1 block text-[10px] font-bold uppercase tracking-widest text-theme-secondary"
                  >
                    Stature
                  </span>
                  <select
                    bind:value={stature}
                    data-testid="image-prompt-stature"
                    class="w-full rounded border border-theme-border bg-theme-bg/60 p-2 font-body text-sm text-theme-text outline-none transition focus:border-theme-primary"
                  >
                    {#each STATURES as option (option.value)}
                      <option value={option.value}>{option.label}</option>
                    {/each}
                  </select>
                </label>

                <label class="block">
                  <span
                    class="mb-1 block text-[10px] font-bold uppercase tracking-widest text-theme-secondary"
                  >
                    Style reference
                  </span>
                  <select
                    bind:value={styleReferenceMode}
                    data-testid="image-prompt-style-mode"
                    class="w-full rounded border border-theme-border bg-theme-bg/60 p-2 font-body text-sm text-theme-text outline-none transition focus:border-theme-primary"
                  >
                    {#each STYLE_MODES as mode (mode.value)}
                      <option value={mode.value}>{mode.label}</option>
                    {/each}
                  </select>
                </label>
              </div>
              <p class="mt-2 text-[10px] text-theme-muted">
                Choose a camera that matches the subject's category. Stature
                decides whether something is drawn as ordinary, renowned, or
                worshipped, and is read from labels like <em>deity</em> unless you
                set it here. Revise the prompt to apply these.
              </p>
              {#if resolvedStature}
                <p
                  class="mt-1 text-[10px] font-bold uppercase tracking-widest text-theme-secondary"
                  data-testid="image-prompt-resolved-stature"
                >
                  Drawn as: {STATURE_LABELS[resolvedStature] ||
                    resolvedStature}{#if STATURE_SOURCES[resolvedStatureSource]}
                    <span class="font-normal normal-case tracking-normal"
                      >({STATURE_SOURCES[resolvedStatureSource]})</span
                    >{/if}
                </p>
              {/if}
            {/if}
          </div>
        </div>

        <div
          class="flex flex-col-reverse gap-2 border-t border-theme-border bg-theme-bg/30 px-4 py-4 md:flex-row md:justify-end md:px-6"
        >
          <button
            type="button"
            onclick={copyPrompt}
            disabled={isBusy}
            class="inline-flex min-h-11 items-center justify-center gap-2 rounded border border-theme-border bg-theme-surface px-4 py-2 text-xs font-bold uppercase tracking-widest text-theme-muted transition hover:border-theme-primary hover:text-theme-primary disabled:cursor-wait disabled:opacity-50"
          >
            <span class="icon-[lucide--copy] h-4 w-4"></span>
            Copy
          </button>
          <button
            type="button"
            onclick={regeneratePrompt}
            disabled={isBusy}
            aria-busy={isRevisingPrompt}
            class="inline-flex min-h-11 items-center justify-center gap-2 rounded border border-theme-border bg-theme-surface px-4 py-2 text-xs font-bold uppercase tracking-widest text-theme-muted transition hover:border-theme-primary hover:text-theme-primary disabled:cursor-wait disabled:opacity-50"
          >
            {#if isRevisingPrompt}
              <span
                class="icon-[lucide--loader-2] h-4 w-4 animate-spin"
                aria-hidden="true"
              ></span>
              Revising
            {:else}
              <span class="icon-[lucide--refresh-cw] h-4 w-4"></span>
              Revise Prompt
            {/if}
          </button>
          <button
            type="button"
            onclick={handleCancel}
            disabled={isBusy}
            class="inline-flex min-h-11 items-center justify-center rounded border border-theme-border bg-theme-surface px-4 py-2 text-xs font-bold uppercase tracking-widest text-theme-muted transition hover:text-theme-text disabled:cursor-wait disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isBusy}
            aria-busy={isRevising}
            class="inline-flex min-h-11 items-center justify-center gap-2 rounded border border-theme-primary bg-theme-primary px-4 py-2 text-xs font-bold uppercase tracking-widest text-theme-bg transition hover:bg-theme-secondary disabled:cursor-wait disabled:opacity-60"
          >
            {#if isRevising}
              <span
                class="icon-[lucide--loader-2] h-4 w-4 animate-spin"
                aria-hidden="true"
              ></span>
              Generating
            {:else}
              <span class="icon-[lucide--image-plus] h-4 w-4"></span>
              Generate
            {/if}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}
