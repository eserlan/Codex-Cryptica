import type { Node } from "@xyflow/svelte";
import type { Canvas } from "@codex/canvas-engine";

export async function openOrCreateSourceEntity({
  sourceEntityId,
  canvas,
  vault,
  canvasRegistry,
  modalUIStore,
  nodes,
}: {
  sourceEntityId: string | undefined;
  canvas: Canvas | undefined;
  vault: any;
  canvasRegistry: any;
  modalUIStore: any;
  nodes: Node[];
}) {
  if (sourceEntityId && vault.entities[sourceEntityId]) {
    modalUIStore.openZenMode(sourceEntityId);
    return;
  }

  const title = canvas?.name || "Untitled Adventure";
  const existing = vault.allEntities.find(
    (e: any) =>
      e.title.trim().toLowerCase() === title.trim().toLowerCase() &&
      e.type === "event",
  );

  let targetId = existing?.id;
  if (!targetId) {
    const sourceLore = (canvas?.metadata as any)?.sourceLore as
      string | undefined;
    const situationNode = nodes.find((n) => n.type === "situation");
    const situationData = situationNode?.data as any;
    const canvasSummary = (canvas?.metadata as any)?.summary as
      string | undefined;
    const situationSummary =
      situationData?.summary ||
      situationData?.description ||
      canvasSummary ||
      "";
    const situationHook =
      situationData?.hook || situationData?.startingHook || "";
    const situationGoal = situationData?.goal || situationData?.objective || "";

    if (sourceLore && sourceLore.trim()) {
      targetId = await vault.createEntity("note", title, {
        content: situationSummary ? `*${situationSummary}*` : "",
        lore: sourceLore.trim(),
        kind: "adventure",
        labels: ["adventure"],
      });
    } else {
      let markdown = `# ${title}\n\n`;
      if (situationSummary) markdown += `*${situationSummary}*\n\n`;

      if (situationHook || situationGoal) {
        markdown += `## Situation & Hook\n`;
        if (situationHook)
          markdown += `**Starting Hook:** ${situationHook}\n\n`;
        if (situationGoal) markdown += `**Objective:** ${situationGoal}\n\n`;
      }

      const locations = nodes.filter((n) => n.type === "location");
      if (locations.length > 0) {
        markdown += `## Key Locations\n`;
        for (const loc of locations) {
          const d = loc.data as any;
          const name = (loc as any).label || d?.title || d?.name || "Location";
          const desc = d?.description || d?.summary || "";
          const role = d?.role || "";
          const relation = d?.relation || "";
          const leverage = d?.leverage || "";
          const dilemma = d?.dilemma || "";
          const hazard = d?.hazard || d?.danger || "";
          markdown += `### ${name}\n`;
          if (desc) markdown += `${desc}\n\n`;
          if (role) markdown += `- **Role:** ${role}\n`;
          if (relation) markdown += `- **Relation:** ${relation}\n`;
          if (leverage) markdown += `- **Leverage:** ${leverage}\n`;
          if (dilemma) markdown += `- **Dilemma:** ${dilemma}\n`;
          if (hazard) markdown += `- **Hazard/Danger:** ${hazard}\n`;
          markdown += `\n`;
        }
      }

      const npcs = nodes.filter((n) => n.type === "npc");
      if (npcs.length > 0) {
        markdown += `## Important NPCs & Factions\n`;
        for (const npc of npcs) {
          const d = npc.data as any;
          const name = (npc as any).label || d?.title || d?.name || "NPC";
          const role = d?.role || "";
          const desc = d?.description || d?.summary || "";
          const relation = d?.relation || "";
          const wants = d?.wants || d?.motivation || "";
          const secret = d?.secret || "";
          const leverage = d?.leverage || "";
          const dilemma = d?.dilemma || "";
          markdown += `### ${name}${role ? ` (${role})` : ""}\n`;
          if (desc) markdown += `${desc}\n\n`;
          if (relation) markdown += `- **Relation:** ${relation}\n`;
          if (wants) markdown += `- **Wants:** ${wants}\n`;
          if (secret) markdown += `- **Secret:** ${secret}\n`;
          if (leverage) markdown += `- **Leverage:** ${leverage}\n`;
          if (dilemma) markdown += `- **Dilemma:** ${dilemma}\n`;
          markdown += `\n`;
        }
      }

      const clues = nodes.filter((n) => n.type === "clue");
      const threats = nodes.filter((n) => n.type === "threat");
      if (clues.length > 0 || threats.length > 0) {
        markdown += `## Clues & Threats\n`;
        for (const clue of clues) {
          const d = clue.data as any;
          const name = (clue as any).label || d?.title || d?.name || "Clue";
          const desc = d?.description || d?.summary || "";
          const leadsTo = d?.leadsTo || "";
          markdown += `- **${name}:** ${desc}${leadsTo ? ` *(Leads to: ${leadsTo})*` : ""}\n`;
        }
        if (clues.length > 0 && threats.length > 0) markdown += `\n`;
        for (const threat of threats) {
          const d = threat.data as any;
          const name = (threat as any).label || d?.title || d?.name || "Threat";
          const desc = d?.description || d?.summary || "";
          const trigger = d?.trigger || "";
          markdown += `- **${name}:** ${desc}${trigger ? ` *(Trigger: ${trigger})*` : ""}\n`;
        }
        markdown += `\n`;
      }

      const outcomes = nodes.filter((n) => n.type === "outcome");
      if (outcomes.length > 0) {
        markdown += `## Possible Outcomes\n`;
        for (const outcome of outcomes) {
          const d = outcome.data as any;
          const name =
            (outcome as any).label || d?.title || d?.name || "Outcome";
          const desc = d?.description || d?.summary || "";
          markdown += `### ${name}\n${desc}\n\n`;
        }
      }

      targetId = await vault.createEntity("note", title, {
        content: situationSummary ? `*${situationSummary}*` : "",
        lore: markdown.trim(),
        kind: "adventure",
        labels: ["adventure"],
      });
    }
  }

  if (canvas?.id) {
    canvas.metadata = {
      ...(canvas.metadata || {}),
      sourceEntityId: targetId,
    };
    await canvasRegistry.saveCanvas(canvas.id);
  }

  modalUIStore.openZenMode(targetId);
}
