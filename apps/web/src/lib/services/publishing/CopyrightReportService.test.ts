import { describe, expect, it, vi } from "vitest";
import { CopyrightReportService } from "./CopyrightReportService";

describe("CopyrightReportService", () => {
  it("should submit a report payload to POST /api/reports/copyright and return receipt", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        reportId: "rep-123-abc",
        receivedAt: "2026-07-10T12:00:00.000Z",
      }),
    });

    const service = new CopyrightReportService({
      fetch: fetchMock as unknown as typeof fetch,
      baseUrl: "https://mock.worker.dev",
    });

    const receipt = await service.submitReport({
      vaultUrl: "https://codexcryptica.com/guest/abc123",
      reporterContact: "reporter@example.com",
      rightsHolder: "Acme Corp",
      material: "Copyrighted book",
      details: "Copied exactly",
      turnstileToken: "token-123",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://mock.worker.dev/api/reports/copyright",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          vaultUrl: "https://codexcryptica.com/guest/abc123",
          reporterContact: "reporter@example.com",
          rightsHolder: "Acme Corp",
          material: "Copyrighted book",
          details: "Copied exactly",
          turnstileToken: "token-123",
        }),
      },
    );
    expect(receipt.reportId).toBe("rep-123-abc");
    expect(receipt.receivedAt).toBe("2026-07-10T12:00:00.000Z");
  });

  it("should throw an error with server message when submission fails", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        error: { message: "Required fields missing: reporterContact" },
      }),
    });

    const service = new CopyrightReportService({
      fetch: fetchMock as unknown as typeof fetch,
      baseUrl: "https://mock.worker.dev",
    });

    await expect(
      service.submitReport({
        vaultUrl: "https://codexcryptica.com/guest/abc123",
        reporterContact: "",
        turnstileToken: "token-123",
      }),
    ).rejects.toThrow("Required fields missing: reporterContact");
  });
});
