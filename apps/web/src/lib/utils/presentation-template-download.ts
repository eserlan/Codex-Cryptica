import type { PresentationTemplate } from "schema";
import { exportPresentationTemplate } from "@codex/stat-sheet-engine";
import { downloadBlob } from "./download";

/** Download the portable, value-free template package using the shared browser handoff. */
export function downloadPresentationTemplate(
  template: PresentationTemplate,
): void {
  if (typeof document === "undefined") return;
  const pkg = exportPresentationTemplate(template);
  const blob = new Blob([JSON.stringify(pkg, null, 2)], {
    type: "application/json",
  });
  const filename = `${template.name.replace(/[^a-z0-9-]+/gi, "-").toLowerCase()}.presentation.json`;
  downloadBlob(blob, filename);
}
