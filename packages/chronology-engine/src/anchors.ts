import type { TemporalMetadata } from "./types";

export interface TemporalAnchor {
  id: string;
  type: string;
  label?: string;
  date?: TemporalMetadata;
  start_date?: TemporalMetadata;
  end_date?: TemporalMetadata;
  linkedEntityId?: string;
  note?: string;
}

export interface TemporalEntity {
  id: string;
  type: string;
  title?: string;
  date?: TemporalMetadata;
  start_date?: TemporalMetadata;
  end_date?: TemporalMetadata;
  temporalAnchors?: TemporalAnchor[];
}

export interface ProjectedAnchor extends TemporalAnchor {
  entityId: string;
  anchorId: string;
  primary: boolean;
}

export function validateRange(
  start?: TemporalMetadata,
  end?: TemporalMetadata,
): { valid: true } | { valid: false; reason: string } {
  if (start && end && end.year < start.year) {
    return { valid: false, reason: "End date cannot be before start date." };
  }
  return { valid: true };
}

export function deriveProjectedAnchors(
  entity: TemporalEntity,
): ProjectedAnchor[] {
  const projected: ProjectedAnchor[] = [];

  if (entity.date) {
    projected.push({
      id: "primary",
      anchorId: "primary",
      entityId: entity.id,
      type: "primary",
      date: entity.date,
      primary: true,
    });
  }

  if (entity.start_date || entity.end_date) {
    projected.push({
      id: "primary-range",
      anchorId: "primary-range",
      entityId: entity.id,
      type: "primaryRange",
      start_date: entity.start_date,
      end_date: entity.end_date,
      primary: true,
    });
  }

  for (const anchor of entity.temporalAnchors ?? []) {
    projected.push({
      ...anchor,
      anchorId: anchor.id,
      entityId: entity.id,
      primary: false,
    });
  }

  return projected;
}

export function upsertAnchor(
  anchors: TemporalAnchor[] | undefined,
  anchor: TemporalAnchor,
): TemporalAnchor[] {
  const existing = anchors ?? [];
  const index = existing.findIndex((candidate) => candidate.id === anchor.id);
  if (index === -1) return [...existing, anchor];

  return existing.map((candidate, candidateIndex) =>
    candidateIndex === index ? anchor : candidate,
  );
}

export function removeAnchor(
  anchors: TemporalAnchor[] | undefined,
  anchorId: string,
): TemporalAnchor[] {
  return (anchors ?? []).filter((anchor) => anchor.id !== anchorId);
}
