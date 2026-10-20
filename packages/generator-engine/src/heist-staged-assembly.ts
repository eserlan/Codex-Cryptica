import type { JsonObject } from "./staged-runtime";
import { canonicalOptionLabels, type ResolvedHeist } from "./public-heist";
import { text } from "./heist-staged-values";
import {
  formatCasing,
  formatSecurityRings,
  formatAlarmTrack,
  formatComplications,
  formatGetaway,
  formatFlashbacks,
} from "./heist-staged-formatters";

// fallow-ignore-next-line complexity
function extractDefaultComplication(complicationsRaw: unknown): string {
  if (typeof complicationsRaw === "string") {
    const match = complicationsRaw.match(/\(default\)\*\*:\s*([^\n]+)/i);
    if (match) return match[1].trim();
  }
  if (Array.isArray(complicationsRaw)) {
    for (const c of complicationsRaw) {
      if (typeof c === "string" && c.includes("(default)")) {
        const match = c.match(/\(default\)\*\*:\s*([^\n]+)/i);
        if (match) return match[1].trim();
        return c.replace(/^[-\s*]+/, "").trim();
      }
      if (c && typeof c === "object") {
        const r = c as Record<string, unknown>;
        if (String(r.label || "").includes("(default)")) {
          return String(r.detail || r.text || "").trim();
        }
      }
    }
  }
  return "";
}

export function formatQuickReference(
  stage3: JsonObject,
  stage1: JsonObject,
  stage2: JsonObject,
  resolved: ResolvedHeist,
): string {
  if (
    typeof stage3.quickReference === "string" &&
    text(stage3.quickReference)
  ) {
    return text(stage3.quickReference)
      .replace(/\s*\(default\)/gi, "")
      .trim();
  }
  const defaultComp =
    extractDefaultComplication(stage3.complications).replace(
      /\s*\(default\)/gi,
      "",
    ) || "Reinforcements seal off primary escape routes.";
  return [
    `- **Objective**: ${text(stage1.summary) || resolved.title}.`,
    `- **Primary obstacle**: Three security layers protecting ${resolved.objectiveProtects}.`,
    `- **Hidden factor**: ${text(stage2.hiddenFactor) || "Intel discrepancy inside the secured perimeter."}`,
    `- **Point of no return**: ${resolved.objectiveCompletion} begins the getaway phase.`,
    `- **Pressure**: ${resolved.pressureSummary}`,
    `- **Default complication**: ${defaultComp}`,
    `- **Escape problem**: The primary route becomes compromised once the alarm triggers.`,
  ].join("\n");
}

export function assembleHeist(
  stage1: JsonObject,
  stage2: JsonObject,
  stage3: JsonObject,
  resolved: ResolvedHeist,
): JsonObject {
  const score = text(stage1.score);
  const objective = text(stage1.objective);
  const casing = formatCasing(stage1.casing);

  const content = `### The Score\n${score}\n\n### ${resolved.objectiveHeading}\n${objective}\n\n### Casing the Target\n${casing}`;

  const quickRef = formatQuickReference(stage3, stage1, stage2, resolved);
  const hiddenFactor = text(stage2.hiddenFactor);
  const securityRings = formatSecurityRings(stage2, resolved);
  const alarmTrack = formatAlarmTrack(stage3.alarmTrack);
  const complications = formatComplications(stage3.complications);
  const moment = text(stage3.moment);
  const getaway = formatGetaway(stage3.getaway);
  const flashbacks = formatFlashbacks(stage3.flashbacks);

  const lore = `### GM Quick Reference\n${quickRef}\n\n### The Hidden Factor\n${hiddenFactor}\n\n### Security Rings\n${securityRings}\n\n### Alarm Track\n${alarmTrack}\n\n### Complications\n${complications}\n\n### ${resolved.momentHeading}\n${moment}\n\n### The Getaway\n${getaway}\n\n### Flashback Opportunities\n${flashbacks}`;

  return {
    title: text(stage1.title) || resolved.title,
    summary: text(stage1.summary) || resolved.title,
    content,
    lore,
    labels: ["heist", "heist-generator", ...canonicalOptionLabels(resolved)],
  };
}
