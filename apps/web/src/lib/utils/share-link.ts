import { normalizeGuestView } from "./guest-session";

export function buildP2PShareLink(
  origin: string,
  pathname: string,
  peerId: string,
  view?: string | null,
) {
  const url = new URL(origin + pathname);
  url.searchParams.set("shareId", `p2p-${peerId}`);
  const normalizedView = normalizeGuestView(view);
  if (normalizedView) {
    url.searchParams.set("view", normalizedView);
  }
  return url.toString();
}

export async function copyTextToClipboard(
  text: string,
  clipboard?: Pick<Clipboard, "writeText">,
  documentRef: Document | undefined = typeof document === "undefined"
    ? undefined
    : document,
) {
  try {
    if (clipboard?.writeText) {
      await clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    console.warn("[share-link] Clipboard copy failed", err);
  }

  if (!documentRef?.body || typeof documentRef.execCommand !== "function") {
    return false;
  }

  const textArea = documentRef.createElement("textarea");
  textArea.value = text;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "fixed";
  textArea.style.opacity = "0";
  documentRef.body.append(textArea);
  textArea.select();

  try {
    return documentRef.execCommand("copy");
  } finally {
    textArea.remove();
  }
}

export async function startShareSession(options: {
  origin: string;
  pathname: string;
  view?: string | null;
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
      options.view,
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
      options.view,
    );
    options.onLink?.(shareLink);
    const copied = await copyTextToClipboard(shareLink, options.clipboard);
    options.onCopied?.(copied);
  }

  return peerId;
}
