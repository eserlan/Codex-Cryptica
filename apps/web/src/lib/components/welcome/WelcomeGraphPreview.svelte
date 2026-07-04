<script lang="ts">
  import { DEFAULT_CATEGORIES } from "schema";

  // Entity-type colors for the welcome graph preview, sourced from the same
  // canonical palette the real graph uses so the teaser matches the product.
  const typeColor = (id: string) =>
    DEFAULT_CATEGORIES.find((c) => c.id === id)?.color ?? "#94a3b8";
  const PREVIEW_COLORS = {
    character: typeColor("character"),
    faction: typeColor("faction"),
    location: typeColor("location"),
    event: typeColor("event"),
  };
  // Brand accent used purely to denote the *selected* node (matches the CTA),
  // not an entity type.
  const SELECT_ACCENT = "#e6b450";
</script>

<div
  class="flex h-[16.5rem] sm:h-[19rem] md:h-[22rem] lg:h-[26rem] xl:h-[28rem]"
>
  <!-- Graph canvas -->
  <div class="relative flex-1">
    <svg
      viewBox="0 0 480 260"
      class="absolute inset-0 w-full h-full"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      <!-- peripheral edges (dim) -->
      <g stroke="#8a8175" stroke-opacity="0.25" stroke-width="1.2">
        <line x1="130" y1="66" x2="358" y2="74" />
        <line x1="138" y1="196" x2="350" y2="198" />
        <line x1="52" y1="134" x2="130" y2="66" />
        <line x1="52" y1="134" x2="138" y2="196" />
        <line x1="430" y1="140" x2="358" y2="74" />
        <line x1="430" y1="140" x2="350" y2="198" />
      </g>
      <!-- edges from the selected node (selection accent) -->
      <g stroke={SELECT_ACCENT} stroke-opacity="0.5" stroke-width="2">
        <line x1="240" y1="130" x2="130" y2="66" />
        <line x1="240" y1="130" x2="358" y2="74" />
        <line x1="240" y1="130" x2="138" y2="196" />
        <line x1="240" y1="130" x2="350" y2="198" />
      </g>

      <!-- hover-only glow boost on the selected node -->
      <circle
        cx="240"
        cy="130"
        r="32"
        fill={SELECT_ACCENT}
        fill-opacity="0.18"
        class="opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      ></circle>
      <!-- selected-node glow halo -->
      <circle cx="240" cy="130" r="24" fill={SELECT_ACCENT} opacity="0.14">
        <animate
          attributeName="opacity"
          values="0.1;0.22;0.1"
          dur="3.2s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="r"
          values="22;27;22"
          dur="3.2s"
          repeatCount="indefinite"
        />
      </circle>

      <!-- peripheral nodes, colored by entity type (canonical palette) -->
      <circle
        cx="52"
        cy="134"
        r="8"
        fill={PREVIEW_COLORS.location}
        fill-opacity="0.85"
      ></circle>
      <circle
        cx="430"
        cy="140"
        r="8"
        fill={PREVIEW_COLORS.event}
        fill-opacity="0.85"
      ></circle>
      <circle
        cx="130"
        cy="66"
        r="9"
        fill={PREVIEW_COLORS.faction}
        fill-opacity="0.85"
      ></circle>
      <circle
        cx="358"
        cy="74"
        r="9"
        fill={PREVIEW_COLORS.location}
        fill-opacity="0.85"
      ></circle>
      <circle
        cx="138"
        cy="196"
        r="9"
        fill={PREVIEW_COLORS.event}
        fill-opacity="0.85"
      ></circle>
      <circle
        cx="350"
        cy="198"
        r="9"
        fill={PREVIEW_COLORS.faction}
        fill-opacity="0.85"
      ></circle>

      <!-- selection bounding box -->
      <rect
        x="220"
        y="110"
        width="40"
        height="40"
        rx="9"
        fill="none"
        stroke={SELECT_ACCENT}
        stroke-opacity="0.55"
        stroke-width="1.2"
        stroke-dasharray="4 3"
      ></rect>
      <!-- selected node (character) with brand-accent selection ring -->
      <circle cx="240" cy="130" r="13" fill={PREVIEW_COLORS.character}></circle>
      <circle
        cx="240"
        cy="130"
        r="13"
        fill="none"
        stroke={SELECT_ACCENT}
        stroke-opacity="0.9"
        stroke-width="2"
      ></circle>

      <!-- node labels (color-keyed to type) -->
      <g font-family="var(--font-body, sans-serif)" text-anchor="middle">
        <text x="240" y="160" font-size="11" font-weight="700" fill="#f6dca0"
          >Captain Veyra</text
        >
        <text
          x="130"
          y="51"
          font-size="9.5"
          font-weight="600"
          fill="#d7d2c8"
          fill-opacity="0.92">Glass Rebellion</text
        >
        <text
          x="358"
          y="59"
          font-size="9.5"
          font-weight="600"
          fill="#d7d2c8"
          fill-opacity="0.92">Sunken Archive</text
        >
        <text
          x="138"
          y="216"
          font-size="9.5"
          font-weight="600"
          fill="#d7d2c8"
          fill-opacity="0.92">Crown Secret</text
        >
        <text
          x="350"
          y="218"
          font-size="9.5"
          font-weight="600"
          fill="#d7d2c8"
          fill-opacity="0.92">Blackspire Compact</text
        >
        <text
          x="52"
          y="155"
          font-size="9"
          font-weight="600"
          fill="#d7d2c8"
          fill-opacity="0.85">Ironhold</text
        >
        <text
          x="430"
          y="161"
          font-size="9"
          font-weight="600"
          fill="#d7d2c8"
          fill-opacity="0.85">The Vow</text
        >
      </g>
    </svg>
  </div>
  <!-- Entity panel -->
  <div
    class="w-32 sm:w-40 md:w-48 shrink-0 border-l border-theme-border bg-theme-bg/50 p-3 text-left"
  >
    <div
      class="w-10 h-10 rounded-lg mb-2 flex items-center justify-center"
      style="background-color: {PREVIEW_COLORS.character}2e"
    >
      <span
        class="icon-[lucide--user-round] w-5 h-5"
        style="color: {PREVIEW_COLORS.character}"
      ></span>
    </div>
    <div class="text-xs font-bold text-theme-text leading-tight">
      Captain Veyra
    </div>
    <div
      class="text-[9px] font-mono uppercase tracking-[0.15em] mb-3"
      style="color: {PREVIEW_COLORS.character}"
    >
      Character
    </div>
    <div class="space-y-1.5 text-[9px] sm:text-[10px] font-body leading-snug">
      <div class="text-theme-muted">
        Faction: <span class="text-theme-text">Red Concordat</span>
      </div>
      <div class="text-theme-muted">
        Status: <span class="text-theme-text">Missing</span>
      </div>
      <div class="flex items-center gap-1 text-theme-primary pt-0.5">
        <span class="icon-[lucide--eye-off] w-3 h-3 shrink-0"></span>
        2 unresolved secrets
      </div>
    </div>
  </div>
</div>
