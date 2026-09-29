import type { ReportDetail, ReportInclude } from "./types";

export const DEFAULT_REPORT_INCLUDE: ReportInclude = {
  descriptions: true,
  relationships: true,
  factionsAffiliations: true,
  portraits: true,
  notes: true,
  gmOnlySecrets: false,
  canvasConnections: true,
  graphConnections: true,
};

export const DEFAULT_REPORT_DETAIL: ReportDetail = "standard";
