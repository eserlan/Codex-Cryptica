import { CLOUD_BACKUP_MEMBER_EDITOR, CLOUD_BACKUP_OWNER_EDITOR } from "schema";

/** Who deleted an entity, as a phrase that sits inside a sentence. */
export function deletedByLabel(deletedBy: string): string {
  if (deletedBy === CLOUD_BACKUP_OWNER_EDITOR) return "the owner";
  if (deletedBy === CLOUD_BACKUP_MEMBER_EDITOR) return "a group member";
  return deletedBy;
}

const capitalised = (text: string) =>
  text.charAt(0).toUpperCase() + text.slice(1);

/** The toast text for the deletes a pull applied. Needs at least one. */
export function deleteNoticeText(
  tombstones: readonly { title: string; deletedBy: string }[],
): string {
  const [first] = tombstones;
  const who = capitalised(deletedByLabel(first.deletedBy));
  if (tombstones.length === 1) {
    return `${who} deleted ${first.title.trim() || "Untitled"}`;
  }
  const people = new Set(tombstones.map((tombstone) => tombstone.deletedBy));
  return people.size === 1
    ? `${who} deleted ${tombstones.length} entities`
    : `${tombstones.length} entities were deleted by group members`;
}
