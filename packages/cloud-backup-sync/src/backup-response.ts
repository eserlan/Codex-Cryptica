import type { CloudBackupRuntime } from "./runtime";

async function errorFrom(response: {
  status: number;
  json: () => Promise<unknown>;
}): Promise<{ message: string; code?: string }> {
  try {
    const body = (await response.json()) as any;
    const code = body?.error?.code;
    return {
      message: body?.error?.message || `Request failed (${response.status})`,
      ...(typeof code === "string" ? { code } : {}),
    };
  } catch {
    return { message: `Request failed (${response.status})` };
  }
}

/** True for the worker's "this shared vault has too many devices" answer. */
export function isDeviceLimit(failure: {
  status?: number;
  code?: string;
}): boolean {
  return failure.status === 403 && failure.code === "device_limit";
}

/**
 * Keeps HTTP failures consistent across backup operations. For an editor, a
 * 404 means the group link is gone (replaced, sharing off or backup deleted),
 * so it is reported as `linkGone` rather than as a missing route.
 */
export async function responseFailure(
  response: Awaited<ReturnType<CloudBackupRuntime["fetch"]>>,
  credentials?: { role?: "owner" | "editor" },
): Promise<{
  ok: false;
  error: string;
  status: number;
  code?: string;
  linkGone?: true;
}> {
  const { message, code } = await errorFrom(response);
  return {
    ok: false,
    error: message,
    status: response.status,
    ...(code ? { code } : {}),
    ...(credentials?.role === "editor" && response.status === 404
      ? { linkGone: true as const }
      : {}),
  };
}
