import { getDB } from "$lib/utils/idb";

const key = (listingId: string) => `templatePublishOwnerToken:${listingId}`;

export async function saveTemplateOwnerToken(
  listingId: string,
  token: string,
): Promise<void> {
  await (await getDB()).put("settings", token, key(listingId));
}

export async function getTemplateOwnerToken(
  listingId: string,
): Promise<string | undefined> {
  return (await getDB()).get("settings", key(listingId));
}

export async function deleteTemplateOwnerToken(
  listingId: string,
): Promise<void> {
  await (await getDB()).delete("settings", key(listingId));
}
