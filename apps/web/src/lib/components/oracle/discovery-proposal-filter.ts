type DiscoveryProposalLike = {
  title?: string;
};

const SUPPRESSED_TITLES = new Set([
  "name",
  "type",
  "chronicle",
  "lore",
  "content",
  "summary",
  "description",
]);

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[:\s]+$/g, "")
    .trim();
}

export function isVisibleDiscoveryProposal(
  proposal: DiscoveryProposalLike,
): boolean {
  if (!proposal.title) return false;
  return !SUPPRESSED_TITLES.has(normalizeTitle(proposal.title));
}
