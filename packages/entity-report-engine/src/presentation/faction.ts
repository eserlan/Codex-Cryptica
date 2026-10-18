import type {
  FactionReportView,
  ReportDetail,
  ReportEntityInput,
  ReportRelationshipLine,
} from "../types";
import { renderRelationshipReference } from "./relationship";
import { baseFieldsForDetail } from "./shared";

export function renderFactionSummary(
  entity: ReportEntityInput,
  members: ReportEntityInput[],
  relationships: ReportRelationshipLine[],
  detail: ReportDetail = "standard",
): FactionReportView {
  const brief = detail === "brief";
  return {
    title: entity.title,
    ...baseFieldsForDetail(entity, detail),
    members: brief ? [] : members.map((m) => m.title),
    relationships: brief ? [] : relationships.map(renderRelationshipReference),
  };
}
