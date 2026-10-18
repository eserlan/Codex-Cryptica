<script lang="ts">
  import { vault } from "$lib/stores/vault.svelte";
  import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
  import {
    extractEntitySubtitle,
    getFactionMemberIcon,
    extractQuote,
    type ConnectionStance,
  } from "./entity-card-variant";

  let {
    member,
    isLeader = false,
  }: {
    member: {
      target: string;
      title: string;
      text: string;
      stance: ConnectionStance;
      isLeader?: boolean;
    };
    isLeader?: boolean;
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

  const subtitle = $derived(char ? extractEntitySubtitle(char) : "");
  const quote = $derived(
    char ? extractQuote(char.content, char.metadata, 70) : undefined,
  );

  const memberIcon = $derived(getFactionMemberIcon(subtitle, isLeader));

  const roleLabel = $derived(
    member.text && member.text !== "Member" && member.text !== "Leader"
      ? member.text
      : isLeader
        ? "Leader"
        : "Member",
  );

  const stanceColor = $derived.by(() => {
    if (member.stance === "ally") return "text-emerald-400";
    if (member.stance === "enemy") return "text-rose-400";
    return "text-sky-400";
  });

  function openCharacter(e: MouseEvent) {
    e.stopPropagation();
    modalUIStore.openZenMode(member.target);
  }
</script>

<!-- fallow-ignore-next-line complexity -->
<div
  role="button"
  tabindex="0"
  class="group/member-card flex flex-col rounded-lg border border-theme-border/60 bg-theme-bg/60 hover:bg-theme-bg hover:border-theme-primary/60 hover:shadow-md transition-all cursor-pointer overflow-hidden focus:outline-none focus:ring-2 focus:ring-theme-primary"
  onclick={openCharacter}
  onkeydown={(e) =>
    (e.key === "Enter" || e.key === " ") &&
    openCharacter(e as unknown as MouseEvent)}
  title={`Inspect ${member.title}`}
  aria-label={`Inspect ${member.title}`}
>
  <!-- Character Portrait -->
  <div
    class="relative h-28 sm:h-32 w-full overflow-hidden bg-theme-bg/80 border-b border-theme-border/40"
  >
    {#if imageUrl}
      <img
        src={imageUrl}
        alt={member.title}
        loading="lazy"
        decoding="async"
        class="w-full h-full object-cover object-[center_20%] group-hover/member-card:scale-105 transition-transform duration-300"
      />
    {:else}
      <div
        class="w-full h-full flex flex-col items-center justify-center bg-theme-primary/5 text-theme-muted"
      >
        <span class="{memberIcon} w-8 h-8 opacity-40" aria-hidden="true"></span>
      </div>
    {/if}

    {#if isLeader}
      <span
        class="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded text-nano font-bold uppercase tracking-wider bg-amber-500/90 text-black shadow-sm flex items-center gap-1 backdrop-blur-xs"
      >
        <span class="icon-[lucide--crown] w-2.5 h-2.5" aria-hidden="true"
        ></span>
        Leader
      </span>
    {/if}
  </div>

  <!-- Character Details -->
  <div class="p-2.5 flex-1 flex flex-col justify-between text-left">
    <div>
      <div class="flex items-center gap-1.5 min-w-0">
        <span
          class="{memberIcon} w-3.5 h-3.5 shrink-0 {isLeader
            ? 'text-amber-400'
            : 'text-theme-primary'}"
          aria-hidden="true"
        ></span>
        <h4
          class="font-serif font-bold text-xs text-theme-text truncate leading-tight group-hover/member-card:text-theme-primary transition-colors"
        >
          {member.title}
        </h4>
      </div>

      {#if subtitle}
        <p class="text-micro text-theme-muted font-medium truncate mt-0.5">
          {subtitle}
        </p>
      {/if}

      {#if quote}
        <p
          class="text-micro italic text-theme-text/85 line-clamp-2 mt-1.5 leading-snug font-serif"
        >
          “{quote}”
        </p>
      {/if}
    </div>

    <!-- Bottom Role/Reference -->
    <div
      class="mt-2 pt-1 border-t border-theme-border/20 flex items-center justify-between text-nano text-theme-muted font-mono"
    >
      <span class="truncate">
        {roleLabel}
      </span>
      {#if member.stance && member.stance !== "neutral"}
        <span class="capitalize font-semibold shrink-0 ml-1 {stanceColor}">
          {member.stance}
        </span>
      {/if}
    </div>
  </div>
</div>
