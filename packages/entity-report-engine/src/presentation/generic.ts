import type {
  CharacterReportView,
  ReportDetail,
  ReportEntityInput,
} from "../types";
import { baseFieldsForDetail } from "./shared";

export function renderGenericSummary(
  entity: ReportEntityInput,
  detail: ReportDetail,
): CharacterReportView {
  return {
    title: entity.title,
    type: entity.type,
    ...baseFieldsForDetail(entity, detail),
    relationships: [],
    affiliations: [],
  };
}
