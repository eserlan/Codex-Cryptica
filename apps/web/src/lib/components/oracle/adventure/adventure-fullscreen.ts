export interface FullscreenTarget {
  requestFullscreen?: () => Promise<void>;
}

export interface FullscreenDocument {
  fullscreenElement: Element | null;
  exitFullscreen?: () => Promise<void>;
}

/**
 * Enter browser fullscreen without letting unsupported browsers or a denied
 * request interrupt the adventure. The caller decides how to inform the user.
 */
export async function requestAdventureFullscreen(
  target: FullscreenTarget | null | undefined,
): Promise<boolean> {
  if (!target?.requestFullscreen) return false;

  try {
    await target.requestFullscreen();
    return true;
  } catch {
    return false;
  }
}

/** Exit native fullscreen before returning to the ordinary adventure layout. */
export async function exitAdventureFullscreen(
  documentRef: FullscreenDocument,
): Promise<void> {
  if (!documentRef.fullscreenElement || !documentRef.exitFullscreen) return;

  try {
    await documentRef.exitFullscreen();
  } catch {
    // The browser may already be leaving fullscreen through Escape.
  }
}
