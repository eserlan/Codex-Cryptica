import { readJson } from "./template-directory-shared";

const MAX_QUOTA_ATTEMPTS = 25;

export type QuotaReservation = "reserved" | "full";

interface QuotaBucket {
  get(key: string): Promise<any | null>;
  put(
    key: string,
    body: string,
    options: Record<string, unknown>,
  ): Promise<unknown | null>;
  delete(key: string): Promise<unknown>;
}

async function readCount(bucket: QuotaBucket, key: string) {
  const object = await bucket.get(key);
  let count = 0;
  if (object) {
    try {
      const stored = (await readJson(object)) as { count?: unknown };
      count = Number(stored.count) || 0;
    } catch {
      // An unreadable counter keeps the existing fail-open recovery path.
    }
  }
  return { object, count };
}

/**
 * Reserves one slot of a counter that may not exceed `limit`. Uses an R2
 * compare-and-set, so concurrent requests cannot both take the last slot.
 */
export async function reserveQuota(
  bucket: QuotaBucket,
  key: string,
  limit: number,
): Promise<QuotaReservation> {
  for (let attempt = 0; attempt < MAX_QUOTA_ATTEMPTS; attempt++) {
    const { object, count } = await readCount(bucket, key);
    if (count >= limit) return "full";

    const written = await bucket.put(
      key,
      JSON.stringify({ count: count + 1 }),
      {
        httpMetadata: { contentType: "application/json" },
        onlyIf: object?.etag
          ? { etagMatches: object.etag }
          : { etagDoesNotMatch: "*" },
      },
    );
    if (written !== null) return "reserved";
  }
  throw new Error("Could not reserve a quota slot.");
}

/**
 * Gives a slot back after a request that did not end in delivery, so the
 * user's retry is not counted against them. Never goes below zero.
 */
export async function releaseQuota(
  bucket: QuotaBucket,
  key: string,
): Promise<boolean> {
  for (let attempt = 0; attempt < MAX_QUOTA_ATTEMPTS; attempt++) {
    const { object, count } = await readCount(bucket, key);
    if (!object || count <= 0) return false;

    const written = await bucket.put(
      key,
      JSON.stringify({ count: count - 1 }),
      {
        httpMetadata: { contentType: "application/json" },
        onlyIf: { etagMatches: object.etag },
      },
    );
    if (written !== null) return true;
  }
  return false;
}
