<script lang="ts">
  import type { DelveRoomNodeData, DungeonRoomRole } from "generator-engine";
  import { getRoleBadgeConfig } from "./delve-helpers";

  let {
    isOpen = false,
    roomData = null,
    isRegenerating = false,
    errorMessage = null,
    onSave,
    onRegenerateAi,
    onClose,
  }: {
    isOpen: boolean;
    roomData: DelveRoomNodeData | null;
    isRegenerating?: boolean;
    errorMessage?: string | null;
    onSave: (updated: DelveRoomNodeData) => void;
    onRegenerateAi: (room: DelveRoomNodeData) => void;
    onClose: () => void;
  } = $props();

  let name = $state("");
  let role = $state<DungeonRoomRole>("encounter");
  let description = $state("");
  let atmosphere = $state("");
  let encountersText = $state("");
  let hazardsText = $state("");
  let treasureText = $state("");
  let secretsText = $state("");
  let climaxStakes = $state("");
  let climaxDecision = $state("");
  let climaxOutcomesText = $state("");

  $effect(() => {
    if (roomData) {
      name = roomData.name ?? "";
      role = roomData.role ?? "encounter";
      description = roomData.description ?? "";
      atmosphere = roomData.stocking?.atmosphere ?? "";
      encountersText = (roomData.stocking?.encounters ?? []).join("\n");
      hazardsText = (roomData.stocking?.hazards ?? []).join("\n");
      treasureText = (roomData.stocking?.treasure ?? []).join("\n");
      secretsText = (roomData.stocking?.secrets ?? []).join("\n");
      climaxStakes = roomData.climax?.stakes ?? "";
      climaxDecision = roomData.climax?.decision ?? "";
      climaxOutcomesText = (roomData.climax?.outcomes ?? []).join("\n");
    }
  });

  const roleConfig = $derived(getRoleBadgeConfig(role));

  function handleSave() {
    if (!roomData) return;
    const splitLines = (str: string) =>
      str
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);

    onSave({
      ...roomData,
      name: name.trim() || roomData.name,
      role,
      description: description.trim(),
      stocking: {
        ...roomData.stocking,
        atmosphere: atmosphere.trim() || undefined,
        encounters: splitLines(encountersText),
        hazards: splitLines(hazardsText),
        treasure: splitLines(treasureText),
        secrets: splitLines(secretsText),
      },
      climax:
        role === "climax"
          ? {
              stakes: climaxStakes.trim(),
              decision: climaxDecision.trim(),
              outcomes: splitLines(climaxOutcomesText),
            }
          : undefined,
    });
    onClose();
  }

  function handleWindowKeydown(event: KeyboardEvent) {
    if (isOpen && event.key === "Escape") onClose();
  }
</script>

<svelte:window onkeydown={handleWindowKeydown} />

{#if isOpen && roomData}
  <div
    class="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-theme-bg border-l border-theme-border shadow-2xl p-6 overflow-y-auto flex flex-col justify-between"
    role="dialog"
    aria-labelledby="area-inspector-title"
  >
    <div class="space-y-4">
      <div
        class="flex items-center justify-between border-b border-theme-border/60 pb-3"
      >
        <div class="flex items-center gap-2">
          <h2 id="area-inspector-title" class="sr-only">Area Details</h2>
          <span
            class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold uppercase border {roleConfig.colorClass}"
          >
            <span class="{roleConfig.icon} w-3.5 h-3.5" aria-hidden="true"
            ></span>
            {roleConfig.label}
          </span>
          <span class="text-xs font-mono text-theme-muted">
            {roomData.sectorName || "Sector Node"}
          </span>
        </div>
        <button
          type="button"
          onclick={onClose}
          aria-label="Close Area details"
          class="text-theme-muted hover:text-theme-text transition-colors"
        >
          <span class="icon-[lucide--x] w-4 h-4"></span>
        </button>
      </div>

      <div class="space-y-3">
        <div>
          <label
            for="area-title"
            class="block text-xs font-mono font-bold uppercase tracking-wider text-theme-muted mb-1"
          >
            Area Title
          </label>
          <input
            id="area-title"
            type="text"
            bind:value={name}
            class="w-full bg-theme-surface/40 border border-theme-border/70 rounded-xl px-3 py-2 text-sm text-theme-text focus:border-theme-primary outline-none"
          />
        </div>

        <div>
          <label
            for="area-role"
            class="block text-xs font-mono font-bold uppercase tracking-wider text-theme-muted mb-1"
          >
            Area Role
          </label>
          <select
            id="area-role"
            bind:value={role}
            class="w-full bg-theme-surface/40 border border-theme-border/70 rounded-xl px-3 py-2 text-sm text-theme-text focus:border-theme-primary outline-none"
          >
            <option value="entrance">Entrance</option>
            <option value="encounter">Encounter</option>
            <option value="hazard">Hazard</option>
            <option value="treasure">Treasure</option>
            <option value="secret">Secret</option>
            <option value="lore">Lore</option>
            <option value="faction">Faction</option>
            <option value="climax">Climax</option>
            <option value="special">Special</option>
          </select>
        </div>

        <div>
          <label
            for="area-description"
            class="block text-xs font-mono font-bold uppercase tracking-wider text-theme-muted mb-1"
          >
            Description
          </label>
          <textarea
            id="area-description"
            bind:value={description}
            rows="3"
            class="w-full bg-theme-surface/40 border border-theme-border/70 rounded-xl px-3 py-2 text-xs text-theme-text focus:border-theme-primary outline-none resize-y"
          ></textarea>
        </div>

        <div>
          <label
            for="area-atmosphere"
            class="block text-xs font-mono font-bold uppercase tracking-wider text-theme-muted mb-1"
          >
            Atmosphere
          </label>
          <input
            id="area-atmosphere"
            type="text"
            bind:value={atmosphere}
            placeholder="e.g. Freezing draft, hum of ancient runes"
            class="w-full bg-theme-surface/40 border border-theme-border/70 rounded-xl px-3 py-2 text-xs text-theme-text focus:border-theme-primary outline-none"
          />
        </div>

        <div class="grid grid-cols-2 gap-2">
          <div>
            <label
              for="area-encounters"
              class="block text-[10px] font-mono font-bold uppercase tracking-wider text-rose-400 mb-1"
            >
              Encounters (1 per line)
            </label>
            <textarea
              id="area-encounters"
              bind:value={encountersText}
              rows="3"
              class="w-full bg-theme-surface/40 border border-theme-border/70 rounded-xl p-2 text-xs text-theme-text focus:border-theme-primary outline-none"
            ></textarea>
          </div>
          <div>
            <label
              for="area-hazards"
              class="block text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 mb-1"
            >
              Hazards / Traps
            </label>
            <textarea
              id="area-hazards"
              bind:value={hazardsText}
              rows="3"
              class="w-full bg-theme-surface/40 border border-theme-border/70 rounded-xl p-2 text-xs text-theme-text focus:border-theme-primary outline-none"
            ></textarea>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-2">
          <div>
            <label
              for="area-treasure"
              class="block text-[10px] font-mono font-bold uppercase tracking-wider text-yellow-400 mb-1"
            >
              Treasure / Loot
            </label>
            <textarea
              id="area-treasure"
              bind:value={treasureText}
              rows="3"
              class="w-full bg-theme-surface/40 border border-theme-border/70 rounded-xl p-2 text-xs text-theme-text focus:border-theme-primary outline-none"
            ></textarea>
          </div>
          <div>
            <label
              for="area-secrets"
              class="block text-[10px] font-mono font-bold uppercase tracking-wider text-purple-400 mb-1"
            >
              Secrets / Clues
            </label>
            <textarea
              id="area-secrets"
              bind:value={secretsText}
              rows="3"
              class="w-full bg-theme-surface/40 border border-theme-border/70 rounded-xl p-2 text-xs text-theme-text focus:border-theme-primary outline-none"
            ></textarea>
          </div>
        </div>

        {#if role === "climax"}
          <fieldset
            class="space-y-3 rounded-xl border border-red-400/30 bg-red-500/5 p-3"
          >
            <legend
              class="px-1 text-[10px] font-mono font-bold uppercase tracking-wider text-red-300"
            >
              Climax Resolution
            </legend>
            <p
              id="climax-resolution-help"
              class="text-[10px] leading-relaxed text-theme-muted"
            >
              Define what is at risk, the decision facing the players, and how
              the delve can change.
            </p>
            <div>
              <label
                for="area-climax-stakes"
                class="block text-[10px] font-mono font-bold uppercase tracking-wider text-theme-muted mb-1"
              >
                Stakes
              </label>
              <textarea
                id="area-climax-stakes"
                name="climax-stakes"
                bind:value={climaxStakes}
                rows="2"
                aria-describedby="climax-resolution-help"
                class="w-full resize-y rounded-xl border border-theme-border/70 bg-theme-surface/40 p-2 text-xs text-theme-text outline-none focus:border-theme-primary"
              ></textarea>
            </div>
            <div>
              <label
                for="area-climax-decision"
                class="block text-[10px] font-mono font-bold uppercase tracking-wider text-theme-muted mb-1"
              >
                Player Decision
              </label>
              <textarea
                id="area-climax-decision"
                name="climax-decision"
                bind:value={climaxDecision}
                rows="2"
                class="w-full resize-y rounded-xl border border-theme-border/70 bg-theme-surface/40 p-2 text-xs text-theme-text outline-none focus:border-theme-primary"
              ></textarea>
            </div>
            <div>
              <label
                for="area-climax-outcomes"
                class="block text-[10px] font-mono font-bold uppercase tracking-wider text-theme-muted mb-1"
              >
                Possible Outcomes (1 per line)
              </label>
              <textarea
                id="area-climax-outcomes"
                name="climax-outcomes"
                bind:value={climaxOutcomesText}
                rows="3"
                class="w-full resize-y rounded-xl border border-theme-border/70 bg-theme-surface/40 p-2 text-xs text-theme-text outline-none focus:border-theme-primary"
              ></textarea>
            </div>
          </fieldset>
        {/if}
      </div>
    </div>

    <div
      class="flex items-center justify-between gap-2 pt-4 border-t border-theme-border/60 mt-4"
    >
      {#if errorMessage}
        <p
          class="text-xs text-red-400 max-w-[14rem]"
          role="alert"
          aria-live="polite"
        >
          {errorMessage}
        </p>
      {/if}
      <button
        type="button"
        onclick={() => roomData && onRegenerateAi(roomData)}
        disabled={isRegenerating}
        class="inline-flex items-center gap-1.5 px-3 py-2 bg-theme-primary/10 border border-theme-primary/30 text-theme-primary text-xs font-bold font-header uppercase tracking-wider rounded-xl hover:bg-theme-primary/20 transition-all disabled:opacity-50"
      >
        <span
          class="{isRegenerating
            ? 'icon-[lucide--loader-2] animate-spin'
            : 'icon-[lucide--sparkles]'} w-3.5 h-3.5"
          aria-hidden="true"
        ></span>
        {isRegenerating ? "Enhancing..." : "Enhance Area with AI"}
      </button>

      <div class="flex items-center gap-2">
        <button
          type="button"
          onclick={onClose}
          class="px-3 py-2 text-xs font-bold font-header uppercase tracking-wider text-theme-muted hover:text-theme-text transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onclick={handleSave}
          class="px-4 py-2 bg-theme-primary text-theme-bg text-xs font-bold font-header uppercase tracking-wider rounded-xl hover:brightness-110 transition-all shadow"
        >
          Save Area
        </button>
      </div>
    </div>
  </div>
{/if}
