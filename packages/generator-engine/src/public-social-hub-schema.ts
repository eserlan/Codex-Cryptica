/**
 * Smart generator schemas for social hubs and taverns (#2534).
 *
 * Encodes the causal axis dependencies for:
 * 1. Social Hub: genre -> venueType -> wealthLevel -> atmosphere -> clientele -> trouble
 * 2. Tavern: settlementType -> tavernType -> wealthLevel -> atmosphere -> clientele -> trouble -> namingDirective
 */

import { socialHubConfig } from "./public-social-hub";
import {
  VENUE_TYPE_TRAITS,
  ATMOSPHERE_TRAITS,
  WEALTH_LEVEL_TRAITS,
  CLIENTELE_TRAITS,
  TROUBLE_TRAITS,
  SETTLEMENT_TYPE_TRAITS,
  SOCIAL_HUB_RULES,
  SOCIAL_HUB_AFFINITIES,
  type SocialHubTrait,
} from "./public-social-hub-traits";
import type {
  SmartGeneratorSchema,
  SmartOption,
  SmartPredicate,
} from "./smart";

export const TAVERN_NAMING_STYLES = [
  "Name it after an animal and a worn or unlikely material (e.g. 'The Tin Boar', 'The Pitted Heron').",
  "Name it after a physical object associated with the owner's past — a weapon, trade tool, or keepsake (e.g. 'The Broken Spoke', 'The Dented Kettle').",
  "Use a short ironic or sardonic phrase (e.g. 'The Honest Scales', 'The Fair Price', 'The Warm Welcome').",
  "Name it after an obscure local legend, a minor battle, or a peculiar geographical feature — not a generic landmark.",
  "Use a two-word compound that evokes the atmosphere — a worn adjective plus a mundane noun (e.g. 'The Sullen Lantern', 'The Leaning Barrel', 'The Scorched Bell').",
] as const;

function traitPredicate(
  traits: readonly SocialHubTrait[],
): SmartPredicate | undefined {
  if (traits.length === 0) return undefined;
  if (traits.length === 1) return { trait: traits[0] };
  return { any: traits.map((trait) => ({ trait })) };
}

function withRules(
  value: string,
  traits: readonly SocialHubTrait[],
  rules: readonly {
    trait: SocialHubTrait;
    requiresTraitOf?: readonly SocialHubTrait[];
    excludesTraitOf?: readonly SocialHubTrait[];
  }[] = SOCIAL_HUB_RULES,
  affinities: readonly {
    when: SocialHubTrait;
    favour: SocialHubTrait;
    multiplier: number;
  }[] = SOCIAL_HUB_AFFINITIES,
): SmartOption {
  const requires: SocialHubTrait[] = [];
  const excludes: SocialHubTrait[] = [];
  for (const rule of rules) {
    if (!traits.includes(rule.trait)) continue;
    requires.push(...(rule.requiresTraitOf ?? []));
    excludes.push(...(rule.excludesTraitOf ?? []));
  }

  const boosts: Record<string, number> = {};
  for (const affinity of affinities) {
    if (traits.includes(affinity.favour)) {
      boosts[affinity.when] = affinity.multiplier;
    }
  }

  return {
    value,
    traits,
    requires: traitPredicate(requires),
    excludes: traitPredicate(excludes),
    boosts: Object.keys(boosts).length > 0 ? boosts : undefined,
  };
}

function annotate(
  value: string,
  traitsFor: Readonly<Record<string, readonly SocialHubTrait[]>>,
): SmartOption {
  return withRules(value, traitsFor[value] ?? []);
}

export function buildSocialHubSchema(): SmartGeneratorSchema {
  return {
    id: "social-hub",
    axes: [
      {
        id: "venueType",
        label: "Venue Type",
        pool: (ctx) => {
          const genre = ctx.genre || "Fantasy";
          const list =
            socialHubConfig.venueTypesByGenre[genre] ??
            socialHubConfig.venueTypesByGenre["Fantasy"] ??
            [];
          return list.map((v) => annotate(v, VENUE_TYPE_TRAITS));
        },
      },
      {
        id: "wealthLevel",
        label: "Wealth Level",
        pool: () =>
          socialHubConfig.wealthLevels.map((v) =>
            annotate(v, WEALTH_LEVEL_TRAITS),
          ),
      },
      {
        id: "atmosphere",
        label: "Atmosphere",
        pool: () =>
          socialHubConfig.atmospheres.map((v) =>
            annotate(v, ATMOSPHERE_TRAITS),
          ),
      },
      {
        id: "clientele",
        label: "Primary Clientele",
        pool: (ctx) => {
          const genre = ctx.genre || "Fantasy";
          const list =
            socialHubConfig.clientelesByGenre[genre] ??
            socialHubConfig.clientelesByGenre["Fantasy"] ??
            [];
          return list.map((v) => annotate(v, CLIENTELE_TRAITS));
        },
      },
      {
        id: "trouble",
        label: "Hidden Trouble",
        pool: () =>
          socialHubConfig.troubles.map((v) => annotate(v, TROUBLE_TRAITS)),
      },
    ],
  };
}

export function buildTavernSchema(): SmartGeneratorSchema {
  return {
    id: "tavern",
    axes: [
      {
        id: "settlementType",
        label: "Settlement Type",
        pool: () =>
          socialHubConfig.settlementTypes.map((v) =>
            annotate(v, SETTLEMENT_TYPE_TRAITS),
          ),
      },
      {
        id: "tavernType",
        label: "Tavern Type",
        pool: () =>
          (socialHubConfig.venueTypesByGenre["Fantasy"] ?? []).map((v) =>
            annotate(v, VENUE_TYPE_TRAITS),
          ),
      },
      {
        id: "wealthLevel",
        label: "Wealth Level",
        pool: () =>
          socialHubConfig.wealthLevels.map((v) =>
            annotate(v, WEALTH_LEVEL_TRAITS),
          ),
      },
      {
        id: "atmosphere",
        label: "Atmosphere",
        pool: () =>
          socialHubConfig.atmospheres.map((v) =>
            annotate(v, ATMOSPHERE_TRAITS),
          ),
      },
      {
        id: "clientele",
        label: "Primary Clientele",
        pool: () =>
          (socialHubConfig.clientelesByGenre["Fantasy"] ?? []).map((v) =>
            annotate(v, CLIENTELE_TRAITS),
          ),
      },
      {
        id: "trouble",
        label: "Hidden Trouble",
        pool: () =>
          socialHubConfig.troubles.map((v) => annotate(v, TROUBLE_TRAITS)),
      },
      {
        id: "namingDirective",
        label: "Naming Directive",
        pool: () => TAVERN_NAMING_STYLES.map((v) => ({ value: v })),
      },
    ],
  };
}
