const SHARED_POINT_CRAWL_SERVICE =
  "apps/web/src/lib/services/seo/generator-engine-specialized.ts";

export function isMappedGeneratorChange(item, file, enginePrefixes) {
  if (!enginePrefixes.some((prefix) => file.startsWith(prefix))) return false;

  return (
    item.changed.test(file) ||
    (item.id === "point-crawl" && file === SHARED_POINT_CRAWL_SERVICE)
  );
}
