<script lang="ts">
  import type { DelveRoomNodeData, DungeonRoomRole } from "generator-engine";
  import { getRoleBadgeConfig } from "./delve-helpers";

  let {
    isOpen = false,
    roomData = null,
    isRegenerating = false,
    onSave,
    onRegenerateAi,
    onClose,
  }: {
    isOpen: boolean;
    roomData: DelveRoomNodeData | null;
    isRegenerating?: boolean;
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
    });
    onClose();
  }
</script>

{#if isOpen && roomData}
  <div
    class="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-theme-bg border-l border-theme-border shadow-2xl p-6 overflow-y-auto flex flex-col justify-between"
    role="dialog"
    aria-modal="true"
    aria-label="Room Stocking Inspector"
  >
    <div class="space-y-4">
      <div
        class="flex items-center justify-between border-b border-theme-border/60 pb-3"
      >
        <div class="flex items-center gap-2">
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
          class="text-theme-muted hover:text-theme-text transition-colors"
        >
          <span class="icon-[lucide--x] w-4 h-4"></span>
        </button>
      </div>

      <div class="space-y-3">
        <div>
          <label
            class="block text-xs font-mono font-bold uppercase tracking-wider text-theme-muted mb-1"
          >
            Room Title
          </label>
          <input
            type="text"
            bind:value={name}
            class="w-full bg-theme-surface/40 border border-theme-border/70 rounded-xl px-3 py-2 text-sm text-theme-text focus:border-theme-primary outline-none"
          />
        </div>

        <div>
          <label
            class="block text-xs font-mono font-bold uppercase tracking-wider text-theme-muted mb-1"
          >
            Room Role
          </label>
          <select
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
            <option value="special">Special</option>
          </select>
        </div>

        <div>
          <label
            class="block text-xs font-mono font-bold uppercase tracking-wider text-theme-muted mb-1"
          >
            Description
          </label>
          <textarea
            bind:value={description}
            rows="3"
            class="w-full bg-theme-surface/40 border border-theme-border/70 rounded-xl px-3 py-2 text-xs text-theme-text focus:border-theme-primary outline-none resize-y"
          ></textarea>
        </div>

        <div>
          <label
            class="block text-xs font-mono font-bold uppercase tracking-wider text-theme-muted mb-1"
          >
            Atmosphere
          </label>
          <input
            type="text"
            bind:value={atmosphere}
            placeholder="e.g. Freezing draft, hum of ancient runes"
            class="w-full bg-theme-surface/40 border border-theme-border/70 rounded-xl px-3 py-2 text-xs text-theme-text focus:border-theme-primary outline-none"
          />
        </div>

        <div class="grid grid-cols-2 gap-2">
          <div>
            <label
              class="block text-[10px] font-mono font-bold uppercase tracking-wider text-rose-400 mb-1"
            >
              Encounters (1 per line)
            </label>
            <textarea
              bind:value={encountersText}
              rows="3"
              class="w-full bg-theme-surface/40 border border-theme-border/70 rounded-xl p-2 text-xs text-theme-text focus:border-theme-primary outline-none"
            ></textarea>
          </div>
          <div>
            <label
              class="block text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 mb-1"
            >
              Hazards / Traps
            </label>
            <textarea
              bind:value={hazardsText}
              rows="3"
              class="w-full bg-theme-surface/40 border border-theme-border/70 rounded-xl p-2 text-xs text-theme-text focus:border-theme-primary outline-none"
            ></textarea>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-2">
          <div>
            <label
              class="block text-[10px] font-mono font-bold uppercase tracking-wider text-yellow-400 mb-1"
            >
              Treasure / Loot
            </label>
            <textarea
              bind:value={treasureText}
              rows="3"
              class="w-full bg-theme-surface/40 border border-theme-border/70 rounded-xl p-2 text-xs text-theme-text focus:border-theme-primary outline-none"
            ></textarea>
          </div>
          <div>
            <label
              class="block text-[10px] font-mono font-bold uppercase tracking-wider text-purple-400 mb-1"
            >
              Secrets / Clues
            </label>
            <textarea
              bind:value={secretsText}
              rows="3"
              class="w-full bg-theme-surface/40 border border-theme-border/70 rounded-xl p-2 text-xs text-theme-text focus:border-theme-primary outline-none"
            ></textarea>
          </div>
        </div>
      </div>
    </div>

    <div
      class="flex items-center justify-between gap-2 pt-4 border-t border-theme-border/60 mt-4"
    >
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
        {isRegenerating ? "Regenerating..." : "Regenerate Room (AI)"}
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
          Save Room
        </button>
      </div>
    </div>
  </div>
{/if}
