import type { ReportInput, ReportSource } from "entity-report-engine";

export interface ReportRescopeResult {
  input: ReportInput | null;
  source: ReportSource;
  error?: string;
}

export interface ReportPanelRequest {
  input: ReportInput;
  source: ReportSource;
  defaultTitle: string;
  /** Canvas origin only: re-resolves the input for the other scope. */
  rescope?: (selection: "entire" | "selected") => ReportRescopeResult;
}

export class ReportPanelStore {
  request = $state<ReportPanelRequest | null>(null);

  open(request: ReportPanelRequest) {
    this.request = request;
  }

  close() {
    this.request = null;
  }
}

export const reportPanelStore = new ReportPanelStore();
