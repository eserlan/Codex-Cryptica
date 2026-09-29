import type {
  LocationReportView,
  ReportDetail,
  ReportEntityInput,
  ReportRelationshipLine,
} from "../types";
import { renderRelationshipReference } from "./relationship";
import { baseFieldsForDetail } from "./shared";

export function renderLocationSummary(
  entity: ReportEntityInput,
  parent: ReportEntityInput | undefined,
  contains: ReportEntityInput[],
  relationships: ReportRelationshipLine[],
  detail: ReportDetail,
): LocationReportView {
  const brief = detail === "brief";
  return {
    title: entity.title,
    type: entity.type,
    ...baseFieldsForDetail(entity, detail),
    parent: brief ? undefined : parent?.title,
    contains: brief ? [] : contains.map((c) => c.title),
    relationships: brief ? [] : relationships.map(renderRelationshipReference),
  };
}
