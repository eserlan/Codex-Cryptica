export type ConnectionStance = "ally" | "friend" | "enemy" | "neutral";

export function getConnectionStance(
  type: string | null | undefined,
): ConnectionStance {
  const norm = (type ?? "").trim().toLowerCase();
  switch (norm) {
    case "enemy":
    case "fiende":
    case "fiendskap":
    case "hostile":
      return "enemy";
    case "friendly":
    case "ally":
    case "alliert":
    case "allianse":
      return "ally";
    case "knows":
    case "friend":
    case "venn":
    case "vennskap":
      return "friend";
    default:
      return "neutral";
  }
}

export type EntityStanceCategory =
  "ally" | "friend" | "enemy" | "faction" | "neutral";

export interface PrimaryStanceInfo {
  stance: EntityStanceCategory;
  badgeText: string;
}

const ALLY_STANCE_KEYWORDS = ["alliert", "ally", "allianse"];
const ENEMY_STANCE_KEYWORDS = ["fiende", "enemy", "motstander"];
const FRIEND_STANCE_KEYWORDS = ["venn", "friend"];
const PARTY_STANCE_KEYWORDS = ["party", "partyet"];

function resolveStanceCategory(raw: string): PrimaryStanceInfo | null {
  if (ALLY_STANCE_KEYWORDS.some((k) => raw.includes(k))) {
    return { stance: "ally", badgeText: "Ally" };
  }
  if (ENEMY_STANCE_KEYWORDS.some((k) => raw.includes(k))) {
    return { stance: "enemy", badgeText: "Enemy" };
  }
  if (PARTY_STANCE_KEYWORDS.some((k) => raw.includes(k))) {
    return { stance: "friend", badgeText: "Party" };
  }
  if (FRIEND_STANCE_KEYWORDS.some((k) => raw.includes(k))) {
    return { stance: "friend", badgeText: "Friend" };
  }
  return null;
}

export function getEntityPrimaryStance(
  entity?: {
    type?: string | null;
    labels?: string[] | null;
    metadata?: Record<string, unknown> | null;
  } | null,
): PrimaryStanceInfo {
  if (!entity) return { stance: "neutral", badgeText: "" };

  const isFaction = (entity.type ?? "").toLowerCase() === "faction";
  if (isFaction) {
    return { stance: "faction", badgeText: "Faction" };
  }

  const allStanceStrings = [
    ...(entity.labels || []),
    String(entity.metadata?.stance || ""),
    String(entity.metadata?.tilknytning || ""),
    String(entity.metadata?.status || ""),
  ];

  for (const raw of allStanceStrings) {
    const match = resolveStanceCategory(raw.toLowerCase());
    if (match) return match;
  }

  return {
    stance: "neutral",
    badgeText: entity.type
      ? entity.type.charAt(0).toUpperCase() + entity.type.slice(1)
      : "",
  };
}
