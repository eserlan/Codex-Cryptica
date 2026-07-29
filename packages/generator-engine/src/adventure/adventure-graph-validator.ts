/**
 * Adventure Canvas Graph Validator Engine.
 *
 * Computes contextual, non-blocking validation warnings for the Adventure
 * Canvas Spatial Graph Builder (#1881).
 *
 * Warnings help GMs reason about scenario robustness (orphan nodes, unreachable
 * outcomes, single bottlenecks, unlinked clues) without blocking freeform editing.
 */

import type {
  AdventureCanvasDocument,
  AdventureGraphValidationWarning,
} from "./adventure-graph-types";

/**
 * Validate an AdventureCanvasDocument and return non-blocking graph warnings.
 */
export function validateAdventureGraph(
  document: AdventureCanvasDocument,
): AdventureGraphValidationWarning[] {
  const warnings: AdventureGraphValidationWarning[] = [];
  const { nodes, edges } = document;

  const incomingEdges = new Map<string, string[]>();
  const outgoingEdges = new Map<string, string[]>();

  for (const edge of edges) {
    if (!incomingEdges.has(edge.target)) incomingEdges.set(edge.target, []);
    incomingEdges.get(edge.target)!.push(edge.source);

    if (!outgoingEdges.has(edge.source)) outgoingEdges.set(edge.source, []);
    outgoingEdges.get(edge.source)!.push(edge.target);
  }

  for (const node of nodes) {
    const inCount = (incomingEdges.get(node.id) ?? []).length;
    const outCount = (outgoingEdges.get(node.id) ?? []).length;

    // 1. Orphan Node Warning (No connections)
    if (inCount === 0 && outCount === 0) {
      warnings.push({
        id: `warn-orphan-${node.id}`,
        nodeId: node.id,
        severity: "warning",
        message: `Orphan Node: '${node.data.title}' has no connected edges in the scenario graph.`,
      });
    }

    // 2. Unreachable Outcome Warning
    if (node.type === "outcome" && inCount === 0) {
      warnings.push({
        id: `warn-unreachable-outcome-${node.id}`,
        nodeId: node.id,
        severity: "warning",
        message: `Unreachable Outcome: '${node.data.title}' has no incoming path from a location or NPC.`,
      });
    }

    // 3. Unlinked Clue Warning
    if (node.type === "clue" && inCount === 0 && outCount === 0) {
      warnings.push({
        id: `warn-unlinked-clue-${node.id}`,
        nodeId: node.id,
        severity: "info",
        message: `Unlinked Clue: '${node.data.title}' is not connected to a location or NPC.`,
      });
    }
  }

  // 4. Single Mandatory Bottleneck Check
  const locationNodes = nodes.filter((n) => n.type === "location");
  if (locationNodes.length === 1 && nodes.some((n) => n.type === "outcome")) {
    const singleLoc = locationNodes[0];
    warnings.push({
      id: `warn-bottleneck-${singleLoc.id}`,
      nodeId: singleLoc.id,
      severity: "info",
      message: `Single Bottleneck: '${singleLoc.data.title}' is the only location connecting the situation to outcomes. Consider adding an alternate route.`,
    });
  }

  return warnings;
}
