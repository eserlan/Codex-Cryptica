import type { GeneratorOutput } from "$lib/services/seo/generator-engine";
import { dungeonDelveService } from "$lib/services/dungeon-delve-service";
import { generateAdventureGraphTopology } from "generator-engine";
import { getGeneratorDocumentLayout } from "./generator-document-layout";
import { createPendingDelveTransfer } from "$lib/services/seo/pending-delve-transfer";

type CanvasBuilder = (data: GeneratorOutput) => unknown;

/** Builds the browser handoff payload for a generated Delve. */
export function buildDelveCanvasTransfer(
  data: GeneratorOutput,
  buildCanvas: CanvasBuilder = (output) =>
    dungeonDelveService.buildDelveCanvasFromConcept(output),
) {
  const canvas = buildCanvas(data);
  const layout = getGeneratorDocumentLayout(data);
  const content = data.summary
    ? `*${data.summary}*\n\n${layout.content}`
    : layout.content;

  return createPendingDelveTransfer(canvas, {
    type: "location",
    kind: "dungeon",
    title: data.title,
    content,
    lore: layout.lore,
    labels: data.labels,
    status: data.status,
  });
}

/** Builds the browser handoff payload for a generated adventure. */
export function buildAdventureCanvasTransfer(
  data: GeneratorOutput,
  buildCanvas: CanvasBuilder = (output) =>
    generateAdventureGraphTopology(output),
) {
  const canvas = buildCanvas(data);
  return createPendingDelveTransfer(canvas, {
    type: "note",
    kind: "adventure",
    title: data.title,
    content: data.summary ? `*${data.summary}*` : "",
    lore: [data.content, data.lore].filter(Boolean).join("\n\n"),
    labels: data.labels,
    status: data.status,
  });
}
