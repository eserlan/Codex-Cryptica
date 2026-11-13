import {
  type CloudBackupEnv,
  type SharingRecord,
  getSharingDevicesKey,
} from "./cloud-backup-storage";
import { json } from "./cloud-backup-http";

export const CLOUD_BACKUP_SHARING_DEVICE_CAP = 10;
export const CLOUD_BACKUP_SHARING_DEVICE_WINDOW_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;
const DEVICE_ID = /^[A-Za-z0-9_-]{8,128}$/;
const RECORD_ATTEMPTS = 3;

interface DeviceRecord {
  linkVersion: number;
  enabledAt: string;
  devices: Record<string, string>;
}

/**
 * Checks an editor request's device against the cap. Returns the response to
 * send instead, or null when the device is allowed. The record lives in its own
 * object so bookkeeping never changes the manifest's etag.
 */
export async function checkEditorDevice(
  request: Request,
  env: CloudBackupEnv,
  backupId: string,
  sharing: SharingRecord,
): Promise<Response | null> {
  const deviceId = request.headers.get("X-Codex-Device-Id") ?? "";
  if (!DEVICE_ID.test(deviceId)) {
    return json(
      request,
      {
        error: {
          code: "device_id_required",
          message:
            "This device could not be identified. Reload the app and try again.",
        },
      },
      400,
    );
  }

  const key = getSharingDevicesKey(backupId);
  const now = Date.now();
  for (let attempt = 0; attempt < RECORD_ATTEMPTS; attempt++) {
    const object = await env.BUCKET.get(key);
    const devices = activeDevices(await readRecord(object), sharing, now);
    const lastSeen = devices[deviceId];
    if (lastSeen !== undefined && now - Date.parse(lastSeen) <= DAY_MS) {
      return null;
    }
    if (
      lastSeen === undefined &&
      Object.keys(devices).length >= CLOUD_BACKUP_SHARING_DEVICE_CAP
    ) {
      return json(
        request,
        {
          error: {
            code: "device_limit",
            message:
              "This shared vault already has the most devices it allows. Ask the owner to replace the link.",
          },
        },
        403,
      );
    }
    const record: DeviceRecord = {
      linkVersion: sharing.linkVersion,
      enabledAt: sharing.enabledAt,
      devices: { ...devices, [deviceId]: new Date(now).toISOString() },
    };
    const written = await env.BUCKET.put(key, JSON.stringify(record), {
      httpMetadata: { contentType: "application/json" },
      onlyIf: object ? { etagMatches: object.etag } : { etagDoesNotMatch: "*" },
    });
    if (written !== null) return null;
  }
  return json(
    request,
    { error: { message: "The backup changed. Try again." } },
    409,
  );
}

async function readRecord(object: any): Promise<DeviceRecord | null> {
  if (!object) return null;
  try {
    const text =
      typeof object.text === "function"
        ? await object.text()
        : new TextDecoder().decode(object.body);
    return JSON.parse(text) as DeviceRecord;
  } catch {
    return null;
  }
}

/** Devices seen inside the window, or none when the record is for another link. */
function activeDevices(
  record: DeviceRecord | null,
  sharing: SharingRecord,
  now: number,
): Record<string, string> {
  if (
    !record ||
    record.linkVersion !== sharing.linkVersion ||
    record.enabledAt !== sharing.enabledAt ||
    !record.devices
  ) {
    return {};
  }
  const cutoff = now - CLOUD_BACKUP_SHARING_DEVICE_WINDOW_DAYS * DAY_MS;
  return Object.fromEntries(
    Object.entries(record.devices).filter(
      ([, seen]) => Date.parse(seen) >= cutoff,
    ),
  );
}
