const HELP_HASH_PREFIX = "#help/";

export function getHelpArticleIdFromHash(hash: string): string | null {
  if (!hash.startsWith(HELP_HASH_PREFIX)) return null;

  const articleId = hash.slice(HELP_HASH_PREFIX.length);
  return articleId || null;
}
