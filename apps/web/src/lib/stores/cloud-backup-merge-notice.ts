import type { MergeNotice } from "./cloud-backup-types";

/** The lines the Cloud Backup panel shows for the last merge. */
export function mergeNoticeLines(notice: MergeNotice | null): string[] {
  if (!notice) return [];
  const lines: string[] = [];
  if (notice.merged > 0) {
    lines.push(
      `Merged ${notice.merged} ${notice.merged === 1 ? "change" : "changes"}`,
    );
  }
  for (const title of notice.copies) {
    lines.push(`Kept your version of ${title} as a copy`);
  }
  return lines;
}
