import {
  ArtworkAssociationSchema,
  artworkDataUnchanged,
  type ArtworkAssociation,
} from "schema";

export type ArtworkCommand =
  | { kind: "dismiss" }
  | { kind: "restore" }
  | {
      kind: "keep" | "replace";
      choice: Exclude<
        NonNullable<ArtworkAssociation["override"]>,
        { kind: "dismissed" }
      >;
    };

/** Pure state transition. Snapshot bytes must be preserved by the caller first. */
export function applyArtworkCommand(
  current: ArtworkAssociation,
  command: ArtworkCommand,
):
  | { ok: true; association: ArtworkAssociation }
  | { ok: false; reason: "invalid-association" } {
  const existing = ArtworkAssociationSchema.safeParse(current);
  if (!existing.success || !artworkDataUnchanged(existing.data, current))
    return { ok: false, reason: "invalid-association" };
  const { override: _previous, ...base } = existing.data;
  const candidate =
    command.kind === "restore"
      ? base
      : {
          ...base,
          override:
            command.kind === "dismiss" ? { kind: "dismissed" } : command.choice,
        };
  const parsed = ArtworkAssociationSchema.safeParse(candidate);
  return parsed.success
    ? { ok: true, association: parsed.data }
    : { ok: false, reason: "invalid-association" };
}
