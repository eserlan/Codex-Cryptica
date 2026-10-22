const SHARED_POINT_CRAWL_SERVICE =
  "apps/web/src/lib/services/seo/generator-engine-specialized.ts";

function isSharedPointCrawlMethodChange(item, file, diff) {
  return (
    item.id === "point-crawl" &&
    file === SHARED_POINT_CRAWL_SERVICE &&
    /(?:generatePointCrawl|regeneratePointCrawlPart)/.test(diff)
  );
}

export function isMappedGeneratorChange(
  item,
  file,
  enginePrefixes,
  pointCrawlServiceDiff = "",
) {
  if (!enginePrefixes.some((prefix) => file.startsWith(prefix))) return false;

  return (
    item.changed.test(file) ||
    isSharedPointCrawlMethodChange(item, file, pointCrawlServiceDiff)
  );
}
