import type { MergeNotice } from "./cloud-backup-types";

const MAX_COPY_LINES = 5;

/** The lines the Cloud Backup panel shows for the last merge. */
export function mergeNoticeLines(notice: MergeNotice | null): string[] {
  if (!notice) return [];
  const lines: string[] = [];
  if (notice.merged > 0) {
    lines.push(
      `Merged ${notice.merged} ${notice.merged === 1 ? "change" : "changes"}`,
    );
  }
  for (const title of notice.copies.slice(0, MAX_COPY_LINES)) {
    lines.push(`Kept your version of ${title.trim() || "Untitled"} as a copy`);
  }
  const more = notice.copies.length - MAX_COPY_LINES;
  if (more > 0) lines.push(`and ${more} more kept as copies`);
  return lines;
}
