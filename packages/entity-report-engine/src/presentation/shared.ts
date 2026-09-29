import type { ReportDetail, ReportEntityInput } from "../types";

export interface BaseFields {
  portraitUrl?: string;
  summary?: string;
  description?: string;
  notes?: string;
  secrets?: string;
}

/** Brief: name/type/summary. Standard: + description. Detailed: + notes. */
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
  fields.secrets = entity.secrets;
  if (detail === "detailed") fields.notes = entity.notes;
  return fields;
}
