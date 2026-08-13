export interface SourceRefParsed {
  system: string;
  type: string;
  id: string | undefined;
  path: string | undefined;
}

export function buildSourceRef(
  system: string,
  type: string,
  target: { id: string } | { path: string },
): string {
  if ("id" in target) {
    return `${system}:${type}:${target.id}`;
  }
  return `${system}:${type}:path:${target.path}`;
}

export function parseSourceRef(ref: string): SourceRefParsed {
  const parts = ref.split(":");
  const system = parts[0] ?? "";
  const type = parts[1] ?? "";
  if (parts[2] === "path") {
    return { system, type, id: undefined, path: parts.slice(3).join(":") };
  }
  return { system, type, id: parts.slice(2).join(":"), path: undefined };
}

export function buildEntitySourceRef(
  sourceSystem: string,
  draft: { sourceId?: string; sourcePath?: string; sourceType?: string },
): string {
  const type = draft.sourceType ?? "item";
  if (draft.sourceId !== undefined) {
    return buildSourceRef(sourceSystem, type, { id: draft.sourceId });
  }
  return buildSourceRef(sourceSystem, type, { path: draft.sourcePath ?? "" });
}
