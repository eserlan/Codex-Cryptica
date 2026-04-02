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

export async function startShareSession(options: {
  origin: string;
  pathname: string;
  clipboard?: Pick<Clipboard, "writeText">;
  startHosting: (onPeerId?: (peerId: string) => void) => Promise<string>;
  onLink?: (link: string) => void;
  onCopied?: (copied: boolean) => void;
}) {
  let copiedDuringGesture = false;

  const hostPromise = options.startHosting((peerId) => {
    const shareLink = buildP2PShareLink(
      options.origin,
      options.pathname,
      peerId,
    );
    options.onLink?.(shareLink);
    copiedDuringGesture = true;

    void copyTextToClipboard(shareLink, options.clipboard).then((copied) => {
      options.onCopied?.(copied);
    });
  });

  const peerId = await hostPromise;

  if (!copiedDuringGesture) {
    const shareLink = buildP2PShareLink(
      options.origin,
      options.pathname,
      peerId,
    );
    options.onLink?.(shareLink);
    const copied = await copyTextToClipboard(shareLink, options.clipboard);
    options.onCopied?.(copied);
  }

  return peerId;
}
