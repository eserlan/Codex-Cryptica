export interface CopyrightReportSubmission {
  vaultUrl: string;
  reporterContact: string;
  rightsHolder?: string;
  material?: string;
  details?: string;
  turnstileToken: string;
}

export interface CopyrightReportReceipt {
  reportId: string;
  receivedAt: string;
}

export interface CopyrightReportServiceDeps {
  fetch?: typeof fetch;
  baseUrl?: string;
}

export class CopyrightReportService {
  constructor(private deps: CopyrightReportServiceDeps = {}) {}

  private get fetcher() {
    return this.deps.fetch ?? fetch;
  }

  get baseUrl() {
    return (
      this.deps.baseUrl ??
      ((typeof import.meta !== "undefined" &&
        import.meta.env?.VITE_ORACLE_PROXY_URL) ||
        (typeof import.meta !== "undefined" &&
        import.meta.env?.DEV &&
        !import.meta.env?.VITEST
          ? "http://localhost:8787"
          : "https://oracle-proxy.espen-erlandsen.workers.dev"))
    );
  }

  async submitReport(
    payload: CopyrightReportSubmission,
  ): Promise<CopyrightReportReceipt> {
    const response = await this.fetcher(
      `${this.baseUrl}/api/reports/copyright`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      },
    );

    if (!response.ok) {
      let errorMessage = "Failed to submit copyright report";
      try {
        const data = (await response.json()) as {
          error?: { message?: string };
        };
        if (data?.error?.message) {
          errorMessage = data.error.message;
        }
      } catch {
        // Ignore json parse failure on error
      }
      throw new Error(errorMessage);
    }

    return (await response.json()) as CopyrightReportReceipt;
  }
}

export const copyrightReportService = new CopyrightReportService();
