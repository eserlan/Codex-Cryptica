<script lang="ts">
  import { base } from "$app/paths";
  import { trackDiscoveryClick } from "$lib/actions/trackDiscoveryClick";
  import { classifyDiscoveryTarget } from "$lib/services/analytics/discovery-tracking";

  const cleanBase = base === "/" ? "" : base;

  interface RouteRow {
    from: string;
    to: string;
    time: string;
    type: string;
    hazard: string;
  }

  const routes: RouteRow[] = [
    {
      from: "Oakhaven",
      to: "Toll Bridge",
      time: "0.5 day",
      type: "Known route",
      hazard: "Pay 2 silver per traveller or arrive watched.",
    },
    {
      from: "Oakhaven",
      to: "Reed Causeway",
      time: "1 day",
      type: "Known route",
      hazard: "Spend 1 extra ration per traveller or forage (delay risk).",
    },
    {
      from: "Old Watchtower",
      to: "Toll Bridge",
      time: "0.5 day",
      type: "Road loop",
      hazard: "Keeper warns bridge guard if threatened; loops back to road.",
    },
    {
      from: "Reed Causeway",
      to: "Old Watchtower",
      time: "0.5 day",
      type: "Known cross-route",
      hazard: "Muddy tracks reveal whether rival party passed first.",
    },
    {
      from: "Reed Causeway",
      to: "Hermit's Cairn",
      time: "0.5 day",
      type: "Conditional guide",
      hazard: "Hermit shares hidden track if brought news from Oakhaven.",
    },
    {
      from: "Old Watchtower",
      to: "Morzan's Crypt",
      time: "1 day",
      type: "Exposed approach",
      hazard: "Exposed ground: anyone seen here alerts the crypt sentries.",
    },
    {
      from: "Hermit's Cairn",
      to: "Morzan's Crypt",
      time: "0.5 day",
      type: "Hidden track",
      hazard: "Secret path: party arrives unseen and chooses entry point.",
    },
  ];
</script>

<figure
  class="not-prose my-6 rounded-lg border border-theme-border bg-theme-surface/70 p-4 sm:p-6"
  aria-labelledby="morzan-diagram-title"
  data-testid="point-crawl-morzan-diagram"
>
  <div class="mb-3 flex items-center justify-between text-xs text-theme-muted">
    <div class="flex items-center gap-2">
      <span
        class="icon-[lucide--map] h-4 w-4 text-theme-primary"
        aria-hidden="true"
      ></span>
      <span class="font-mono uppercase tracking-wider text-theme-text font-bold"
        >Network Map</span
      >
    </div>
    <span class="hidden sm:inline-block font-mono text-xs text-theme-muted">
      6 Nodes • 7 Links • 2 Approaches to Crypt
    </span>
    <span class="sm:hidden font-mono text-xs text-theme-muted"
      >Scroll map →</span
    >
  </div>

  <!-- SVG Diagram Canvas -->
  <div class="overflow-x-auto -mx-2 px-2 sm:mx-0 sm:px-0">
    <svg
      viewBox="0 0 740 405"
      class="block h-auto w-full select-none max-sm:min-w-[580px]"
      role="img"
      aria-labelledby="morzan-diagram-title morzan-diagram-desc"
    >
      <title id="morzan-diagram-title">
        The Road to Morzan's Crypt: Six-Node Point-Crawl Diagram
      </title>
      <desc id="morzan-diagram-desc">
        A regional network diagram showing travel routes from Oakhaven through
        Toll Bridge and Reed Causeway to Old Watchtower and Hermit's Cairn,
        culminating in exposed and hidden approaches to Morzan's Crypt.
      </desc>

      <defs>
        <!-- Directional arrowheads -->
        <marker
          id="pc-arrow-default"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto"
        >
          <path
            d="M 0 1.5 L 9 5 L 0 8.5 z"
            class="fill-theme-border stroke-none"
          />
        </marker>
        <marker
          id="pc-arrow-primary"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto"
        >
          <path
            d="M 0 1.5 L 9 5 L 0 8.5 z"
            class="fill-theme-primary stroke-none"
          />
        </marker>
        <marker
          id="pc-arrow-hazard"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto"
        >
          <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#f59e0b" stroke="none" />
        </marker>
      </defs>

      <!-- Grid subtle background texture / scale markings -->
      <g class="stroke-theme-border/25" stroke-dasharray="2 6" stroke-width="1">
        <line x1="75" y1="15" x2="75" y2="385" />
        <line x1="265" y1="15" x2="265" y2="385" />
        <line x1="475" y1="15" x2="475" y2="385" />
        <line x1="665" y1="15" x2="665" y2="385" />
      </g>

      <!-- Layer Column Headers -->
      <g class="font-mono text-xs uppercase tracking-[0.14em] fill-theme-muted">
        <text x="75" y="20" text-anchor="middle">Start</text>
        <text x="265" y="20" text-anchor="middle">Waypoints (Layer 1)</text>
        <text x="475" y="20" text-anchor="middle">Staging Sites (Layer 2)</text>
        <text x="665" y="20" text-anchor="middle">Goal (Layer 3)</text>
      </g>

      <!-- ================= ROUTE EDGES ================= -->

      <!-- 1. Oakhaven -> Toll Bridge -->
      <g data-testid="route-oakhaven-toll-bridge">
        <line
          x1="97"
          y1="188"
          x2="243"
          y2="108"
          class="stroke-theme-border"
          stroke-width="2"
          marker-end="url(#pc-arrow-default)"
        />
        <!-- Badge -->
        <rect
          x="92"
          y="132"
          width="146"
          height="20"
          rx="4"
          class="fill-theme-bg stroke-theme-border"
          stroke-width="1"
        />
        <text
          x="165"
          y="146"
          text-anchor="middle"
          class="font-mono text-xs fill-theme-text"
        >
          <tspan font-weight="bold" class="fill-theme-primary">0.5 day</tspan> · 2
          sp toll / Watched
        </text>
      </g>

      <!-- 2. Oakhaven -> Reed Causeway -->
      <g data-testid="route-oakhaven-reed-causeway">
        <line
          x1="97"
          y1="212"
          x2="243"
          y2="292"
          class="stroke-theme-border"
          stroke-width="2"
          marker-end="url(#pc-arrow-default)"
        />
        <!-- Badge -->
        <rect
          x="90"
          y="248"
          width="150"
          height="20"
          rx="4"
          class="fill-theme-bg stroke-theme-border"
          stroke-width="1"
        />
        <text
          x="165"
          y="262"
          text-anchor="middle"
          class="font-mono text-xs fill-theme-text"
        >
          <tspan font-weight="bold" class="fill-theme-primary">1 day</tspan> · Extra
          ration / Delay
        </text>
      </g>

      <!-- 3. Toll Bridge <-> Old Watchtower (Road Loop) -->
      <g data-testid="route-toll-bridge-watchtower-loop">
        <line
          x1="451"
          y1="100"
          x2="289"
          y2="100"
          class="stroke-theme-border"
          stroke-width="2"
          marker-end="url(#pc-arrow-default)"
        />
        <!-- Badge -->
        <rect
          x="290"
          y="90"
          width="160"
          height="20"
          rx="4"
          class="fill-theme-bg stroke-theme-border"
          stroke-width="1"
        />
        <text
          x="370"
          y="104"
          text-anchor="middle"
          class="font-mono text-xs fill-theme-text"
        >
          <tspan class="fill-theme-primary font-bold">⮂</tspan>
          <tspan font-weight="bold">0.5 day</tspan> · Road loop (Guard alert)
        </text>
      </g>

      <!-- 4. Reed Causeway -> Old Watchtower (Cross Link) -->
      <g data-testid="route-causeway-watchtower">
        <line
          x1="281"
          y1="284"
          x2="459"
          y2="116"
          class="stroke-theme-border"
          stroke-width="2"
          marker-end="url(#pc-arrow-default)"
        />
        <!-- Badge -->
        <rect
          x="298"
          y="190"
          width="144"
          height="20"
          rx="4"
          class="fill-theme-bg stroke-theme-border"
          stroke-width="1"
        />
        <text
          x="370"
          y="204"
          text-anchor="middle"
          class="font-mono text-xs fill-theme-text"
        >
          <tspan font-weight="bold" class="fill-theme-primary">0.5 day</tspan> · Tracks
          reveal rival
        </text>
      </g>

      <!-- 5. Reed Causeway -> Hermit's Cairn (Conditional Guide) -->
      <g data-testid="route-causeway-hermits-cairn">
        <line
          x1="289"
          y1="300"
          x2="451"
          y2="300"
          class="stroke-theme-border"
          stroke-dasharray="4 3"
          stroke-width="2"
          marker-end="url(#pc-arrow-default)"
        />
        <!-- Badge -->
        <rect
          x="292"
          y="290"
          width="156"
          height="20"
          rx="4"
          class="fill-theme-bg stroke-theme-border"
          stroke-width="1"
        />
        <text
          x="370"
          y="304"
          text-anchor="middle"
          class="font-mono text-xs fill-theme-text"
        >
          🔒 <tspan font-weight="bold">0.5 day</tspan> · Needs news (Guide)
        </text>
      </g>

      <!-- 6. Old Watchtower -> Morzan's Crypt (Exposed Ground / Alerts Sentries) -->
      <g data-testid="route-watchtower-crypt-exposed">
        <line
          x1="497"
          y1="108"
          x2="643"
          y2="188"
          stroke="#f59e0b"
          stroke-width="2.5"
          marker-end="url(#pc-arrow-hazard)"
        />
        <!-- Badge -->
        <rect
          x="495"
          y="132"
          width="150"
          height="20"
          rx="4"
          class="fill-theme-bg stroke-amber-500/80"
          stroke-width="1"
        />
        <text
          x="570"
          y="146"
          text-anchor="middle"
          class="font-mono text-xs fill-theme-text"
        >
          ⚠ <tspan font-weight="bold">1 day</tspan> · Exposed (Alerts sentries)
        </text>
      </g>

      <!-- 7. Hermit's Cairn -> Morzan's Crypt (Hidden Track / Arrives Unseen) -->
      <g data-testid="route-hermit-crypt-hidden">
        <line
          x1="497"
          y1="292"
          x2="643"
          y2="212"
          class="stroke-theme-primary"
          stroke-dasharray="6 4"
          stroke-width="2.5"
          marker-end="url(#pc-arrow-primary)"
        />
        <!-- Badge -->
        <rect
          x="490"
          y="248"
          width="160"
          height="20"
          rx="4"
          class="fill-theme-bg stroke-theme-primary"
          stroke-width="1"
        />
        <text
          x="570"
          y="262"
          text-anchor="middle"
          class="font-mono text-xs fill-theme-primary"
        >
          👁 <tspan font-weight="bold">0.5 day</tspan> · Hidden track (Unseen)
        </text>
      </g>

      <!-- ================= NODES ================= -->

      <!-- Node 1: Oakhaven (Start) -->
      <g transform="translate(75, 200)" data-testid="node-oakhaven">
        <circle
          r="24"
          class="fill-theme-surface stroke-theme-primary"
          stroke-width="2"
        />
        <circle
          r="17"
          class="fill-theme-primary/10 stroke-theme-primary/50"
          stroke-width="1"
        />
        <text
          y="4"
          text-anchor="middle"
          class="font-mono text-xs font-bold fill-theme-primary">1</text
        >
        <!-- Top role tag -->
        <text
          y="-30"
          text-anchor="middle"
          class="font-mono text-xs uppercase tracking-wider font-bold fill-theme-primary"
        >
          START
        </text>
        <!-- Bottom Labels -->
        <text
          y="38"
          text-anchor="middle"
          class="font-header text-[12px] font-bold fill-theme-text"
        >
          Oakhaven
        </text>
        <text
          y="52"
          text-anchor="middle"
          class="font-mono text-xs fill-theme-muted"
        >
          Rumour board
        </text>
      </g>

      <!-- Node 2: Toll Bridge (Labels ABOVE) -->
      <g transform="translate(265, 100)" data-testid="node-toll-bridge">
        <circle
          r="22"
          class="fill-theme-surface stroke-theme-border"
          stroke-width="2"
        />
        <circle
          r="16"
          class="fill-theme-bg stroke-theme-border/60"
          stroke-width="1"
        />
        <text
          y="4"
          text-anchor="middle"
          class="font-mono text-xs font-bold fill-theme-text">2</text
        >
        <!-- Top Labels -->
        <text
          y="-40"
          text-anchor="middle"
          class="font-header text-[12px] font-bold fill-theme-text"
        >
          Toll Bridge
        </text>
        <text
          y="-27"
          text-anchor="middle"
          class="font-mono text-xs fill-theme-muted"
        >
          Watched crossing
        </text>
      </g>

      <!-- Node 3: Reed Causeway (Labels BELOW) -->
      <g transform="translate(265, 300)" data-testid="node-reed-causeway">
        <circle
          r="22"
          class="fill-theme-surface stroke-theme-border"
          stroke-width="2"
        />
        <circle
          r="16"
          class="fill-theme-bg stroke-theme-border/60"
          stroke-width="1"
        />
        <text
          y="4"
          text-anchor="middle"
          class="font-mono text-xs font-bold fill-theme-text">3</text
        >
        <!-- Bottom Labels -->
        <text
          y="36"
          text-anchor="middle"
          class="font-header text-[12px] font-bold fill-theme-text"
        >
          Reed Causeway
        </text>
        <text
          y="50"
          text-anchor="middle"
          class="font-mono text-xs fill-theme-muted"
        >
          Muddy & unwatched
        </text>
      </g>

      <!-- Node 4: Old Watchtower (Labels ABOVE) -->
      <g transform="translate(475, 100)" data-testid="node-old-watchtower">
        <circle
          r="22"
          class="fill-theme-surface stroke-theme-border"
          stroke-width="2"
        />
        <circle
          r="16"
          class="fill-theme-bg stroke-theme-border/60"
          stroke-width="1"
        />
        <text
          y="4"
          text-anchor="middle"
          class="font-mono text-xs font-bold fill-theme-text">4</text
        >
        <!-- Top Labels -->
        <text
          y="-40"
          text-anchor="middle"
          class="font-header text-[12px] font-bold fill-theme-text"
        >
          Old Watchtower
        </text>
        <text
          y="-27"
          text-anchor="middle"
          class="font-mono text-xs fill-theme-muted"
        >
          High ground view
        </text>
      </g>

      <!-- Node 5: Hermit's Cairn (Labels BELOW) -->
      <g transform="translate(475, 300)" data-testid="node-hermits-cairn">
        <circle
          r="22"
          class="fill-theme-surface stroke-theme-border"
          stroke-width="2"
        />
        <circle
          r="16"
          class="fill-theme-bg stroke-theme-border/60"
          stroke-width="1"
        />
        <text
          y="4"
          text-anchor="middle"
          class="font-mono text-xs font-bold fill-theme-text">5</text
        >
        <!-- Bottom Labels -->
        <text
          y="36"
          text-anchor="middle"
          class="font-header text-[12px] font-bold fill-theme-text"
        >
          Hermit's Cairn
        </text>
        <text
          y="50"
          text-anchor="middle"
          class="font-mono text-xs fill-theme-muted"
        >
          Guide to hidden track
        </text>
      </g>

      <!-- Node 6: Morzan's Crypt (Goal) -->
      <g transform="translate(665, 200)" data-testid="node-morzans-crypt">
        <circle
          r="24"
          class="fill-theme-surface stroke-theme-primary"
          stroke-width="2"
        />
        <circle
          r="18"
          class="fill-theme-primary/15 stroke-theme-primary/60"
          stroke-width="1.5"
          stroke-dasharray="3 2"
        />
        <text
          y="4"
          text-anchor="middle"
          class="font-mono text-xs font-bold fill-theme-primary">6</text
        >
        <!-- Top role tag -->
        <text
          y="-30"
          text-anchor="middle"
          class="font-mono text-xs uppercase tracking-wider font-bold fill-theme-primary"
        >
          GOAL
        </text>
        <!-- Bottom Labels -->
        <text
          y="38"
          text-anchor="middle"
          class="font-header text-[12px] font-bold fill-theme-text"
        >
          Morzan's Crypt
        </text>
        <text
          y="52"
          text-anchor="middle"
          class="font-mono text-xs fill-theme-primary font-bold"
        >
          The Goal
        </text>
      </g>
    </svg>
  </div>

  <!-- Legend -->
  <div
    class="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 border-t border-theme-border/60 pt-3 text-xs text-theme-muted"
    aria-label="Map Legend"
  >
    <div class="inline-flex items-center gap-1.5">
      <span class="h-0.5 w-4 bg-theme-border" aria-hidden="true"></span>
      <span>Known route</span>
    </div>
    <div class="inline-flex items-center gap-1.5">
      <span
        class="h-0.5 w-4 border-b-2 border-dotted border-theme-text"
        aria-hidden="true"
      ></span>
      <span>Conditional (Guide / clue)</span>
    </div>
    <div class="inline-flex items-center gap-1.5">
      <span
        class="h-0.5 w-4 border-b-2 border-dashed border-theme-primary"
        aria-hidden="true"
      ></span>
      <span class="text-theme-primary">Hidden track (Unseen)</span>
    </div>
    <div class="inline-flex items-center gap-1.5">
      <span class="text-amber-400 font-bold" aria-hidden="true">⚠</span>
      <span class="text-theme-text">Exposed hazard (Alerts sentries)</span>
    </div>
    <div class="inline-flex items-center gap-1.5">
      <span class="text-theme-primary font-bold" aria-hidden="true">⮂</span>
      <span>Road loop</span>
    </div>
  </div>

  <!-- Accessible Route Breakdown Table (Crawlable & Screen-Reader friendly without JS) -->
  <details
    class="group mt-4 rounded border border-theme-border/60 bg-theme-bg/40 text-xs"
  >
    <summary
      class="flex cursor-pointer list-none items-center gap-2 px-3 py-2 font-mono text-theme-muted transition-colors hover:text-theme-primary focus-visible:outline-2 focus-visible:outline-theme-accent"
    >
      <span
        class="icon-[lucide--chevron-right] h-3.5 w-3.5 transition-transform group-open:rotate-90"
        aria-hidden="true"
      ></span>
      <span>Route breakdown & travel times (table reference)</span>
    </summary>
    <div class="border-t border-theme-border/60 p-3 overflow-x-auto">
      <table class="w-full text-left text-xs border-collapse">
        <caption class="sr-only"
          >Route connections, travel times, and hazards for the Morzan's Crypt
          point crawl</caption
        >
        <thead>
          <tr class="border-b border-theme-border text-theme-text font-bold">
            <th scope="col" class="py-1.5 pr-3">From</th>
            <th scope="col" class="py-1.5 pr-3">To</th>
            <th scope="col" class="py-1.5 pr-3">Time</th>
            <th scope="col" class="py-1.5 pr-3">Type</th>
            <th scope="col" class="py-1.5">Trade-off / Consequences</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-theme-border/40 text-theme-muted">
          {#each routes as r}
            <tr>
              <th scope="row" class="py-2 pr-3 font-semibold text-theme-text"
                >{r.from}</th
              >
              <td class="py-2 pr-3 text-theme-text">{r.to}</td>
              <td class="py-2 pr-3 font-mono text-theme-primary">{r.time}</td>
              <td class="py-2 pr-3">{r.type}</td>
              <td class="py-2">{r.hazard}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </details>

  <!-- One Genuine Next Step CTA -->
  <div
    class="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded border border-theme-primary/30 bg-theme-primary/5 p-4 text-sm"
    data-testid="diagram-generator-cta"
  >
    <div>
      <p class="font-header font-bold text-theme-text">
        Plan your own point crawl map
      </p>
      <p class="text-xs text-theme-muted">
        Generate custom regional networks with travel times, hidden paths, and
        hazard trade-offs.
      </p>
    </div>
    <a
      href="{cleanBase}/generators/point-crawl"
      class="inline-flex shrink-0 items-center gap-2 border border-theme-primary bg-theme-primary/10 px-4 py-2 font-header text-xs font-bold text-theme-primary transition-colors hover:bg-theme-primary hover:text-theme-on-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-accent"
      use:trackDiscoveryClick={{
        sourceKind: "answer",
        sourceId: "how-do-you-build-a-point-crawl-for-an-rpg",
        placement: "example_diagram_cta",
        ...classifyDiscoveryTarget("/generators/point-crawl"),
      }}
    >
      <span>Try the Point Crawl Generator</span>
      <span class="icon-[lucide--arrow-right] h-3.5 w-3.5" aria-hidden="true"
      ></span>
    </a>
  </div>
</figure>
