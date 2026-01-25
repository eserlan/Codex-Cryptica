export function resolveConflict(localTime: number, remoteTimeStr: string): 'UPLOAD' | 'DOWNLOAD' | 'SKIP' {
    const remoteTime = new Date(remoteTimeStr).getTime();
    const SKEW_MS = 2000;

    if (localTime > remoteTime + SKEW_MS) {
        return 'UPLOAD';
    } else if (remoteTime > localTime + SKEW_MS) {
        return 'DOWNLOAD';
    } else {
        return 'SKIP';
    }
}
