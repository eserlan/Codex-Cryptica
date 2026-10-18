import { DEFAULT_REPORT_INCLUDE } from "./defaults";
import type { ReportEntityInput, ReportInput, ReportOptions } from "./types";

export const entity = (
  id: string,
  over: Partial<ReportEntityInput> = {},
): ReportEntityInput => ({
  id,
  title: id.toUpperCase(),
  type: "character",
  labels: [],
  ...over,
});

export const options = (over: Partial<ReportOptions> = {}): ReportOptions => ({
  scope: { origin: "graph" },
  include: { ...DEFAULT_REPORT_INCLUDE },
  detail: "standard",
  ...over,
});

export const sampleInput = (): ReportInput => ({
  entities: [
    entity("vargas", {
      title: "Vargas",
      summary: "A rogue.",
      description: "A rogue with a past.",
      notes: "## History\nBorn in Vaeloth.",
      secrets: "Is the spy.",
      portraitUrl: "vargas.png",
    }),
    entity("lajos", { title: "Lajos" }),
    entity("eagles", { title: "Black Eagles", type: "faction" }),
    entity("relic", { title: "The Relic", type: "item", description: "Old." }),
  ],
  relationships: [
    { sourceId: "vargas", targetId: "lajos", label: "friend" },
    { sourceId: "vargas", targetId: "eagles", label: "serves" },
  ],
  factionMembership: { eagles: ["vargas"] },
});
