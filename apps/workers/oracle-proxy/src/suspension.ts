import {
  SuspensionMarkerSchema,
  type SuspensionMarker,
} from "../../../../packages/schema/src/publishing";

export function getSuspensionMarkerKey(publishId: string): string {
  return `moderation/suspensions/${publishId}.json`;
}

export async function readSuspensionMarker(
  env: { BUCKET?: any },
  publishId: string,
): Promise<SuspensionMarker | null> {
  if (!env.BUCKET) return null;
  const object = await env.BUCKET.get(getSuspensionMarkerKey(publishId));
  if (!object) return null;
  const text =
    typeof object.text === "function"
      ? await object.text()
      : new TextDecoder().decode(object.body);
  try {
    const raw = JSON.parse(text);
    const parsed = SuspensionMarkerSchema.safeParse(raw);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
