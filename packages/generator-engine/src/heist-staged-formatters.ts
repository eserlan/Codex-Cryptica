import type { JsonObject } from "./staged-runtime";
import type { ResolvedHeist } from "./public-heist";
import { text, arr, rec, detailText } from "./heist-staged-values";

export function formatCasing(casingRaw: unknown): string {
  if (!casingRaw) return "";
  if (typeof casingRaw === "string") {
    return casingRaw.trim();
  }
  if (Array.isArray(casingRaw)) {
    return casingRaw
      .map((item) => {
        if (typeof item === "string") {
          return formatBullet(item);
        }
        if (item && typeof item === "object") {
          const r = item as Record<string, unknown>;
          const label = String(r.label || r.title || "Detail")
            .replace(/\*\*/g, "")
            .trim();
          const detail = detailText(r);
          return `- **${label}**: ${detail}`;
        }
        return "";
      })
      .filter(Boolean)
      .join("\n");
  }
  return "";
}

export function getRingText(
  data: JsonObject,
  key: "perimeter" | "access" | "inner",
  innerLabel = "Inner",
): string {
  const rings = rec(data.rings);
  if (typeof rings[key] === "string" && text(rings[key])) {
    return text(rings[key]);
  }
  if (typeof data[key] === "string" && text(data[key])) {
    return text(data[key]);
  }
  if (key === "inner") {
    const directInner =
      rings[innerLabel] ??
      rings[innerLabel.toLowerCase()] ??
      data[innerLabel] ??
      data[innerLabel.toLowerCase()];
    if (typeof directInner === "string" && text(directInner)) {
      return text(directInner);
    }
  }
  const label = { perimeter: "Perimeter", access: "Access", inner: innerLabel }[
    key
  ];
  return extractCombinedRing(text(data.securityRings), label);
}

function extractCombinedRing(combined: string, searchLabel: string): string {
  if (combined) {
    const match = combined.match(
      new RegExp(
        `-\\s*\\*\\*${searchLabel}\\*\\*:\\s*([^\\n]+(?:\\n(?!-\\s*\\*\\*)[^\\n]+)*)`,
        "i",
      ),
    );
    if (match) return match[1].trim();
  }
  return "";
}

export function formatSecurityRings(
  stage2: JsonObject,
  resolved: ResolvedHeist,
): string {
  if (typeof stage2.securityRings === "string" && text(stage2.securityRings)) {
    return text(stage2.securityRings);
  }
  const perimeter = getRingText(stage2, "perimeter");
  const access = getRingText(stage2, "access");
  const inner = getRingText(stage2, "inner", resolved.innerRingLabel);

  return [
    `- **Perimeter**: ${perimeter}`,
    `- **Access**: ${access}`,
    `- **${resolved.innerRingLabel}**: ${inner}`,
  ].join("\n");
}

export function formatAlarmTrack(alarmTrackRaw: unknown): string {
  if (!alarmTrackRaw) return "";
  if (typeof alarmTrackRaw === "string") return alarmTrackRaw.trim();
  if (Array.isArray(alarmTrackRaw)) {
    const defaultLabels = [
      "Quiet",
      "Suspicion",
      "Alert",
      "Lockdown",
      "Lethal Response",
    ];
    return alarmTrackRaw
      .map((item, index) => {
        if (typeof item === "string") {
          return formatBullet(item);
        }
        const r = rec(item);
        const level = r.level !== undefined ? Number(r.level) : index;
        const label = String(
          r.label || defaultLabels[level] || `Level ${level}`,
        );
        const detail = detailText(r);
        return `- **${level} — ${label}**: ${detail}`;
      })
      .filter(Boolean)
      .join("\n");
  }
  return "";
}

function formatComplicationItem(
  item: unknown,
  index: number,
  state: { hasDefault: boolean },
): string {
  if (typeof item === "string") {
    return formatStringComplication(item, index, state);
  }
  const r = rec(item);
  let label = String(
    r.label || r.title || (index === 0 ? "Likely (default)" : "Alternative"),
  );
  if (!state.hasDefault && index === 0 && !label.includes("(default)")) {
    label = `${label} (default)`;
    state.hasDefault = true;
  }
  const detail = detailText(r);
  return `- **${label}**: ${detail}`;
}

export function formatComplications(complicationsRaw: unknown): string {
  if (!complicationsRaw) return "";
  if (typeof complicationsRaw === "string") {
    let raw = complicationsRaw.trim();
    if (!raw.includes("(default)")) {
      raw = raw.replace(/-\s*\*\*([^*]+)\*\*:/, "- **$1 (default)**:");
    }
    return raw;
  }
  if (Array.isArray(complicationsRaw)) {
    const state = {
      hasDefault: complicationsRaw.some((item) =>
        typeof item === "string"
          ? item.includes("(default)")
          : String((item as Record<string, unknown>).label || "").includes(
              "(default)",
            ),
      ),
    };
    return complicationsRaw
      .map((item, index) => formatComplicationItem(item, index, state))
      .filter(Boolean)
      .join("\n");
  }
  return "";
}

export function formatGetaway(getawayRaw: unknown): string {
  if (!getawayRaw) return "";
  if (typeof getawayRaw === "string") return getawayRaw.trim();
  if (typeof getawayRaw === "object" && !Array.isArray(getawayRaw)) {
    const r = getawayRaw as Record<string, unknown>;
    const lead = text(r.lead ?? r.status ?? "");
    const options = arr(r.options ?? r.routes)
      .map((opt) => {
        if (typeof opt === "string")
          return opt.startsWith("- ") ? opt : `- ${opt}`;
        const ro = rec(opt);
        return `- **${ro.label || "Route"}**: ${ro.detail || ro.text || ""}`;
      })
      .join("\n");
    const pursuit = text(r.pursuit) ? `**Pursuit**: ${text(r.pursuit)}` : "";
    return [lead, options, pursuit].filter(Boolean).join("\n");
  }
  return "";
}

export function formatFlashbacks(flashbacksRaw: unknown): string {
  if (!flashbacksRaw) return "";
  if (typeof flashbacksRaw === "string") {
    let trimmed = flashbacksRaw.trim();
    if (!trimmed.startsWith("Offer these;")) {
      trimmed = `Offer these; never assume the players used them.\n${trimmed}`;
    }
    return trimmed;
  }
  if (Array.isArray(flashbacksRaw)) {
    const lines = flashbacksRaw
      .map((item) => {
        const s = typeof item === "string" ? item.trim() : String(item).trim();
        return formatBullet(s);
      })
      .filter(Boolean);
    return `Offer these; never assume the players used them.\n${lines.join("\n")}`;
  }
  return "";
}

function formatBullet(value: string): string {
  const trimmed = value.trim();
  return trimmed.startsWith("- ") ? trimmed : `- ${trimmed}`;
}

function formatStringComplication(
  item: string,
  index: number,
  state: { hasDefault: boolean },
): string {
  let line = formatBullet(item);
  if (!state.hasDefault && index === 0) {
    line = line.replace(/-\s*\*\*([^*]+)\*\*:/, "- **$1 (default)**:");
    state.hasDefault = true;
  }
  return line;
}
