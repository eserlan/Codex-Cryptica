import type {
  CharacterReportView,
  ReportDetail,
  ReportEntityInput,
  ReportRelationshipLine,
} from "../types";
import { renderRelationshipReference } from "./relationship";
import { baseFieldsForDetail } from "./shared";

export function renderCharacterSummary(
  entity: ReportEntityInput,
  relationships: ReportRelationshipLine[],
  affiliations: string[],
  detail: ReportDetail,
): CharacterReportView {
  const brief = detail === "brief";
  return {
    title: entity.title,
    type: entity.type,
    ...baseFieldsForDetail(entity, detail),
    relationships: brief ? [] : relationships.map(renderRelationshipReference),
    affiliations: brief ? [] : affiliations,
  };
}
