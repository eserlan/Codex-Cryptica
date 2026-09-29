import type { ReportDetail, ReportEntityInput } from "../types";

export interface BaseFields {
  portraitUrl?: string;
  summary?: string;
  description?: string;
  notes?: string;
  secrets?: string;
}

/** Brief: name/type/summary. Standard: + description and notes. */
export function baseFieldsForDetail(
  entity: ReportEntityInput,
  detail: ReportDetail,
): BaseFields {
  const fields: BaseFields = {
    portraitUrl: entity.portraitUrl,
    summary: entity.summary,
  };
  if (detail === "brief") return fields;
  fields.description = entity.description;
  fields.notes = entity.notes;
  fields.secrets = entity.secrets;
  return fields;
}
