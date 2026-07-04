export function safeSnapshot<T>(obj: T): T {
  if (obj == null) return obj;
  try {
    return structuredClone(obj);
  } catch {
    try {
      return JSON.parse(JSON.stringify(obj));
    } catch {
      return obj;
    }
  }
}

export function getConsolidatedContext(
  entity: any,
  options?: {
    isGuest?: boolean;
    source?: string;
    instructions?: string;
    priority?: "instructions-first" | "incoming-first" | "preserve-existing";
  },
): string {
  const parts = [];
  if (!options?.isGuest && entity.lore?.trim()) parts.push(entity.lore.trim());
  if (entity.content?.trim()) parts.push(entity.content.trim());
  return parts.join("\n\n");
}
