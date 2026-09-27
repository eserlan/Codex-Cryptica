<script lang="ts">
  import { vault } from "$lib/stores/vault.svelte";
  import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
  import type { FactionRosterMember } from "./entity-card-variant";

  let {
    member,
    showLabel = false,
  }: {
    member: FactionRosterMember;
    showLabel?: boolean;
  } = $props();

  const char = $derived(vault.entities[member.target]);
  let imageUrl = $state<string | null>(null);

  $effect(() => {
    if (char?.image) {
      vault.resolveImageUrl(char.image).then((url) => {
        imageUrl = url;
      });
    } else {
      imageUrl = null;
    }
  });

  function openChar(e: MouseEvent) {
    e.stopPropagation();
    modalUIStore.openZenMode(member.target);
  }
</script>

<div
  role="button"
  tabindex="0"
  class="relative rounded-lg overflow-hidden bg-theme-bg/80 group/member cursor-pointer border border-theme-border/40 hover:border-theme-primary/80 transition-all hover:scale-[1.02] shadow-sm hover:shadow-md aspect-[3/4] select-none"
  onclick={openChar}
  onkeydown={(e) =>
    (e.key === "Enter" || e.key === " ") &&
    openChar(e as unknown as MouseEvent)}
  title={member.title}
  aria-label={member.title}
>
  {#if imageUrl}
    <img
      src={imageUrl}
      alt={member.title}
      loading="lazy"
      decoding="async"
      class="w-full h-full object-cover object-[center_20%] transition-transform duration-300 group-hover/member:scale-105"
    />
  {:else}
    <div
      class="w-full h-full flex flex-col items-center justify-center bg-theme-primary/10 text-theme-muted p-2 text-center"
    >
      <span
        class="icon-[lucide--user] w-8 h-8 opacity-40 mb-1"
        aria-hidden="true"
      ></span>
      <span
        class="text-[10px] font-bold text-theme-text/80 truncate max-w-full"
      >
        {member.title}
      </span>
    </div>
  {/if}

  {#if member.isLeader}
    <span
      class="absolute top-1.5 right-1.5 p-1 rounded-full bg-amber-500/90 text-black shadow-sm flex items-center justify-center backdrop-blur-xs"
      title="Leader"
      aria-label="Leader"
    >
      <span class="icon-[lucide--crown] w-3 h-3" aria-hidden="true"></span>
    </span>
  {/if}

  <!-- Hover or persistent label -->
  <div
    class="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/85 via-black/40 to-transparent transition-opacity flex items-center justify-between pointer-events-none {showLabel
      ? 'opacity-100'
      : 'opacity-0 group-hover/member:opacity-100'}"
  >
    <span
      class="text-xs font-bold text-white truncate font-header drop-shadow-sm"
    >
      {member.title}
    </span>
    {#if member.isLeader}
      <span
        class="text-[9px] font-semibold text-amber-300 uppercase tracking-wider ml-1 shrink-0"
      >
        Leader
      </span>
    {/if}
  </div>
</div>
