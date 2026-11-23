/** Whether a delayed refinement still owns the same crawl revision. */
export function isCurrentPointCrawlRefinement(
  requestToken: number,
  activeToken: number,
  currentCrawl: unknown,
  startedFrom: unknown,
): boolean {
  return requestToken === activeToken && currentCrawl === startedFrom;
}
