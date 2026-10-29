import {
  pointCrawlNodeRoleLabel,
  pointCrawlNodeRoleSymbol,
  type PointCrawlNetwork,
  type PointCrawlNodeRole,
  type PointCrawlStructuralRole,
} from "generator-engine";

const ROLE_ICONS: Record<
  PointCrawlNodeRole | PointCrawlStructuralRole,
  string
> = {
  start: "icon-[lucide--map-pin]",
  goal: "icon-[lucide--flag]",
  hub: "icon-[lucide--git-branch]",
  chokepoint: "icon-[lucide--door-open]",
  secret: "icon-[lucide--eye-off]",
  optional: "icon-[lucide--compass]",
  connector: "icon-[lucide--route]",
  hazard: "icon-[lucide--triangle-alert]",
  obstacle: "icon-[lucide--door-open]",
  side: "icon-[lucide--compass]",
};

/** Match only headings generated from the current point-crawl data. */
export function pointCrawlHeading(heading: string, crawl?: PointCrawlNetwork) {
  if (!crawl) return undefined;
  for (const [index, node] of crawl.nodes.entries()) {
    const title = `${index + 1}. ${node.name}`;
    const label = pointCrawlNodeRoleLabel(node);
    const symbol = pointCrawlNodeRoleSymbol(node);
    if (
      heading === `${title} (${symbol} ${label})` ||
      heading === `${title} *(${symbol} ${label})*` ||
      heading === `${title} *(${label})*`
    ) {
      return {
        title,
        label,
        icon: ROLE_ICONS[node.structuralRole ?? node.role],
      };
    }
  }
  return undefined;
}
