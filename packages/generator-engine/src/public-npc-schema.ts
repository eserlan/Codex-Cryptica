/**
 * The NPC generator's smart schema (#2532).
 *
 * Builds a `SmartGeneratorSchema` from `npcConfig` and `npcThemeConfig`
 * plus trait annotations. Causal axis order:
 *
 *   ancestry -> role -> alignment -> motive -> mannerism -> secret -> faction -> factionStance -> leverage -> plotHook
 *
 * An NPC has an origin/ancestry, which shapes what role they adopt, which colours
 * their moral posture and personal motive, which informs their tangible mannerisms,
 * their hidden secret, their faction ties, leverage points, and plot hooks.
 */

import { npcConfig, npcThemeConfig, DELVE_ROLES } from "./public-npc-constants";
import {
  NPC_ANCESTRY_TRAITS,
  NPC_ROLE_TRAITS,
  NPC_ALIGNMENT_TRAITS,
  NPC_MANNERISM_TRAITS,
  NPC_MOTIVE_TRAITS,
  NPC_SECRET_TRAITS,
  NPC_FACTION_STANCE_TRAITS,
  NPC_LEVERAGE_TRAITS,
  NPC_RULES,
  NPC_AFFINITIES,
  type NpcTrait,
} from "./public-npc-traits";
import type {
  SmartGeneratorSchema,
  SmartOption,
  SmartPredicate,
} from "./smart";

export const LOCAL_MANNERISMS = [
  "Speaks in a quiet, measured cadence, continuously evaluating the room.",
  "Fidgets with a worn token or ring whenever answering a direct question.",
  "Speaks with abrupt efficiency, rarely using polite filler words.",
  "Maintains intense, unblinking eye contact while listening.",
  "Speaks in a gravelly whisper, leaning in close as if every word is contraband.",
  "Chuckles dryly before delivering bad news or complicated terms.",
  "Always whispers when speaking to build dramatic tension.",
  "Carries a pocket watch that runs backward but claims it is correct.",
  "Extremely superstitious about black cats and wooden doors.",
  "Has a collection of rare, dried flowers in their cloak pockets.",
  "Never looks anyone directly in the eye, shifting their gaze constantly.",
  "Speaks in rhyming riddles when they become nervous or excited.",
  "Has a nervous twitch in their left hand when speaking about magic.",
  "Obsessed with cleanliness, frequently wiping down their gear.",
] as const;

export const LOCAL_FACTION_STANCES = [
  "Pragmatically cooperative with whoever holds local authority, deeply cynical about idealistic reformists.",
  "Distrusts large centralized institutions; favors small, decentralized alliances and personal handshakes.",
  "Publicly obedient to ruling factions while privately hedging bets with independent operators.",
  "Harbors deep resentment toward bureaucratic oversight; loyal only to those who pay promptly.",
  "Views competing factions as expendable pawns in a long-term survival game.",
] as const;

export const LOCAL_LEVERAGE_PRICES = [
  "Can be bought with immunity or hard currency; breaks if their family or sanctuary is threatened.",
  "Cooperation costs rare technical or arcane favors; folds under public exposure of their past debts.",
  "Requires guarantees of safe passage; folds under threats to their remaining personal network.",
  "Demands respect and reciprocal secrets; yields when their hidden patron is named.",
  "Works for exclusive trade rights or leverage; panics if their operational ledger is seized.",
] as const;

export const LOCAL_CONTRADICTIONS = [
  "A ruthless mercenary captain who tenderly cultivates fragile glasshouse orchids.",
  "An austere inquisitor who secretly swears like a sailor and drinks cheap grog.",
  "A terrifying underworld fence who is visibly petrified of small dogs.",
  "A burly town blacksmith who faints at the sight of open wounds or spilled blood.",
  "A haughty elven scholar who is an avid, foul-mouthed regular at underground pit fights.",
  "A greedy moneylender who secretly pays the apothecary bills for local orphans.",
  "A reclusive hedge wizard who gets painfully lonely and overshares personal gossip with patrons.",
  "A grim cemetery keeper who secretly writes cheerful, light-hearted romantic poetry.",
  "A paranoid smuggler who refuses to tell even harmless lies about mundane everyday trivialities.",
  "A veteran city watch sergeant who carries a pouch of dried breadcrumbs to feed stray pigeons.",
  "An aristocratic magistrate who spends free weekends disguised as a common labourer digging trenches.",
  "A zealous temple priest who harbors a compulsive, secret addiction to sugar confectionery.",
] as const;

export const LOCAL_SENSORY_TAGS = [
  "Smells of charred oak and elderberry wine; wears a chipped jeweller's loupe on a silver chain.",
  "The sharp, distinct aroma of dried clove tobacco; speaks with a dry, gravelly rasp.",
  "A prominent notched canine tooth and heavy brass thumb rings that clink against tankards.",
  "Wears an oversized patchwork velvet coat lined with concealed inner pockets.",
  "Fingertips permanently stained with indigo ink; faint scent of sweet almond oil.",
  "Walks with a slight limp and the rhythmic tap-scrape of a brass-shod cane.",
  "Smells of pungent bog peat and damp wool; keeps a polished bone needle pinned to their lapel.",
  "Carries a faint scent of ozone and singed linen; wears wire-rimmed spectacles mended with green twine.",
  "A deep crescent scar across the left cheek; hands perpetually dusted with sea salt or flour.",
  "Piercing amber eyes and a quiet, wheezing whistle whenever inhaling deeply.",
  "Wears heavy iron keys that jingle softly with every deliberate stride.",
  "Smells of bitter pine pitch and leather tallow; wears a braided wolf-hair bracelet.",
] as const;

export const LOCAL_IMMEDIATE_WANTS = [
  "Needs forty pounds of quality bog-iron before the baron's bailiff arrives on Morndas.",
  "Desperate for coin to settle an overdue tavern tab before the cellar doors are locked.",
  "Seeking discreet protection from an aggressive debt collector spotted in the market square.",
  "Needs uninterrupted quiet to balance the trade ledgers before tomorrow morning's audit.",
  "Looking for verifiable gossip regarding a rival merchant's newly opened shipping route.",
  "Needs someone expendable to deliver a sealed leather pouch across the river without asking questions.",
  "Searching for an antidote or rare dried root to treat an escalating fever in secret.",
  "Wants an outsider to vouch for their alibi regarding last night's warehouse fire.",
  "Looking to pawn a hot piece of silver jewellery before the city gates close at dusk.",
  "Needs muscle to intimidate a stubborn tenant who refused to pay stall rent.",
  "Desperately seeking a fast horse or passage out of town before sunrise.",
  "Wants someone to test a suspect flask of wine before serving it to a visiting dignitary.",
] as const;

export const LOCAL_RELATIONSHIP_HOOKS = [
  "Secretly supplies discounted hardware and pitons to the local riverside smugglers.",
  "Estranged sibling of a prominent town watch sergeant stationed at the north gate.",
  "Deeply indebted to a local moneylender and searching for a way to buy out the contract.",
  "Entangled in a bitter, multi-year feud with the district's chief apothecary.",
  "Quietly acts as the eyes and ears for a reformist faction on the town council.",
  "Owes their current business to a silent partner whose demands are growing unreasonable.",
  "Childhood companion of a notorious bandit chief currently terrorising the eastern roads.",
  "Former apprentice to an archmage who was exiled for forbidden research.",
  "Protected by the dockers' union after saving a crane operator from a fatal collapse.",
  "Paying quiet monthly hush-money to a corrupt magistrate who knows their true lineage.",
] as const;

function forTheme<T>(record: Record<string, T[]>, theme?: string): T[] {
  return (theme && record[theme]) || record["Classic Fantasy"] || [];
}

function traitPredicate(
  traits: readonly NpcTrait[],
): SmartPredicate | undefined {
  if (traits.length === 0) return undefined;
  if (traits.length === 1) return { trait: traits[0] };
  return { any: traits.map((trait) => ({ trait })) };
}

function withRules(
  value: string,
  traits: readonly NpcTrait[],
  rules: readonly {
    trait: NpcTrait;
    requiresTraitOf?: readonly NpcTrait[];
    excludesTraitOf?: readonly NpcTrait[];
  }[] = NPC_RULES,
  affinities: readonly {
    when: NpcTrait;
    favour: NpcTrait;
    multiplier: number;
  }[] = NPC_AFFINITIES,
): SmartOption {
  const requires: NpcTrait[] = [];
  const excludes: NpcTrait[] = [];
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
  traitsFor: Readonly<Record<string, readonly NpcTrait[]>>,
): SmartOption {
  return withRules(value, traitsFor[value] ?? []);
}

export function buildNpcSchema(isDelve = false): SmartGeneratorSchema {
  return {
    id: "npc",
    axes: [
      {
        id: "ancestry",
        label: "Ancestry / Race",
        pool: (ctx) => {
          const list =
            (ctx.genre && npcThemeConfig.ancestries[ctx.genre]) ||
            npcConfig.races;
          return list.map((v) => annotate(v, NPC_ANCESTRY_TRAITS));
        },
      },
      {
        id: "role",
        label: "Role",
        pool: (ctx) => {
          if (isDelve) {
            return [...DELVE_ROLES].map((v) => annotate(v, NPC_ROLE_TRAITS));
          }
          const list =
            (ctx.genre && npcThemeConfig.roles[ctx.genre]) || npcConfig.roles;
          return list.map((v) => annotate(v, NPC_ROLE_TRAITS));
        },
      },
      {
        id: "alignment",
        label: "Moral Posture",
        pool: (ctx) => {
          const themeMoralities =
            ctx.genre && npcThemeConfig.moralities[ctx.genre];
          if (themeMoralities && themeMoralities.length > 0) {
            return themeMoralities.map((m) =>
              annotate(m.id, NPC_ALIGNMENT_TRAITS),
            );
          }
          return npcConfig.alignments.map((v) =>
            annotate(v, NPC_ALIGNMENT_TRAITS),
          );
        },
      },
      {
        id: "motive",
        label: "Motive & Drive",
        pool: (ctx) =>
          forTheme(npcConfig.motivesByTheme, ctx.genre).map((v) =>
            annotate(v, NPC_MOTIVE_TRAITS),
          ),
      },
      {
        id: "mannerism",
        label: "Mannerism & Demeanor",
        pool: () =>
          LOCAL_MANNERISMS.map((v) => annotate(v, NPC_MANNERISM_TRAITS)),
      },
      {
        id: "secret",
        label: "Hidden Secret",
        pool: (ctx) =>
          forTheme(npcConfig.secretsByTheme, ctx.genre).map((v) =>
            annotate(v, NPC_SECRET_TRAITS),
          ),
      },
      {
        id: "faction",
        label: "Faction Tie",
        pool: (ctx) =>
          forTheme(npcConfig.factionsByTheme, ctx.genre).map((v) => ({
            value: v,
          })),
      },
      {
        id: "factionStance",
        label: "Faction Stance",
        pool: () =>
          LOCAL_FACTION_STANCES.map((v) =>
            annotate(v, NPC_FACTION_STANCE_TRAITS),
          ),
      },
      {
        id: "leverage",
        label: "Leverage Point",
        pool: () =>
          LOCAL_LEVERAGE_PRICES.map((v) => annotate(v, NPC_LEVERAGE_TRAITS)),
      },
      {
        id: "plotHook",
        label: "Plot Hook",
        pool: () => npcConfig.plotHooks.map((v) => ({ value: v })),
      },
    ],
  };
}
