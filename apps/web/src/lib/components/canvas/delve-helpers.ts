import type {
  DelveRoomNodeData,
  DungeonRoomRole,
  PassageType,
} from "generator-engine";

export interface RoleBadgeConfig {
  label: string;
  icon: string;
  colorClass: string;
}

export interface DelveRoomCardPreview {
  description: string;
  detail?: {
    icon: string;
    label: string;
    text: string;
    additionalCount: number;
  };
}

/**
 * Selects the most useful at-a-glance prose for an Area card. AI-enhanced
 * details take precedence over the mechanical topology summary, while the
 * first populated stocking category supplies one compact playable cue.
 */
export function getDelveRoomCardPreview(
  room: DelveRoomNodeData,
): DelveRoomCardPreview {
  const description = room.description?.trim() || room.summary?.trim() || "";
  const climaxStakes =
    room.role === "climax" ? room.climax?.stakes.trim() : undefined;
  if (climaxStakes) {
    return {
      description,
      detail: {
        icon: "icon-[lucide--flame]",
        label: "Stakes",
        text: climaxStakes,
        additionalCount: room.climax?.outcomes.length ?? 0,
      },
    };
  }
  const candidates = [
    {
      icon: "icon-[lucide--swords]",
      label: "Encounter",
      values: room.stocking?.encounters,
    },
    {
      icon: "icon-[lucide--alert-triangle]",
      label: "Hazard",
      values: room.stocking?.hazards,
    },
    {
      icon: "icon-[lucide--gem]",
      label: "Treasure",
      values: room.stocking?.treasure,
    },
    {
      icon: "icon-[lucide--eye]",
      label: "Secret",
      values: room.stocking?.secrets,
    },
  ];
  const populated = candidates.find(({ values }) =>
    values?.some((value) => value.trim()),
  );
  const populatedValues = populated?.values?.filter((value) => value.trim());

  if (populated && populatedValues?.length) {
    return {
      description,
      detail: {
        icon: populated.icon,
        label: populated.label,
        text: populatedValues[0],
        additionalCount: populatedValues.length - 1,
      },
    };
  }

  const factionPresence = room.stocking?.factionPresence?.trim();
  if (factionPresence) {
    return {
      description,
      detail: {
        icon: "icon-[lucide--shield]",
        label: "Faction",
        text: factionPresence,
        additionalCount: 0,
      },
    };
  }

  const atmosphere = room.stocking?.atmosphere?.trim();
  return {
    description,
    detail: atmosphere
      ? {
          icon: "icon-[lucide--wind]",
          label: "Atmosphere",
          text: atmosphere,
          additionalCount: 0,
        }
      : undefined,
  };
}

export function getRoleBadgeConfig(role: DungeonRoomRole): RoleBadgeConfig {
  switch (role) {
    case "entrance":
      return {
        label: "Entrance",
        icon: "icon-[lucide--door-open]",
        colorClass: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
      };
    case "hazard":
      return {
        label: "Hazard",
        icon: "icon-[lucide--alert-triangle]",
        colorClass: "bg-amber-500/15 text-amber-400 border-amber-500/30",
      };
    case "encounter":
      return {
        label: "Encounter",
        icon: "icon-[lucide--swords]",
        colorClass: "bg-rose-500/15 text-rose-400 border-rose-500/30",
      };
    case "treasure":
      return {
        label: "Treasure",
        icon: "icon-[lucide--gem]",
        colorClass: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
      };
    case "secret":
      return {
        label: "Secret",
        icon: "icon-[lucide--eye]",
        colorClass: "bg-purple-500/15 text-purple-400 border-purple-500/30",
      };
    case "lore":
      return {
        label: "Lore",
        icon: "icon-[lucide--book-open]",
        colorClass: "bg-sky-500/15 text-sky-400 border-sky-500/30",
      };
    case "faction":
      return {
        label: "Faction",
        icon: "icon-[lucide--shield]",
        colorClass: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
      };
    case "climax":
      return {
        label: "Climax",
        icon: "icon-[lucide--flame]",
        colorClass: "bg-red-500/20 text-red-300 border-red-400/50",
      };
    case "special":
    default:
      return {
        label: "Special",
        icon: "icon-[lucide--sparkles]",
        colorClass:
          "bg-theme-primary/15 text-theme-primary border-theme-primary/30",
      };
  }
}

export interface PassageEdgeStyle {
  strokeDasharray?: string;
  strokeColor: string;
  badgeIcon: string;
}

export interface PassageDirectionMarkers {
  markerStart?: string;
  markerEnd?: string;
}

export function getPassageDirectionMarkers(
  bidirectional: boolean,
  markerId: string,
): PassageDirectionMarkers {
  if (bidirectional) return {};

  const markerUrl = `url(#${markerId})`;
  return {
    markerEnd: markerUrl,
  };
}

export function getPassageEdgeStyle(type: PassageType): PassageEdgeStyle {
  switch (type) {
    case "hidden":
      return {
        strokeDasharray: "5,5",
        strokeColor: "#a855f7", // purple
        badgeIcon: "icon-[lucide--eye]",
      };
    case "conditional":
      return {
        strokeDasharray: undefined,
        strokeColor: "#f59e0b", // amber
        badgeIcon: "icon-[lucide--lock]",
      };
    case "vertical":
      return {
        strokeDasharray: "2,4",
        strokeColor: "#38bdf8", // sky blue
        badgeIcon: "icon-[lucide--align-justify]",
      };
    case "standard":
    default:
      return {
        strokeDasharray: undefined,
        strokeColor: "#64748b", // slate
        badgeIcon: "icon-[lucide--arrow-right]",
      };
  }
}
