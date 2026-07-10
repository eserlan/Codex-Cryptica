import {
  PublishedNoticeSchema,
  type PublishedNotice,
} from "../../../../packages/schema/src/publishing";
import { getCorsHeaders } from "./publish";
import { authorizeListingMutation } from "./directory";
import { readSuspensionMarker } from "./suspension";

export function getNoticeObjectKey(publishId: string): string {
  return `published/${publishId}/notice.json`;
}

export async function readNoticeSidecar(
  env: any,
  publishId: string,
): Promise<PublishedNotice | null> {
  const object = await env.BUCKET?.get(getNoticeObjectKey(publishId));
  if (!object) return null;
  const text =
    typeof object.text === "function"
      ? await object.text()
      : new TextDecoder().decode(object.body);
  try {
    const raw = JSON.parse(text);
    const parsed = PublishedNoticeSchema.safeParse(raw);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function upsertNoticeSidecar(
  env: any,
  publishId: string,
  data: {
    fanContent?: boolean;
    fanContentDisclaimer?: string;
    rightsAcknowledgedAt?: string;
    updatedAt: string;
  },
): Promise<PublishedNotice> {
  const existing = await readNoticeSidecar(env, publishId);
  const notice = PublishedNoticeSchema.parse({
    schemaVersion: 1,
    publishId,
    fanContent: data.fanContent ?? existing?.fanContent ?? false,
    fanContentDisclaimer:
      data.fanContentDisclaimer !== undefined
        ? data.fanContentDisclaimer || undefined
        : existing?.fanContentDisclaimer,
    rightsAcknowledgedAt:
      data.rightsAcknowledgedAt ??
      existing?.rightsAcknowledgedAt ??
      data.updatedAt,
    updatedAt: data.updatedAt,
  });

  await env.BUCKET?.put(getNoticeObjectKey(publishId), JSON.stringify(notice), {
    contentType: "application/json",
  });

  return notice;
}

export async function handleGetPublishedNotice(
  request: Request,
  env: any,
  publishId: string,
): Promise<Response> {
  const cors = getCorsHeaders(request.headers, env);
  if (!env.BUCKET) {
    return new Response("Internal Server Error", {
      status: 500,
      headers: cors,
    });
  }

  // Check if snapshot bundle exists
  const bundleHead = await env.BUCKET.head(
    `published/${publishId}/bundle.json`,
  );
  if (!bundleHead) {
    return new Response(
      JSON.stringify({ error: { message: "Snapshot not found" } }),
      {
        status: 404,
        headers: { ...cors, "Content-Type": "application/json" },
      },
    );
  }

  const suspension = await readSuspensionMarker(env, publishId);
  const isSuspended = !!suspension;

  const existing = await readNoticeSidecar(env, publishId);
  if (existing) {
    // Public projection: rightsAcknowledgedAt is author-facing audit data and
    // must not be exposed on this unauthenticated endpoint.
    return new Response(
      JSON.stringify({
        schemaVersion: existing.schemaVersion,
        publishId: existing.publishId,
        fanContent: existing.fanContent,
        fanContentDisclaimer: existing.fanContentDisclaimer,
        updatedAt: existing.updatedAt,
        suspended: isSuspended ? true : undefined,
      }),
      {
        status: 200,
        headers: {
          ...cors,
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=15",
        },
      },
    );
  }

  // Default notice when no sidecar yet exists
  const defaultNotice: PublishedNotice = {
    schemaVersion: 1,
    publishId,
    fanContent: false,
    updatedAt: bundleHead.uploaded?.toISOString() ?? new Date(0).toISOString(),
    suspended: isSuspended ? true : undefined,
  };

  return new Response(JSON.stringify(defaultNotice), {
    status: 200,
    headers: {
      ...cors,
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=15",
    },
  });
}

export async function handlePutPublishedNotice(
  request: Request,
  env: any,
  publishId: string,
): Promise<Response> {
  const cors = getCorsHeaders(request.headers, env);
  if (!env.BUCKET) {
    return new Response("Internal Server Error", {
      status: 500,
      headers: cors,
    });
  }

  const authError = await authorizeListingMutation(request, env, publishId);
  if (authError) return authError;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: { message: "Invalid JSON payload" } }),
      { status: 400, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }

  if (body.rightsAcknowledged !== true) {
    return new Response(
      JSON.stringify({
        error: {
          message:
            "Author must explicitly acknowledge publishing rights (rightsAcknowledged: true)",
        },
      }),
      { status: 400, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }

  const now = new Date().toISOString();
  const existing = await readNoticeSidecar(env, publishId);

  const notice = await upsertNoticeSidecar(env, publishId, {
    fanContent: Boolean(body.fanContent),
    fanContentDisclaimer:
      typeof body.fanContentDisclaimer === "string"
        ? body.fanContentDisclaimer.trim() || undefined
        : undefined,
    rightsAcknowledgedAt: existing?.rightsAcknowledgedAt ?? now,
    updatedAt: now,
  });

  return new Response(JSON.stringify(notice), {
    status: 200,
    headers: {
      ...cors,
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
    },
  });
}
