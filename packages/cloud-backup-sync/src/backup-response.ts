import type { CloudBackupRuntime } from "./runtime";

async function errorFrom(response: {
  status: number;
  json: () => Promise<unknown>;
}): Promise<string> {
  try {
    const body = (await response.json()) as any;
    return body?.error?.message || `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
}

/** Keeps HTTP failures consistent across backup operations. */
export async function responseFailure(
  response: Awaited<ReturnType<CloudBackupRuntime["fetch"]>>,
): Promise<{ ok: false; error: string; status: number }> {
  return {
    ok: false,
    error: await errorFrom(response),
    status: response.status,
  };
}
