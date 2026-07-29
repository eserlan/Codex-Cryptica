/**
 * Adventure Canvas Topology Generator.
 *
 * Converts a generated adventure output (from `parseAdventureResponseDetailed`
 * or `generateAdventureLocal`) into an auto-layout `AdventureCanvasDocument` graph.
 *
 * Issue #1881.
 */

import type { PublicGeneratorOutput } from "../public-generator-adapters";
import type {
  AdventureCanvasDocument,
  AdventureEdge,
  AdventureNode,
  AdventureNodeData,
} from "./adventure-graph-types";

/**
 * Generate an auto-layout spatial graph document from a public adventure output.
 */
export function generateAdventureGraphTopology(
  output: PublicGeneratorOutput,
): AdventureCanvasDocument {
  const documentId = `adv-canvas-${Date.now()}`;
  const now = new Date().toISOString();

  const nodes: AdventureNode[] = [];
  const edges: AdventureEdge[] = [];

  // Parse sections from content markdown if output is a PublicGeneratorOutput
  const content = output.content || "";
  const initialSituationMatch = content.match(
    /## Initial Situation\n([\s\S]*?)(?=\n##|\n###|$)/,
  );
  const primaryObjectiveMatch = content.match(
    /## Primary Objective & Pressure\n([\s\S]*?)(?=\n##|\n###|$)/,
  );

  const initialSituationText = initialSituationMatch
    ? initialSituationMatch[1].trim()
    : output.summary || "Adventure Starting Situation";
  const primaryObjectiveText = primaryObjectiveMatch
    ? primaryObjectiveMatch[1].trim()
    : "";

  // 1. Column 1 (X: 0): Starting Situation Node
  const situationNode: AdventureNode = {
    id: "node-situation",
    type: "situation",
    position: { x: 0, y: 200 },
    data: {
      title: output.title || "Initial Situation",
      type: "situation",
      summary: initialSituationText,
      description: primaryObjectiveText
        ? `Objective: ${primaryObjectiveText}`
        : undefined,
    },
  };
  nodes.push(situationNode);

  // Parse Key Locations
  const locationsMatch = content.match(
    /## Key Locations\n([\s\S]*?)(?=\n##|\n###|$)/,
  );
  const rawLocations = locationsMatch ? locationsMatch[1].trim() : "";
  const locationBlocks = rawLocations
    .split(/\n(?=- \*\*)/)
    .filter((b) => b.trim().startsWith("- **"));

  const locationNodes: AdventureNode[] = [];
  let locY = 0;
  locationBlocks.forEach((block, idx) => {
    const titleMatch = block.match(/- \*\*(.*?)\*\*(?::| —|\n|$)/);
    const title = titleMatch ? titleMatch[1].trim() : `Location ${idx + 1}`;

    const roleMatch = block.match(/-\s*\*\*Role:\*\*\s*(.*)/);
    const relationMatch = block.match(/-\s*\*\*Relation:\*\*\s*(.*)/);
    const leverageMatch = block.match(/-\s*\*\*Leverage:\*\*\s*(.*)/);
    const dilemmaMatch = block.match(/-\s*\*\*Dilemma:\*\*\s*(.*)/);

    // Extract basic description line
    const lines = block.split("\n").map((l) => l.trim());
    const descLine = lines[0].replace(/- \*\*.*?\*\*(?::| —)?\s*/, "");

    const data: AdventureNodeData = {
      title,
      type: "location",
      description: descLine || undefined,
      role: roleMatch ? roleMatch[1].trim() : undefined,
      relation: relationMatch ? relationMatch[1].trim() : undefined,
      leverage: leverageMatch ? leverageMatch[1].trim() : undefined,
      dilemma: dilemmaMatch ? dilemmaMatch[1].trim() : undefined,
      canLaunchDungeon: true,
      entityCategory: "location",
    };

    const locNode: AdventureNode = {
      id: `node-loc-${idx}`,
      type: "location",
      position: { x: 380, y: locY },
      data,
    };
    locationNodes.push(locNode);
    nodes.push(locNode);
    locY += 240;

    // Edge from Situation to first Location(s)
    edges.push({
      id: `edge-sit-loc-${idx}`,
      source: "node-situation",
      target: `node-loc-${idx}`,
      label: idx === 0 ? "starts at" : "leads to",
      type: "leads_to",
    });
  });

  // Parse Important NPCs & Factions
  const npcsMatch = content.match(
    /## Important NPCs & Factions\n([\s\S]*?)(?=\n##|\n###|$)/,
  );
  const rawNpcs = npcsMatch ? npcsMatch[1].trim() : "";
  const npcBlocks = rawNpcs
    .split(/\n(?=- \*\*)/)
    .filter((b) => b.trim().startsWith("- **"));

  let npcY = locY + 40;
  npcBlocks.forEach((block, idx) => {
    const titleMatch = block.match(/- \*\*(.*?)\*\*(?::| —|\n|$)/);
    const title = titleMatch ? titleMatch[1].trim() : `NPC ${idx + 1}`;

    const relationMatch = block.match(/-\s*\*\*Relation:\*\*\s*(.*)/);
    const wantsMatch = block.match(/-\s*\*\*Wants:\*\*\s*(.*)/);
    const secretMatch = block.match(/-\s*\*\*Secret:\*\*\s*(.*)/);
    const leverageMatch = block.match(/-\s*\*\*Leverage:\*\*\s*(.*)/);
    const dilemmaMatch = block.match(/-\s*\*\*Dilemma:\*\*\s*(.*)/);

    const lines = block.split("\n").map((l) => l.trim());
    const descLine = lines[0].replace(/- \*\*.*?\*\*(?::| —)?\s*/, "");

    const npcNode: AdventureNode = {
      id: `node-npc-${idx}`,
      type: "npc",
      position: { x: 380, y: npcY },
      data: {
        title,
        type: "npc",
        description: descLine || undefined,
        relation: relationMatch ? relationMatch[1].trim() : undefined,
        wants: wantsMatch ? wantsMatch[1].trim() : undefined,
        secret: secretMatch ? secretMatch[1].trim() : undefined,
        leverage: leverageMatch ? leverageMatch[1].trim() : undefined,
        dilemma: dilemmaMatch ? dilemmaMatch[1].trim() : undefined,
        entityCategory: "character",
      },
    };
    nodes.push(npcNode);
    npcY += 240;

    // Connect NPC to closest Location
    const targetLocId =
      locationNodes[idx % Math.max(1, locationNodes.length)]?.id ??
      "node-situation";
    edges.push({
      id: `edge-npc-loc-${idx}`,
      source: `node-npc-${idx}`,
      target: targetLocId,
      label: "operates at",
      type: "leads_to",
    });
  });

  // Parse Clues & Discoveries
  const discoveriesMatch = content.match(
    /## Clues, Secrets & Discoveries\n([\s\S]*?)(?=\n##|\n###|$)/,
  );
  const rawDiscoveries = discoveriesMatch ? discoveriesMatch[1].trim() : "";
  const discoveryLines = rawDiscoveries
    .split("\n")
    .filter((l) => l.trim().startsWith("- "))
    .map((l) => l.replace(/^- /, "").trim());

  let clueY = 0;
  discoveryLines.forEach((text, idx) => {
    const clueNode: AdventureNode = {
      id: `node-clue-${idx}`,
      type: "clue",
      position: { x: 760, y: clueY },
      data: {
        title: `Clue #${idx + 1}`,
        type: "clue",
        description: text,
      },
    };
    nodes.push(clueNode);
    clueY += 220;

    // Connect Clue to Location or Situation
    const targetLocId =
      locationNodes[idx % Math.max(1, locationNodes.length)]?.id ??
      "node-situation";
    edges.push({
      id: `edge-clue-loc-${idx}`,
      source: `node-clue-${idx}`,
      target: targetLocId,
      label: "holds clue",
      type: "holds_clue",
    });
  });

  // Parse Threats & Antagonists
  const threatsMatch = content.match(
    /## Threats & Antagonists\n([\s\S]*?)(?=\n##|\n###|$)/,
  );
  const rawThreats = threatsMatch ? threatsMatch[1].trim() : "";
  const threatLines = rawThreats
    .split("\n")
    .filter((l) => l.trim().startsWith("- "))
    .map((l) => l.replace(/^- /, "").trim());

  let threatY = clueY + 40;
  threatLines.forEach((text, idx) => {
    const threatNode: AdventureNode = {
      id: `node-threat-${idx}`,
      type: "threat",
      position: { x: 760, y: threatY },
      data: {
        title: `Threat #${idx + 1}`,
        type: "threat",
        description: text,
      },
    };
    nodes.push(threatNode);
    threatY += 220;

    edges.push({
      id: `edge-threat-sit-${idx}`,
      source: `node-threat-${idx}`,
      target: "node-situation",
      label: "threatens",
      type: "threatens",
    });
  });

  // Parse Possible Outcomes
  const outcomesMatch = content.match(
    /### Possible Outcomes\n([\s\S]*?)(?=\n###|\n##|$)/,
  );
  const rawOutcomes = outcomesMatch ? outcomesMatch[1].trim() : "";
  const outcomeLines = rawOutcomes
    .split("\n")
    .filter((l) => l.trim().startsWith("- "))
    .map((l) => l.replace(/^- /, "").trim());

  let outcomeY = 100;
  outcomeLines.forEach((text, idx) => {
    const outcomeNode: AdventureNode = {
      id: `node-outcome-${idx}`,
      type: "outcome",
      position: { x: 1140, y: outcomeY },
      data: {
        title: `Outcome #${idx + 1}`,
        type: "outcome",
        summary: text,
      },
    };
    nodes.push(outcomeNode);
    outcomeY += 240;

    const sourceLocId =
      locationNodes[idx % Math.max(1, locationNodes.length)]?.id ??
      "node-situation";
    edges.push({
      id: `edge-loc-outcome-${idx}`,
      source: sourceLocId,
      target: `node-outcome-${idx}`,
      label: "resolves to",
      type: "resolves_to",
    });
  });

  return {
    id: documentId,
    title: output.title || "Adventure Canvas",
    summary: output.summary || "",
    genre: output.lore || "Classic Fantasy",
    nodes,
    edges,
    metadata: {
      kind: "adventure",
    },
    createdAt: now,
    updatedAt: now,
  };
}
