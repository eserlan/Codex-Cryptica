import { describe, expect, it, vi } from "vitest";
import {
  getTemplateListingKey,
  handleReportTemplateListing,
} from "../template-directory";
import { Bucket } from "./r2-memory-bucket";

const LISTING_ID = "listing-1";

async function seedListing(bucket: Bucket) {
  await bucket.put(
    getTemplateListingKey(LISTING_ID),
    JSON.stringify({
      schemaVersion: 1,
      listingId: LISTING_ID,
      title: "Test Template",
      description: "A test template",
      system: "Test System",
      packageVersion: 1,
      listingCreatedAt: "2026-01-01T00:00:00.000Z",
      listingUpdatedAt: "2026-01-01T00:00:00.000Z",
      labels: [],
    }),
  );
}

function reportRequest(body: unknown) {
  return new Request("https://oracle.test/api/template-directory/report", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("handleReportTemplateListing", () => {
  it("uses injected ID and clock when saving a report", async () => {
    const bucket = new Bucket();
    await seedListing(bucket);

    const response = await handleReportTemplateListing(
      reportRequest({ reason: "Incorrect attribution", details: "Page 2" }),
      { BUCKET: bucket },
      LISTING_ID,
      {
        idGenerator: { uuid: () => "fixed-report-id" },
        clock: { now: () => 150_000 },
      },
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ success: true });
    const saved = await bucket.get(
      "moderation/template-reports/fixed-report-id.json",
    );
    expect(saved).not.toBeNull();
    expect(JSON.parse(await saved!.text())).toEqual({
      schemaVersion: 1,
      reportId: "fixed-report-id",
      listingId: LISTING_ID,
      reason: "Incorrect attribution",
      details: "Page 2",
      receivedAt: "1970-01-01T00:02:30.000Z",
    });
  });

  it("rejects a blank reason without generating or saving a report", async () => {
    const bucket = new Bucket();
    await seedListing(bucket);
    const uuid = vi.fn(() => "unused-report-id");
    const now = vi.fn(() => 150_000);

    const response = await handleReportTemplateListing(
      reportRequest({ reason: "   " }),
      { BUCKET: bucket },
      LISTING_ID,
      { idGenerator: { uuid }, clock: { now } },
    );

    expect(response.status).toBe(400);
    expect(uuid).not.toHaveBeenCalled();
    expect(now).not.toHaveBeenCalled();
    expect(
      bucket.store.has("moderation/template-reports/unused-report-id.json"),
    ).toBe(false);
  });
});
