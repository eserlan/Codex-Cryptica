import { z } from "zod";

const id = z
  .string()
  .regex(/^[a-zA-Z0-9_-]+$/)
  .max(160);
const digest = z.string().regex(/^[a-f0-9]{64}$/);
const snapshotPath = z
  .string()
  .regex(/^images\/artwork_[a-zA-Z0-9_-]+\.(?:png|jpg|jpeg|webp)$/);

/** Private snapshots are never public media, even if referenced in another field. */
export function isPrivateArtworkSnapshotPath(
  path: string | undefined,
): boolean {
  return (
    typeof path === "string" &&
    /^(?:\.\/|\/)*images\/artwork_[a-zA-Z0-9_-]+\.(?:png|jpg|jpeg|webp)$/.test(
      path,
    )
  );
}
const subject = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("place"), id }),
  z.object({ kind: z.literal("person"), id }),
  z.object({ kind: z.literal("scene"), id }),
]);

export const ArtworkAssociationSchema = z.object({
  version: z.literal(1),
  automatic: z
    .object({
      assetId: id,
      catalogueVersion: z.number().int().positive(),
      assignedOnTurnId: id,
    })
    .optional(),
  override: z
    .discriminatedUnion("kind", [
      z.object({ kind: z.literal("dismissed") }),
      z.object({ kind: z.literal("catalogue"), assetId: id, sha256: digest }),
      z
        .object({
          kind: z.literal("snapshot"),
          path: snapshotPath,
          mime: z.enum(["image/png", "image/jpeg", "image/webp"]),
          bytes: z
            .number()
            .int()
            .positive()
            .max(16 * 1024 * 1024),
          width: z.number().int().positive(),
          height: z.number().int().positive(),
          sha256: digest,
          thumbnailPath: snapshotPath.optional(),
        })
        .refine((value) => value.width * value.height <= 32_000_000),
    ])
    .optional(),
});

export const AdventureArtworkStateSchema = z
  .object({
    version: z.literal(1),
    associations: z
      .array(z.object({ subject, association: ArtworkAssociationSchema }))
      .max(200),
    pendingCanonicalLinks: z.array(z.unknown()).optional(),
  })
  .refine(
    (state) =>
      new Set(
        state.associations.map(
          ({ subject }) => `${subject.kind}:${subject.id}`,
        ),
      ).size === state.associations.length,
    "Duplicate artwork subject",
  );

export type ArtworkAssociation = z.infer<typeof ArtworkAssociationSchema>;
export type AdventureArtworkState = z.infer<typeof AdventureArtworkStateSchema>;

/** Compare parsed JSON data without depending on object property order. */
export function artworkDataUnchanged(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) || Array.isArray(right)) {
    return (
      Array.isArray(left) &&
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((value, index) => artworkDataUnchanged(value, right[index]))
    );
  }
  if (!left || !right || typeof left !== "object" || typeof right !== "object")
    return false;
  const a = left as Record<string, unknown>;
  const b = right as Record<string, unknown>;
  const keys = Object.keys(a);
  return (
    keys.length === Object.keys(b).length &&
    keys.every(
      (key) => Object.hasOwn(b, key) && artworkDataUnchanged(a[key], b[key]),
    )
  );
}

/** Keep unsupported or damaged extensions intact for later recovery. */
export function readAdventureArtworkState(
  input: unknown,
):
  | { kind: "absent" }
  | { kind: "known"; value: AdventureArtworkState }
  | { kind: "opaque"; raw: unknown } {
  if (input === undefined) return { kind: "absent" };
  const parsed = AdventureArtworkStateSchema.safeParse(input);
  if (!parsed.success) return { kind: "opaque", raw: input };
  // Parsing with stripping would discard fields added by a newer writer.
  // Retain the complete input as opaque if any content would be lost.
  if (!artworkDataUnchanged(parsed.data, input)) {
    return { kind: "opaque", raw: input };
  }
  return { kind: "known", value: parsed.data };
}
