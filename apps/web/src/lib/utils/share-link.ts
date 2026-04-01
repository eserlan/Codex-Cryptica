export function buildP2PShareLink(
  origin: string,
  pathname: string,
  peerId: string,
) {
  const url = new URL(origin + pathname);
  url.searchParams.set("shareId", `p2p-${peerId}`);
  return url.toString();
}

export async function copyTextToClipboard(
  text: string,
  clipboard?: Pick<Clipboard, "writeText">,
) {
  if (!clipboard?.writeText) return false;

  try {
    await clipboard.writeText(text);
    return true;
  } catch (err) {
    console.warn("[share-link] Clipboard copy failed", err);
    return false;
  }
}
