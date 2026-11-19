import type { LocalCloudBackupRecord } from "schema";
import type { CloudBackupRuntime } from "./runtime";
import { getLocalCloudBackupRecord as readRecord } from "./backup-records";
import { cloudBackupHeaders } from "./request-headers";
import type { CloudBackupOutcome } from "./types";

export interface CloudBackupShareResult {
  /** Shown to the owner once; it carries the editor token and is never kept. */
  link: string;
  linkVersion: number;
  enabledAt: string;
}

type Failure = Extract<CloudBackupOutcome<never>, { ok: false }>;

const ALREADY_ON = "Sharing is already on.";
const SHARING_OFF = "Sharing is off.";

/** The token travels only in the fragment, which browsers never send onward. */
export function formatShareLink(
  origin: string,
  backupId: string,
  editorToken: string,
): string {
  return `${origin}/join#${backupId}:${editorToken}`;
}

/**
 * Reads the part of a group link after `#`. Returns null for anything that is
 * not exactly `<backupId>:<editorToken>`; nothing is trimmed or repaired.
 */
export function parseShareLinkFragment(
  fragment: string,
): { backupId: string; editorToken: string } | null {
  const text = fragment.startsWith("#") ? fragment.slice(1) : fragment;
  const parts = text.split(":");
  if (parts.length !== 2) return null;
  const [backupId, editorToken] = parts;
  if (!/^[0-9a-fA-F-]{8,}$/.test(backupId)) return null;
  if (!/^[0-9a-fA-F]{16,}$/.test(editorToken)) return null;
  return { backupId, editorToken: editorToken.toLowerCase() };
}

function nowIso(runtime: CloudBackupRuntime): string {
  return (runtime.now?.() ?? new Date()).toISOString();
}

async function failureMessage(response: {
  status: number;
  json: () => Promise<unknown>;
}): Promise<string> {
  const body = (await response.json().catch(() => null)) as {
    error?: { message?: unknown };
  } | null;
  const message = body?.error?.message;
  return typeof message === "string" && message
    ? message
    : `Request failed (${response.status})`;
}

async function send(
  runtime: CloudBackupRuntime,
  vaultId: string,
  method: "POST" | "DELETE",
  suffix: string,
): Promise<
  | {
      record: LocalCloudBackupRecord;
      response: Awaited<ReturnType<CloudBackupRuntime["fetch"]>>;
    }
  | Failure
> {
  const record = await readRecord(runtime, vaultId);
  if (!record?.enabled) {
    return {
      ok: false,
      error: "Turn Cloud Backup on before sharing this vault.",
    };
  }
  try {
    const response = await runtime.fetch(
      `${runtime.baseUrl}/api/cloud-backup/${record.backupId}/sharing${suffix}`,
      { method, headers: cloudBackupHeaders(runtime, record) },
    );
    return { record, response };
  } catch {
    return { ok: false, error: "Could not reach Codex Cryptica Cloud." };
  }
}

async function updateCurrentRecord(
  runtime: CloudBackupRuntime,
  vaultId: string,
  update: (record: LocalCloudBackupRecord) => LocalCloudBackupRecord,
): Promise<void> {
  const current = await readRecord(runtime, vaultId);
  if (current) await runtime.storage.write(vaultId, update(current));
}

// fallow-ignore-next-line complexity — response validation and both repair paths are covered below.
async function shareOutcome(
  runtime: CloudBackupRuntime,
  vaultId: string,
  origin: string,
  suffix: string,
): Promise<CloudBackupOutcome<CloudBackupShareResult>> {
  const sent = await send(runtime, vaultId, "POST", suffix);
  if ("ok" in sent) return sent;
  const { record, response } = sent;

  if (!response.ok) {
    const error = await failureMessage(response);
    if (response.status === 409 && suffix === "" && error === ALREADY_ON) {
      await updateCurrentRecord(runtime, vaultId, (current) => ({
        ...current,
        sharing: current.sharing ?? {
          linkVersion: 1,
          enabledAt: nowIso(runtime),
        },
      }));
      return {
        ok: false,
        status: 409,
        error: "Sharing is already on. Replace the link to get a new one.",
      };
    }
    if (response.status === 409 && suffix !== "" && error === SHARING_OFF) {
      await updateCurrentRecord(runtime, vaultId, (current) => {
        const { sharing: _off, ...rest } = current;
        return rest;
      });
      return { ok: false, status: 409, error: "Sharing is off." };
    }
    return { ok: false, status: response.status, error };
  }

  const body = (await response.json().catch(() => null)) as {
    editorToken?: unknown;
    linkVersion?: unknown;
    enabledAt?: unknown;
  } | null;
  if (
    typeof body?.editorToken !== "string" ||
    !body.editorToken ||
    !Number.isInteger(body.linkVersion) ||
    (body.linkVersion as number) < 1 ||
    typeof body.enabledAt !== "string"
  ) {
    return {
      ok: false,
      error: "The backup service returned an unreadable response.",
    };
  }

  const linkVersion = body.linkVersion as number;
  const enabledAt = body.enabledAt as string;
  await updateCurrentRecord(runtime, vaultId, (current) => ({
    ...current,
    sharing: { linkVersion, enabledAt },
  }));
  return {
    ok: true,
    value: {
      link: formatShareLink(origin, record.backupId, body.editorToken),
      linkVersion,
      enabledAt,
    },
  };
}

/** Turns group sharing on. Only call after the sharing consent screen. */
export function enableCloudBackupSharing(
  runtime: CloudBackupRuntime,
  vaultId: string,
  origin: string,
): Promise<CloudBackupOutcome<CloudBackupShareResult>> {
  return shareOutcome(runtime, vaultId, origin, "");
}

/** Replaces the link; the old one stops working at once. */
export function replaceCloudBackupSharingLink(
  runtime: CloudBackupRuntime,
  vaultId: string,
  origin: string,
): Promise<CloudBackupOutcome<CloudBackupShareResult>> {
  return shareOutcome(runtime, vaultId, origin, "/replace-link");
}

/** Turns sharing off. The backup itself is untouched. */
export async function disableCloudBackupSharing(
  runtime: CloudBackupRuntime,
  vaultId: string,
): Promise<CloudBackupOutcome<null>> {
  const sent = await send(runtime, vaultId, "DELETE", "");
  if ("ok" in sent) return sent;
  const { response } = sent;
  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      error: await failureMessage(response),
    };
  }
  await updateCurrentRecord(runtime, vaultId, (current) => {
    const { sharing: _off, ...rest } = current;
    return rest;
  });
  return { ok: true, value: null };
}
