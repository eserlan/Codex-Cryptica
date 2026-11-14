import { json } from "./cloud-backup-http";
import {
  type CloudBackupEnv,
  type SharingRecord,
  getSharingDevicesKey,
  writeManifest,
} from "./cloud-backup-storage";
import {
  authorizeOwner,
  generateOwnerCode,
  hashOwnerCode,
} from "./cloud-backup-auth";

const SHARING_ATTEMPTS = 3;

type Authorized = Exclude<
  Awaited<ReturnType<typeof authorizeOwner>>,
  { response: Response }
>;

/**
 * Applies one owner-only change to the sharing record. Conditional on the
 * manifest just read, so a commit that lands in between is never rolled back;
 * on a lost race read again and retry.
 */
async function changeSharing(
  request: Request,
  env: CloudBackupEnv,
  backupId: string,
  change: (auth: Authorized) => Promise<
    | { response: Response }
    | {
        sharing: SharingRecord | undefined;
        respond: () => Response;
        afterWrite?: () => Promise<void>;
      }
  >,
): Promise<Response> {
  for (let attempt = 0; attempt < SHARING_ATTEMPTS; attempt++) {
    const auth = await authorizeOwner(request, env, backupId);
    if ("response" in auth) return auth.response;
    const result = await change(auth);
    if ("response" in result) return result.response;
    const written = await writeManifest(
      env,
      backupId,
      auth.manifest,
      auth.ownerCodeHash,
      auth.objects,
      auth.etag,
      result.sharing,
    );
    if (written) {
      await result.afterWrite?.();
      return result.respond();
    }
  }
  return json(
    request,
    { error: { message: "The backup changed. Try again." } },
    409,
  );
}

function tokenResponse(
  request: Request,
  editorToken: string,
  sharing: SharingRecord,
): Response {
  return json(request, {
    editorToken,
    linkVersion: sharing.linkVersion,
    enabledAt: sharing.enabledAt,
  });
}

/** POST /api/cloud-backup/{backupId}/sharing — turns the editor link on. */
export function handleCloudBackupSharingOn(
  request: Request,
  env: CloudBackupEnv,
  backupId: string,
): Promise<Response> {
  return changeSharing(request, env, backupId, async (auth) => {
    if (auth.sharing) {
      return {
        response: json(
          request,
          { error: { message: "Sharing is already on." } },
          409,
        ),
      };
    }
    const editorToken = generateOwnerCode();
    const sharing: SharingRecord = {
      editorTokenHash: await hashOwnerCode(editorToken),
      linkVersion: 1,
      enabledAt: new Date().toISOString(),
    };
    return {
      sharing,
      respond: () => tokenResponse(request, editorToken, sharing),
    };
  });
}

/** DELETE /api/cloud-backup/{backupId}/sharing — turns it off; safe to repeat. */
export async function handleCloudBackupSharingOff(
  request: Request,
  env: CloudBackupEnv,
  backupId: string,
): Promise<Response> {
  return changeSharing(request, env, backupId, async (auth) => {
    const sharing = auth.sharing;
    return {
      sharing: undefined,
      afterWrite: sharing
        ? () => env.BUCKET.delete(getSharingDevicesKey(backupId, sharing))
        : undefined,
      respond: () => json(request, { sharing: false }),
    };
  });
}

/** POST /api/cloud-backup/{backupId}/sharing/replace-link — a new link, old one dies. */
export function handleCloudBackupSharingReplace(
  request: Request,
  env: CloudBackupEnv,
  backupId: string,
): Promise<Response> {
  return changeSharing(request, env, backupId, async (auth) => {
    if (!auth.sharing) {
      return {
        response: json(request, { error: { message: "Sharing is off." } }, 409),
      };
    }
    const editorToken = generateOwnerCode();
    const sharing: SharingRecord = {
      editorTokenHash: await hashOwnerCode(editorToken),
      linkVersion: auth.sharing.linkVersion + 1,
      enabledAt: auth.sharing.enabledAt,
    };
    return {
      sharing,
      respond: () => tokenResponse(request, editorToken, sharing),
    };
  });
}
