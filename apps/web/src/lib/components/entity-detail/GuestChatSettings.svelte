<script lang="ts">
  import type { Entity, GuestChatConfig } from "schema";
  import { vault } from "$lib/stores/vault.svelte";
  import { generatePersonality } from "./generate-personality";

  let {
    entity,
    isEditing,
    editContent,
    editLore = $bindable(),
    editGuestChatConfig = $bindable(),
  } = $props<{
    entity: Entity;
    isEditing: boolean;
    editContent: string;
    editLore?: string;
    editGuestChatConfig?: GuestChatConfig;
  }>();

  let isGeneratingPersonality = $state(false);
  let personalityError = $state<string | null>(null);
  let isSavingAvailability = $state(false);
  let availabilityError = $state<string | null>(null);

  const guestChatConfig = $derived(
    entity.guestChatConfig ?? {
      isEnabled: false,
      contextScope: "public" as const,
      isHostReviewable: true,
      keepMemory: true,
    },
  );

  const hasPersonalitySection = $derived.by(() => {
    const lore = isEditing ? editLore || entity.lore || "" : entity.lore || "";
    return /(?:^|\n)##\s+Personality\s*&\s*Voice\s*\n/i.test(lore);
  });

  async function handleGeneratePersonality() {
    if (isGeneratingPersonality) return false;
    return generatePersonality({
      entity,
      editContent,
      getEditLore: () => editLore,
      setEditLore: (lore: string) => {
        editLore = lore;
      },
      setGenerating: (generating: boolean) => {
        isGeneratingPersonality = generating;
      },
      setError: (error: string | null) => {
        personalityError = error;
      },
    });
  }

  async function handleAvailabilityChange(event: Event) {
    const isEnabled = (event.currentTarget as HTMLInputElement).checked;
    const nextConfig: GuestChatConfig = {
      ...guestChatConfig,
      isEnabled,
    };

    isSavingAvailability = true;
    availabilityError = null;
    try {
      const wasUpdated = await vault.updateEntity(entity.id, {
        guestChatConfig: nextConfig,
      });
      if (!wasUpdated) {
        throw new Error("The character could not be updated.");
      }
    } catch (error) {
      console.error(
        "[GuestChatSettings] Failed to update availability:",
        error,
      );
      availabilityError = "Could not update guest chat. Try again.";
    } finally {
      isSavingAvailability = false;
    }
  }
</script>

<div
  class="border border-theme-border rounded-xl p-4 bg-theme-surface/5 space-y-4"
>
  <div
    class="flex items-center justify-between border-b border-theme-border pb-2"
  >
    <h4
      class="font-header text-sm uppercase tracking-widest font-bold text-theme-secondary flex items-center gap-1.5"
    >
      <span class="icon-[lucide--messages-square] w-4 h-4 text-theme-primary"
      ></span>
      Guest Character Chat
    </h4>
    {#if !isEditing}
      <label
        class="flex items-center gap-2 cursor-pointer select-none text-xs font-bold uppercase tracking-wider"
      >
        <input
          type="checkbox"
          checked={guestChatConfig.isEnabled}
          onchange={handleAvailabilityChange}
          disabled={isSavingAvailability}
          aria-busy={isSavingAvailability}
          class="w-4 h-4 accent-theme-primary rounded border-theme-border bg-theme-bg"
        />
        <span
          class={guestChatConfig.isEnabled
            ? "text-emerald-500"
            : "text-theme-muted"}
        >
          {guestChatConfig.isEnabled ? "Enabled" : "Disabled"}
        </span>
      </label>
    {/if}
  </div>

  {#if availabilityError}
    <p class="text-xs text-theme-danger" role="alert">{availabilityError}</p>
  {/if}

  {#if isEditing}
    <div class="space-y-4 text-sm">
      <label class="flex items-center gap-3 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={!!editGuestChatConfig?.isEnabled}
          onchange={(e) => {
            if (editGuestChatConfig) {
              editGuestChatConfig.isEnabled = e.currentTarget.checked;
              editGuestChatConfig = { ...editGuestChatConfig };
              if (editGuestChatConfig.isEnabled && !hasPersonalitySection) {
                void handleGeneratePersonality();
              }
            }
          }}
          class="w-4 h-4 accent-theme-primary rounded border-theme-border bg-theme-bg"
        />
        <span class="font-bold text-theme-text"
          >Enable Guest Character Chat</span
        >
      </label>

      {#if editGuestChatConfig?.isEnabled}
        <div
          class="pl-7 space-y-4 border-l-2 border-theme-border/50 transition-all"
        >
          <div class="space-y-1">
            <span
              class="block text-xs font-bold uppercase tracking-wider text-theme-muted"
              >Context & Knowledge Scope</span
            >
            <div class="flex gap-4">
              <label class="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="contextScope"
                  value="public"
                  checked={editGuestChatConfig?.contextScope === "public"}
                  onchange={() => {
                    if (editGuestChatConfig) {
                      editGuestChatConfig.contextScope = "public";
                      editGuestChatConfig = { ...editGuestChatConfig };
                    }
                  }}
                  class="accent-theme-primary"
                />
                <span>Public Lore Only</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="contextScope"
                  value="hybrid"
                  checked={editGuestChatConfig?.contextScope === "hybrid"}
                  onchange={() => {
                    if (editGuestChatConfig) {
                      editGuestChatConfig.contextScope = "hybrid";
                      editGuestChatConfig = { ...editGuestChatConfig };
                    }
                  }}
                  class="accent-theme-primary"
                />
                <span>Public + Private Context</span>
              </label>
            </div>
            <p class="text-xs text-theme-muted mt-1 leading-normal">
              {editGuestChatConfig?.contextScope === "public"
                ? "Guests can only query this character using their public description and labels."
                : "Allows the AI to guide hints and responses using hidden GM notes, but it will not repeat them directly."}
            </p>
          </div>

          <div class="flex items-center justify-between text-xs">
            <span class="font-bold uppercase tracking-wider text-theme-muted"
              >Personality & Voice</span
            >
            {#if hasPersonalitySection}
              <span
                class="flex items-center gap-1 text-emerald-500 font-semibold"
              >
                <span class="icon-[lucide--check-circle] w-3.5 h-3.5"></span>
                Found in character lore
              </span>
            {:else}
              <div class="flex items-center gap-2">
                <span
                  class="flex items-center gap-1 text-amber-500 font-semibold"
                >
                  <span class="icon-[lucide--alert-triangle] w-3.5 h-3.5"
                  ></span>
                  Missing from lore
                </span>
                <button
                  type="button"
                  onclick={handleGeneratePersonality}
                  disabled={isGeneratingPersonality}
                  aria-busy={isGeneratingPersonality}
                  class="text-[10px] font-bold text-theme-primary hover:text-theme-secondary flex items-center gap-1 transition disabled:opacity-50 cursor-pointer"
                >
                  <span
                    class={isGeneratingPersonality
                      ? "icon-[lucide--loader-2] animate-spin w-3 h-3"
                      : "icon-[lucide--sparkles] w-3 h-3"}
                  ></span>
                  {isGeneratingPersonality ? "Generating..." : "Generate"}
                </button>
              </div>
            {/if}
          </div>
          {#if personalityError}
            <p
              class="text-[10px] text-theme-danger flex items-center gap-1 font-semibold"
            >
              <span class="icon-[lucide--circle-alert] w-3.5 h-3.5"></span>
              {personalityError}
            </p>
          {/if}

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <label class="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={!!editGuestChatConfig?.isHostReviewable}
                onchange={(e) => {
                  if (editGuestChatConfig) {
                    editGuestChatConfig.isHostReviewable =
                      e.currentTarget.checked;
                    editGuestChatConfig = { ...editGuestChatConfig };
                  }
                }}
                class="w-3.5 h-3.5 accent-theme-primary rounded border-theme-border bg-theme-bg"
              />
              <span class="text-xs text-theme-text"
                >Host can review logs (P2P Sync)</span
              >
            </label>

            <label class="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={!!editGuestChatConfig?.keepMemory}
                onchange={(e) => {
                  if (editGuestChatConfig) {
                    editGuestChatConfig.keepMemory = e.currentTarget.checked;
                    editGuestChatConfig = { ...editGuestChatConfig };
                  }
                }}
                class="w-3.5 h-3.5 accent-theme-primary rounded border-theme-border bg-theme-bg"
              />
              <span class="text-xs text-theme-text"
                >Retain memory between guest visits</span
              >
            </label>
          </div>
        </div>
      {/if}
    </div>
  {:else if entity.guestChatConfig?.isEnabled}
    <div class="grid grid-cols-2 gap-2 text-xs">
      <div>
        <span class="text-theme-muted block">Context Scope:</span>
        <span class="font-bold text-theme-text capitalize"
          >{entity.guestChatConfig.contextScope} Lore</span
        >
      </div>
      <div>
        <span class="text-theme-muted block">Synced Review:</span>
        <span class="font-bold text-theme-text"
          >{entity.guestChatConfig.isHostReviewable
            ? "Active"
            : "Disabled"}</span
        >
      </div>
    </div>
  {:else}
    <p class="text-xs text-theme-muted italic">
      Guest Character Chat is disabled. Click EDIT below to enable it and let
      invited players chat with this character.
    </p>
  {/if}
</div>
