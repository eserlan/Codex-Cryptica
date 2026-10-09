import type { EntityTemplateListing } from "schema";
import { handleTemplateDirectoryRoutes } from "../template-directory-routes";
import { upsertEntityIndexEntry } from "../template-directory-index";
import {
  getTemplateListingKey,
  getTemplatePackageKey,
  hashOwnerToken,
} from "../template-directory-shared";
import { getSuspensionMarkerKey } from "../suspension";
import { Bucket } from "./r2-memory-bucket";

export const BASE = "https://proxy.test";

export interface SeedOptions {
  id: string;
  title?: string;
  description?: string;
  entityType?: string;
  labels?: string[];
  status?: "active" | "unpublished";
  updated?: string;
  markdown?: string;
  ownerToken?: string;
  ownerDisplayName?: string;
  suspended?: boolean;
  /** Skip the summary index entry (simulates a stale or rebuilt index). */
  noIndex?: boolean;
}

export async function seedEntityListing(bucket: Bucket, o: SeedOptions) {
  const updated = o.updated ?? "2026-03-01T00:00:00.000Z";
  const listing: EntityTemplateListing = {
    schemaVersion: 1,
    templateKind: "entity",
    listingId: o.id,
    title: o.title ?? `Template ${o.id}`,
    description: o.description ?? "A useful starting note.",
    entityType: o.entityType ?? "location",
    labels: o.labels ?? ["Fantasy"],
    ...(o.ownerDisplayName ? { ownerDisplayName: o.ownerDisplayName } : {}),
    packageVersion: 1,
    status: o.status ?? "active",
    listingCreatedAt: "2026-01-01T00:00:00.000Z",
    listingUpdatedAt: updated,
  };
  await bucket.put(getTemplateListingKey(o.id), JSON.stringify(listing), {
    customMetadata: {
      ownerTokenHash: await hashOwnerToken(o.ownerToken ?? `token-${o.id}`),
    },
  });
  await bucket.put(
    getTemplatePackageKey(o.id),
    JSON.stringify({
      kind: "entity-template",
      formatVersion: 1,
      template: {
        name: listing.title,
        entityType: listing.entityType,
        markdown: o.markdown ?? "## Notes\n\nWrite here.\n",
      },
    }),
  );
  if (o.suspended) {
    await bucket.put(
      getSuspensionMarkerKey(o.id),
      JSON.stringify({
        schemaVersion: 1,
        publishId: o.id,
        mode: "delist",
        createdAt: "2026-03-02T00:00:00.000Z",
      }),
    );
  } else if (!o.noIndex) {
    await upsertEntityIndexEntry({ BUCKET: bucket }, listing);
  }
  return listing;
}

export function makeEnv(
  bucket = new Bucket(),
  extra: Record<string, unknown> = {},
) {
  return {
    BUCKET: bucket,
    TEMPLATE_ADMIN_TOKEN: "admin-secret",
    ...extra,
  } as any;
}

export async function call(
  env: any,
  method: string,
  path: string,
  init: {
    body?: unknown;
    token?: string;
    headers?: Record<string, string>;
  } = {},
) {
  const headers: Record<string, string> = { ...(init.headers ?? {}) };
  if (init.token) headers.Authorization = `Bearer ${init.token}`;
  if (init.body !== undefined) headers["Content-Type"] = "application/json";
  const request = new Request(`${BASE}${path}`, {
    method,
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const response = await handleTemplateDirectoryRoutes(
    request,
    env,
    path.split("?")[0],
  );
  if (!response) throw new Error(`Unrouted: ${method} ${path}`);
  return response;
}
