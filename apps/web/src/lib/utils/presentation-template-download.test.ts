/** @vitest-environment jsdom */
import { describe, expect, it, vi } from "vitest";
import type { PresentationTemplate } from "schema";
import { downloadBlob } from "./download";
import { downloadPresentationTemplate } from "./presentation-template-download";
vi.mock("./download", () => ({ downloadBlob: vi.fn() }));

const template: PresentationTemplate = {
  id: "t",
  schemaTemplateId: "s",
  name: "My Layout!",
  source: "[hp]",
  vaultId: "private-vault",
  formatVersion: 1,
  isBuiltIn: false,
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
};

describe("presentation template download", () => {
  it("downloads the portable package with a normalized filename", async () => {
    downloadPresentationTemplate(template);
    const [blob, filename] = vi.mocked(downloadBlob).mock.calls[0];
    expect(filename).toBe("my-layout-.presentation.json");
    expect(blob.type).toBe("application/json");
    const content = await blob.text();
    expect(content).toContain('"source": "[hp]"');
    expect(content).not.toContain("private-vault");
  });

  it("skips download outside the browser", () => {
    vi.stubGlobal("document", undefined);
    try {
      downloadPresentationTemplate(template);
      expect(downloadBlob).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
