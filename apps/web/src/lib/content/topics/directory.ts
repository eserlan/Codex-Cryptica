import { topicEntries } from "../discovery/entries/topics";
import type { DiscoveryEntryInput } from "../discovery/schema";

/**
 * Card metadata for the `/topics` directory. Route, live status and
 * indexability come from the matching discovery record, joined by `id`.
 */
export type TopicListing = {
  discoveryId: string;
  title: string;
  summary: string;
  icon: string;
  order: number;
};

export type TopicListItem = {
  href: string;
  title: string;
  summary: string;
  icon: string;
};

export const TOPIC_LISTINGS: readonly TopicListing[] = [
  {
    discoveryId: "topic-heists",
    title: "Heists",
    summary:
      "Frameworks, prize design checklists, worked genre examples, and tools for running tabletop heists.",
    icon: "icon-[lucide--lock]",
    order: 1,
  },
  {
    discoveryId: "topic-puzzles",
    title: "Puzzles",
    summary:
      "Stall-proof design, hint ladders, worked examples with alternate solutions, and a puzzle generator.",
    icon: "icon-[lucide--puzzle]",
    order: 2,
  },
  {
    discoveryId: "topic-pirates-high-seas",
    title: "Pirates & High Seas",
    summary:
      "Guides to pirate systems, exploration, sea travel, ship combat, ports, rivals, and tools for building the campaign.",
    icon: "icon-[lucide--ship]",
    order: 3,
  },
  {
    discoveryId: "topic-solo-rpg",
    title: "Solo RPGs",
    summary:
      "How to play alone: oracles, keeping play from feeling random, campaign logs, and the generators that feed the loop.",
    icon: "icon-[lucide--user]",
    order: 4,
  },
  {
    discoveryId: "topic-dnd",
    title: "Running D&D",
    summary:
      "Start a campaign, prep the next session, run the table and keep track, with answers and tools for each job.",
    icon: "icon-[lucide--swords]",
    order: 5,
  },
  {
    discoveryId: "topic-dnd-beginners",
    title: "D&D for Beginners",
    summary:
      "The play loop, character-sheet orientation, dice mechanics, and combat turns for new players.",
    icon: "icon-[lucide--book-open]",
    order: 6,
  },
];

/** Joins listings to live, indexable discovery entries, sorted by `order`. */
export function buildTopicList(
  listings: readonly TopicListing[],
  entries: readonly DiscoveryEntryInput[],
): TopicListItem[] {
  return listings
    .flatMap((listing) => {
      const entry = entries.find(
        (candidate) => candidate.id === listing.discoveryId,
      );
      if (!entry || entry.status !== "live" || entry.indexable !== true) {
        return [];
      }
      return [{ listing, href: entry.canonicalPath }];
    })
    .sort((a, b) => a.listing.order - b.listing.order)
    .map(({ listing, href }) => ({
      href,
      title: listing.title,
      summary: listing.summary,
      icon: listing.icon,
    }));
}

export function listLiveTopics(): TopicListItem[] {
  return buildTopicList(TOPIC_LISTINGS, topicEntries);
}
