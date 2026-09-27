export interface FactionTag {
  label: string;
  icon: string;
  variant: "ally" | "enemy" | "neutral" | "default";
}

export function getFactionTags(
  labels?: string[] | null,
  _content?: string | null,
): FactionTag[] {
  return (Array.isArray(labels) ? labels : []).map(makeFactionTag);
}

const FACTION_TAG_RULES: {
  terms: string[];
  icon: string;
  variant: FactionTag["variant"];
  label?: (raw: string, lower: string) => string;
}[] = [
  {
    terms: ["alliert", "allianse", "ally"],
    icon: "icon-[lucide--shield]",
    variant: "ally",
    label: (raw, lower) =>
      lower.includes("alliert") || lower.includes("allianse") ? "Ally" : raw,
  },
  {
    terms: ["fiende", "hostile", "enemy"],
    icon: "icon-[lucide--skull]",
    variant: "enemy",
    label: (raw, lower) => (lower.includes("fiende") ? "Enemy" : raw),
  },
  {
    terms: ["nøytral", "neutral"],
    icon: "icon-[lucide--scale]",
    variant: "neutral",
    label: (raw, lower) => (lower.includes("nøytral") ? "Neutral" : raw),
  },
  {
    terms: ["makt", "militær", "power"],
    icon: "icon-[lucide--swords]",
    variant: "default",
    label: (raw, lower) =>
      lower.includes("politisk makt") ? "Political Power" : raw,
  },
  {
    terms: ["handel", "trade", "coins"],
    icon: "icon-[lucide--coins]",
    variant: "default",
    label: (raw, lower) => (lower.includes("handel") ? "Trade" : raw),
  },
  {
    terms: ["info", "spion", "secret"],
    icon: "icon-[lucide--scroll]",
    variant: "default",
    label: (raw, lower) =>
      lower.includes("informasjon") ? "Intelligence" : raw,
  },
  {
    terms: ["kult", "cult", "magi", "magic"],
    icon: "icon-[lucide--sparkles]",
    variant: "default",
    label: (raw, lower) =>
      lower.includes("kult") ? "Cult" : lower.includes("magi") ? "Magic" : raw,
  },
  {
    terms: ["underverden", "underworld", "thief", "shadow"],
    icon: "icon-[lucide--dagger]",
    variant: "default",
    label: (raw, lower) => (lower.includes("underverden") ? "Underworld" : raw),
  },
  {
    terms: ["by", "city", "borg"],
    icon: "icon-[lucide--castle]",
    variant: "default",
    label: (raw, lower) =>
      lower === "by" ? "City" : lower === "borg" ? "Citadel" : raw,
  },
  {
    terms: ["valdren", "lokasjon", "location"],
    icon: "icon-[lucide--map-pin]",
    variant: "default",
    label: (raw, lower) => (lower.includes("lokasjon") ? "Location" : raw),
  },
];

function makeFactionTag(label: string): FactionTag {
  const lower = label.trim().toLowerCase();
  const rule = FACTION_TAG_RULES.find((candidate) =>
    candidate.terms.some((term) => lower.includes(term)),
  );
  return rule
    ? {
        label: rule.label?.(label, lower) ?? label,
        icon: rule.icon,
        variant: rule.variant,
      }
    : { label, icon: "icon-[lucide--tag]", variant: "default" };
}
