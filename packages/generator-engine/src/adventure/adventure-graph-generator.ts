/**
 * Adventure Canvas Topology Generator.
 *
 * Converts a generated adventure output (from `parseAdventureResponseDetailed`
 * or `generateAdventureLocal`) into an auto-layout `AdventureCanvasDocument` graph.
 *
 * Issue #1881.
 */

import { type Clock, systemClock } from "@codex/runtime";
import { AdventureFlowLayout } from "./adventure-flow-layout";
import type { PublicGeneratorOutput } from "../public-generator-adapters";
import type {
  AdventureCanvasDocument,
  AdventureEdge,
  AdventureNode,
  AdventureNodeData,
} from "./adventure-graph-types";

function cleanText(str: string | undefined): string | undefined {
  if (!str) return undefined;
  const cleaned = str
    .replace(/—/g, " - ")
    .replace(/\s+-\s+/g, " - ")
    .trim();
  return cleaned || undefined;
}

function extractTitleAndDesc(
  rawText: string,
  fallbackCategory: string,
  index: number,
): { title: string; description: string } {
  const clean = cleanText(rawText) || "";
  const match =
    clean.match(/^-(?:\s*)\*\*(.*?)\*\*(?::|-|—)?\s*([\s\S]*)$/) ||
    clean.match(/^\*\*(.*?)\*\*(?::|-|—)?\s*([\s\S]*)$/);
  if (match && match[1].trim()) {
    const extractedTitle = cleanText(match[1].trim())!;
    const extractedDesc = cleanText(match[2].trim()) || extractedTitle;
    return {
      title: extractedTitle,
      description: extractedDesc,
    };
  }

  const firstSentenceMatch = clean.match(/^([^.:—–\n]+)[.:—–]?\s*([\s\S]*)$/);
  if (
    firstSentenceMatch &&
    firstSentenceMatch[1].trim().length > 3 &&
    firstSentenceMatch[1].trim().length < 50
  ) {
    const derivedTitle = cleanText(firstSentenceMatch[1].trim())!;
    const rest = cleanText(firstSentenceMatch[2].trim()) || derivedTitle;
    return {
      title: derivedTitle,
      description: rest,
    };
  }

  const words = clean.split(/\s+/);
  const titleStr = words
    .slice(0, 4)
    .join(" ")
    .replace(/[^a-zA-Z0-9\s]$/, "");
  return {
    title: titleStr.length > 0 ? titleStr : `${fallbackCategory} #${index + 1}`,
    description: clean,
  };
}

/**
 * Generate an auto-layout spatial graph document from a public adventure output.
 */
export function generateAdventureGraphTopology(
  output: PublicGeneratorOutput,
  clock: Clock = systemClock,
): AdventureCanvasDocument {
  const documentId = `adv-canvas-${clock.now()}`;
  const now = new Date(clock.now()).toISOString();

  const nodes: AdventureNode[] = [];
  const edges: AdventureEdge[] = [];

  // Parse sections from content and lore markdown
  const combinedText = [output.content, output.lore]
    .filter(Boolean)
    .join("\n\n")
    .replace(/—/g, " - ");

  const initialSituationMatch = combinedText.match(
    /## Initial Situation\n([\s\S]*?)(?=\n##|\n###|$)/,
  );
  const primaryObjectiveMatch = combinedText.match(
    /## Primary Objective & Pressure\n([\s\S]*?)(?=\n##|\n###|$)/,
  );

  const initialSituationText = cleanText(
    initialSituationMatch
      ? initialSituationMatch[1].trim()
      : output.summary || "Adventure Starting Situation",
  );
  const primaryObjectiveText = cleanText(
    primaryObjectiveMatch ? primaryObjectiveMatch[1].trim() : "",
  );

  // 1. Key Locations (Row 1, Y: 240)
  const locationsMatch = combinedText.match(
    /## Key Locations\n([\s\S]*?)(?=\n##|\n###|$)/,
  );
  const rawLocations = locationsMatch ? locationsMatch[1].trim() : "";
  const locationBlocks = rawLocations
    .split(/\n(?=- \*\*)/)
    .filter((b) => b.trim().startsWith("- **"));

  const locationNodes: AdventureNode[] = [];
  locationBlocks.forEach((block, idx) => {
    const titleMatch = block.match(/- \*\*(.*?)\*\*(?::| -| —|\n|$)/);
    const title = cleanText(
      titleMatch ? titleMatch[1].trim() : `Location ${idx + 1}`,
    )!;

    const roleMatch = block.match(/-\s*\*\*Role:\*\*\s*(.*)/);
    const relationMatch = block.match(/-\s*\*\*Relation:\*\*\s*(.*)/);
    const leverageMatch = block.match(/-\s*\*\*Leverage:\*\*\s*(.*)/);
    const dilemmaMatch = block.match(/-\s*\*\*Dilemma:\*\*\s*(.*)/);

    // Extract basic description line
    const lines = block.split("\n").map((l) => l.trim());
    const descLine = lines[0].replace(/- \*\*.*?\*\*(?::| -| —)?\s*/, "");

    const data: AdventureNodeData = {
      title,
      type: "location",
      description: cleanText(descLine),
      role: cleanText(roleMatch ? roleMatch[1].trim() : undefined),
      relation: cleanText(relationMatch ? relationMatch[1].trim() : undefined),
      leverage: cleanText(leverageMatch ? leverageMatch[1].trim() : undefined),
      dilemma: cleanText(dilemmaMatch ? dilemmaMatch[1].trim() : undefined),
      canLaunchDungeon: true,
      entityCategory: "location",
    };

    const locNode: AdventureNode = {
      id: `node-loc-${idx}`,
      type: "location",
      position: { x: idx * 340, y: 240 },
      data,
    };
    locationNodes.push(locNode);
    nodes.push(locNode);
  });

  // 2. Row 0 (Y: 0): Starting Situation Node (Centered above locations)
  const locCount = Math.max(1, locationNodes.length);
  const situationX = Math.max(0, (locCount * 340 - 260) / 2);
  const situationNode: AdventureNode = {
    id: "node-situation",
    type: "situation",
    position: { x: situationX, y: 0 },
    data: {
      title: cleanText(output.title) || "Initial Situation",
      type: "situation",
      summary: initialSituationText,
      description: primaryObjectiveText
        ? `Objective: ${primaryObjectiveText}`
        : undefined,
    },
  };
  nodes.push(situationNode);

  // Edges: Situation (Top) -> Location(s) (Bottom)
  locationNodes.forEach((locNode, idx) => {
    edges.push({
      id: `edge-sit-loc-${idx}`,
      source: "node-situation",
      target: locNode.id,
      label: idx === 0 ? "starts at" : "leads to",
      type: "leads_to",
    });
  });

  // 3. Important NPCs & Factions (Row 2, Y: 480)
  const npcsMatch = combinedText.match(
    /## Important NPCs & Factions\n([\s\S]*?)(?=\n##|\n###|$)/,
  );
  const rawNpcs = npcsMatch ? npcsMatch[1].trim() : "";
  const npcBlocks = rawNpcs
    .split(/\n(?=- \*\*)/)
    .filter((b) => b.trim().startsWith("- **"));

  const npcNodes: AdventureNode[] = [];
  npcBlocks.forEach((block, idx) => {
    const titleMatch = block.match(/- \*\*(.*?)\*\*(?::| -| —|\n|$)/);
    const title = cleanText(
      titleMatch ? titleMatch[1].trim() : `NPC ${idx + 1}`,
    )!;

    const relationMatch = block.match(/-\s*\*\*Relation:\*\*\s*(.*)/);
    const wantsMatch = block.match(/-\s*\*\*Wants:\*\*\s*(.*)/);
    const secretMatch = block.match(/-\s*\*\*Secret:\*\*\s*(.*)/);
    const leverageMatch = block.match(/-\s*\*\*Leverage:\*\*\s*(.*)/);
    const dilemmaMatch = block.match(/-\s*\*\*Dilemma:\*\*\s*(.*)/);

    const lines = block.split("\n").map((l) => l.trim());
    const descLine = lines[0].replace(/- \*\*.*?\*\*(?::| -| —)?\s*/, "");

    const npcNode: AdventureNode = {
      id: `node-npc-${idx}`,
      type: "npc",
      position: { x: idx * 340, y: 480 },
      data: {
        title,
        type: "npc",
        description: cleanText(descLine),
        relation: cleanText(
          relationMatch ? relationMatch[1].trim() : undefined,
        ),
        wants: cleanText(wantsMatch ? wantsMatch[1].trim() : undefined),
        secret: cleanText(secretMatch ? secretMatch[1].trim() : undefined),
        leverage: cleanText(
          leverageMatch ? leverageMatch[1].trim() : undefined,
        ),
        dilemma: cleanText(dilemmaMatch ? dilemmaMatch[1].trim() : undefined),
        entityCategory: "character",
      },
    };
    npcNodes.push(npcNode);
    nodes.push(npcNode);

    // Edge: Location (Row 1) -> NPC (Row 2)
    const sourceLocId =
      locationNodes[idx % Math.max(1, locationNodes.length)]?.id ??
      "node-situation";
    edges.push({
      id: `edge-loc-npc-${idx}`,
      source: sourceLocId,
      target: npcNode.id,
      label: "operates at",
      type: "leads_to",
    });
  });

  // 4. Clues & Discoveries (Row 3, Y: 720)
  const discoveriesMatch = combinedText.match(
    /## Clues, Secrets & Discoveries\n([\s\S]*?)(?=\n##|\n###|$)/,
  );
  const rawDiscoveries = discoveriesMatch ? discoveriesMatch[1].trim() : "";
  const discoveryLines = rawDiscoveries
    .split("\n")
    .filter((l) => l.trim().startsWith("- "))
    .map((l) => l.replace(/^- /, "").trim());

  let clueCount = 0;
  discoveryLines.forEach((text, idx) => {
    const { title, description } = extractTitleAndDesc(text, "Clue", idx);
    const clueNode: AdventureNode = {
      id: `node-clue-${idx}`,
      type: "clue",
      position: { x: idx * 340, y: 720 },
      data: {
        title,
        type: "clue",
        description,
      },
    };
    nodes.push(clueNode);
    clueCount++;

    const sourceLocId =
      locationNodes[idx % Math.max(1, locationNodes.length)]?.id ??
      "node-situation";
    edges.push({
      id: `edge-loc-clue-${idx}`,
      source: sourceLocId,
      target: clueNode.id,
      label: "holds clue",
      type: "holds_clue",
    });
  });

  // 5. Threats & Antagonists (Row 3, Y: 720 alongside Clues)
  const threatsMatch = combinedText.match(
    /## Threats & Antagonists\n([\s\S]*?)(?=\n##|\n###|$)/,
  );
  const rawThreats = threatsMatch ? threatsMatch[1].trim() : "";
  const threatLines = rawThreats
    .split("\n")
    .filter((l) => l.trim().startsWith("- "))
    .map((l) => l.replace(/^- /, "").trim());

  threatLines.forEach((text, idx) => {
    const { title, description } = extractTitleAndDesc(text, "Threat", idx);
    const threatNode: AdventureNode = {
      id: `node-threat-${idx}`,
      type: "threat",
      position: { x: (clueCount + idx) * 340, y: 720 },
      data: {
        title,
        type: "threat",
        description,
      },
    };
    nodes.push(threatNode);

    edges.push({
      id: `edge-sit-threat-${idx}`,
      source: "node-situation",
      target: threatNode.id,
      label: "threatens",
      type: "threatens",
    });
  });

  // 6. Possible Outcomes (Row 4, Y: 960)
  const outcomesMatch = combinedText.match(
    /### Possible Outcomes\n([\s\S]*?)(?=\n###|\n##|$)/,
  );
  const rawOutcomes = outcomesMatch ? outcomesMatch[1].trim() : "";
  const outcomeLines = rawOutcomes
    .split("\n")
    .filter((l) => l.trim().startsWith("- "))
    .map((l) => l.replace(/^- /, "").trim());

  outcomeLines.forEach((text, idx) => {
    const { title, description } = extractTitleAndDesc(text, "Outcome", idx);
    const outcomeNode: AdventureNode = {
      id: `node-outcome-${idx}`,
      type: "outcome",
      position: { x: idx * 360 + 100, y: 960 },
      data: {
        title,
        type: "outcome",
        description,
      },
    };
    nodes.push(outcomeNode);

    const sourceLocId =
      locationNodes[idx % Math.max(1, locationNodes.length)]?.id ??
      "node-situation";
    edges.push({
      id: `edge-loc-outcome-${idx}`,
      source: sourceLocId,
      target: outcomeNode.id,
      label: "resolves to",
      type: "resolves_to",
    });
  });

  const rawDoc: AdventureCanvasDocument = {
    id: documentId,
    title: cleanText(output.title) || "Adventure Canvas",
    summary: cleanText(output.summary) || "",
    genre: output.lore || "Classic Fantasy",
    nodes,
    edges,
    metadata: {
      kind: "adventure",
      sourceLore: combinedText,
    },
    createdAt: now,
    updatedAt: now,
  };

  const layoutEngine = new AdventureFlowLayout();
  return layoutEngine.applyLayout(rawDoc);
}
