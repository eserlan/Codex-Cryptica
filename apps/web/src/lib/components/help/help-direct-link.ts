const HELP_HASH_PREFIX = "#help/";

export function getHelpArticleIdFromHash(hash: string): string | null {
  if (!hash.startsWith(HELP_HASH_PREFIX)) return null;

  const articleId = hash.slice(HELP_HASH_PREFIX.length);
  return articleId || null;
}

export function createHelpHashArticleSelector(deps: {
  getHash: () => string;
  selectArticle: (id: string) => unknown;
  clearSelection: () => void;
  ensureArticles: () => Promise<unknown>;
  onStart?: () => void;
  onError?: () => void;
}) {
  let generation = 0;
  let active = true;

  const selectFromHash = async (): Promise<void> => {
    const request = ++generation;
    const articleId = getHelpArticleIdFromHash(deps.getHash());
    if (articleId) deps.selectArticle(articleId);
    else deps.clearSelection();
    deps.onStart?.();

    try {
      await deps.ensureArticles();
    } catch {
      if (active && request === generation) deps.onError?.();
    }
  };

  return {
    selectFromHash,
    dispose() {
      active = false;
      generation++;
    },
  };
}
