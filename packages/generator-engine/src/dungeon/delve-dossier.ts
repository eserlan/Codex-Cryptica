import type {
  DelveCanvasEdge,
  DelveCanvasNode,
  DelveEdgeData,
  DelveRoomNodeData,
  DungeonSectorFrameData,
} from "./delve-builder-types";

export interface DelveDossierInput {
  title: string;
  dossierTerm?: string;
  canvasHref?: string;
  canvasImagePath?: string;
  sourceContent?: string;
  sourceLore?: string;
  nodes: DelveCanvasNode[];
  edges: DelveCanvasEdge[];
}

export interface DelveDossier {
  title: string;
  summary: string;
  markdown: string;
  sectorCount: number;
  areaCount: number;
}

function cleanHeading(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .replace(/^#+\s*/, "")
    .trim();
}

function nonEmpty(values: string[] | undefined): string[] {
  // ⚡ Bolt Optimization: Replace chained .map().filter() with a single imperative loop
  // to avoid allocating an unused intermediate array for string trimming.
  const result: string[] = [];
  if (values) {
    for (const value of values) {
      const trimmed = value.trim();
      if (trimmed) {
        result.push(trimmed);
      }
    }
  }
  return result;
}

const roleSymbols: Record<DelveRoomNodeData["role"], string> = {
  entrance: "🚪",
  encounter: "⚔️",
  hazard: "⚠️",
  treasure: "💎",
  secret: "👁️",
  lore: "📜",
  faction: "🏴",
  climax: "🔥",
  special: "✨",
};

const roleLegend = [
  ["🚪", "Entrance"],
  ["⚔️", "Encounter"],
  ["⚠️", "Hazard"],
  ["💎", "Treasure"],
  ["👁️", "Secret"],
  ["📜", "Lore"],
  ["🏴", "Faction"],
  ["🔥", "Climax"],
  ["✨", "Special"],
]
  .map(([symbol, label]) => `${symbol} ${label}`)
  .join(" · ");

function nestMarkdown(markdown: string, levels = 2): string {
  return markdown.replace(/^(#{1,6})(\s+)/gm, (match, hashes, spacing) => {
    const depth = Math.min(6, hashes.length + levels);
    return `${"#".repeat(depth)}${spacing}`;
  });
}

function removeMarkdownSection(markdown: string, heading: string): string {
  const lines = markdown.split("\n");
  const kept: string[] = [];
  let skippedHeadingDepth: number | null = null;
  for (const line of lines) {
    const match = /^(#{1,6})\s+(.+?)\s*$/.exec(line);
    if (skippedHeadingDepth !== null) {
      if (match && match[1].length <= skippedHeadingDepth) {
        skippedHeadingDepth = null;
      } else {
        continue;
      }
    }
    if (
      match &&
      cleanHeading(match[2]).toLowerCase() === heading.toLowerCase()
    ) {
      skippedHeadingDepth = match[1].length;
      continue;
    }
    kept.push(line);
  }
  return kept
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function firstProseParagraph(markdown: string | undefined): string {
  if (!markdown?.trim()) return "";

  return (
    markdown
      .trim()
      .split(/\n\s*\n/)
      .map((paragraph) =>
        paragraph
          .replace(/^#{1,6}\s+.*$/gm, "")
          .replace(/^\s*[-*+]\s+/gm, "")
          .replace(/^\s*\d+\.\s+/gm, "")
          .replace(/^\s*>\s?/gm, "")
          .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
          .replace(/[*_`~]/g, "")
          .replace(/\s+/g, " ")
          .trim(),
      )
      .find(Boolean) ?? ""
  );
}

function roomData(node: DelveCanvasNode): DelveRoomNodeData | null {
  return node.type === "delveRoom" ? (node.data as DelveRoomNodeData) : null;
}

function sectorData(node: DelveCanvasNode): DungeonSectorFrameData | null {
  return node.type === "delveSectorGroup"
    ? (node.data as DungeonSectorFrameData)
    : null;
}

function listSection(label: string, values: string[] | undefined): string[] {
  const items = nonEmpty(values);
  if (items.length === 0) return [];
  return [`**${label}**`, ...items.map((item) => `- ${item}`), ""];
}

function passageDetails(
  edge: DelveCanvasEdge,
  direction?: "outgoing" | "incoming",
): string {
  const data = edge.data as DelveEdgeData | undefined;
  const passage = {
    standard: { icon: "👣", label: "Passage" },
    hidden: { icon: "👁️", label: "Hidden passage" },
    conditional: { icon: "🔒", label: "Conditional passage" },
    vertical: { icon: "🪜", label: "Vertical passage" },
  }[data?.type ?? "standard"];
  const kind = `${passage.icon} ${passage.label}${
    direction ? ` (${direction})` : ""
  }`;
  const details = [data?.description, data?.condition]
    .filter((value): value is string => Boolean(value?.trim()))
    .join("; ");
  return `${kind}${details ? `: ${details}` : ""}`;
}

function roomConnectionLines(
  room: DelveRoomNodeData,
  edges: DelveCanvasEdge[],
  roomsById: Map<string, DelveRoomNodeData>,
): string[] {
  const connections = edges
    .map((edge) => {
      const data = edge.data as DelveEdgeData | undefined;
      const isSource = edge.source === room.id;
      const isTarget = edge.target === room.id;
      if (!isSource && !isTarget) return null;

      const otherId = isSource ? edge.target : edge.source;
      const other = roomsById.get(otherId);
      if (!other) return null;

      const direction =
        data?.bidirectional !== false
          ? undefined
          : isSource
            ? "outgoing"
            : "incoming";
      return `- **${cleanHeading(other.name)}** — ${passageDetails(edge, direction)}`;
    })
    .filter((line): line is string => line !== null);

  return connections.length > 0 ? ["**Connections**", ...connections, ""] : [];
}

function roomSection(
  room: DelveRoomNodeData,
  edges: DelveCanvasEdge[],
  roomsById: Map<string, DelveRoomNodeData>,
): string[] {
  const stocking = room.stocking ?? {};
  const lines = [
    `#### ${roleSymbols[room.role]} ${cleanHeading(room.name)}`,
    "",
  ];

  if (room.description?.trim()) {
    lines.push(room.description.trim(), "");
  } else if (room.summary?.trim()) {
    lines.push(room.summary.trim(), "");
  }

  if (stocking.atmosphere?.trim()) {
    lines.push(`**Atmosphere:** ${stocking.atmosphere.trim()}`, "");
  }
  lines.push(...listSection("Encounters", stocking.encounters));
  lines.push(...listSection("Hazards & Traps", stocking.hazards));
  lines.push(...listSection("Treasure & Loot", stocking.treasure));
  lines.push(...listSection("Secrets & Clues", stocking.secrets));
  if (stocking.factionPresence?.trim()) {
    lines.push(`**Faction Presence:** ${stocking.factionPresence.trim()}`, "");
  }
  if (room.role === "climax" && room.climax) {
    lines.push(`**Stakes:** ${room.climax.stakes.trim()}`, "");
    lines.push(`**Decision:** ${room.climax.decision.trim()}`, "");
    lines.push(...listSection("Possible Outcomes", room.climax.outcomes));
  }
  lines.push(...roomConnectionLines(room, edges, roomsById));
  return lines;
}

export function buildDelveDossier(input: DelveDossierInput): DelveDossier {
  const dossierTerm = cleanHeading(input.dossierTerm || "Delve");
  const sectors = input.nodes
    .map((node) => ({ node, data: sectorData(node) }))
    .filter(
      (
        entry,
      ): entry is {
        node: DelveCanvasNode;
        data: DungeonSectorFrameData;
      } => entry.data !== null,
    )
    .sort((a, b) => a.data.order - b.data.order);
  const rooms = input.nodes
    .map((node) => ({ node, data: roomData(node) }))
    .filter(
      (entry): entry is { node: DelveCanvasNode; data: DelveRoomNodeData } =>
        entry.data !== null,
    );
  const roomsById = new Map(rooms.map(({ data }) => [data.id, data]));
  const title = `${cleanHeading(input.title)} — ${dossierTerm} Dossier`;
  const summary =
    firstProseParagraph(input.sourceContent) ||
    firstProseParagraph(input.sourceLore) ||
    rooms
      .find(({ data }) => data.description?.trim())
      ?.data.description.trim() ||
    sectors
      .find(({ data }) => data.description?.trim())
      ?.data.description.trim() ||
    `GM reference for ${cleanHeading(input.title)}.`;
  const lines: string[] = [];
  if (input.canvasHref?.trim()) {
    lines.push(`[Open ${dossierTerm} Canvas](${input.canvasHref.trim()})`, "");
  }
  if (input.canvasImagePath?.trim()) {
    lines.push(
      `![Map of ${cleanHeading(input.title)}](${input.canvasImagePath.trim()})`,
      "",
    );
  }

  const sourceContent = input.sourceContent?.trim();
  const sourceLore = removeMarkdownSection(
    input.sourceLore?.trim() ?? "",
    "Dungeon Layout",
  );
  if (sourceContent || sourceLore) {
    lines.push("## Original Delve Background", "");
    if (sourceContent && !sourceLore) {
      lines.push("### Location Summary", "", nestMarkdown(sourceContent), "");
    }
    if (sourceLore) {
      lines.push(
        "### Generated Dungeon & GM Reference",
        "",
        nestMarkdown(sourceLore),
        "",
      );
    }
  }

  lines.push("## Canvas Delve Structure", "", `*${roleLegend}*`, "");

  for (const { node: sectorNode, data: sector } of sectors) {
    lines.push(`### Sector ${sector.order}: ${cleanHeading(sector.name)}`, "");

    const sectorRooms = rooms
      .filter(
        ({ node, data }) =>
          data.sectorId === sector.id || node.parentId === sectorNode.id,
      )
      .sort(
        (a, b) =>
          a.node.position.y - b.node.position.y ||
          a.node.position.x - b.node.position.x ||
          a.data.name.localeCompare(b.data.name),
      );
    for (const { data: room } of sectorRooms) {
      lines.push(...roomSection(room, input.edges, roomsById));
    }
  }

  return {
    title,
    summary,
    markdown: lines.join("\n").trim(),
    sectorCount: sectors.length,
    areaCount: rooms.length,
  };
}
