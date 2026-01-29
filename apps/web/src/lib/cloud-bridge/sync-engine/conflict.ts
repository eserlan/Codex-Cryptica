export const SYNC_SKEW_MS = 5000;

export function resolveConflict(
  localTime: number,
  remoteTimeStr: string,
): "UPLOAD" | "DOWNLOAD" | "SKIP" {
  const remoteTime = new Date(remoteTimeStr).getTime();

  if (localTime > remoteTime + SYNC_SKEW_MS) {
    return "UPLOAD";
  } else if (remoteTime > localTime + SYNC_SKEW_MS) {
    return "DOWNLOAD";
  } else {
    return "SKIP";
  }
}
