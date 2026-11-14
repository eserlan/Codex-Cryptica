import { loadHelpArticles, type HelpArticle } from "#lib/content/loader.js";

export type { HelpArticle };

let _cachedHelpArticles: HelpArticle[] | null = null;

export function getHelpArticles(): HelpArticle[] {
  if (!_cachedHelpArticles) {
    try {
      _cachedHelpArticles = loadHelpArticles();
    } catch (e) {
      console.error("Failed to load help articles:", e);
      _cachedHelpArticles = [];
    }
  }
  return _cachedHelpArticles;
}

export const HELP_ARTICLES: HelpArticle[] = new Proxy([] as HelpArticle[], {
  get(_target, prop, receiver) {
    const articles = getHelpArticles();
    const val = Reflect.get(articles, prop, receiver);
    return typeof val === "function" ? val.bind(articles) : val;
  },
  has(_target, prop) {
    return Reflect.has(getHelpArticles(), prop);
  },
  ownKeys() {
    return Reflect.ownKeys(getHelpArticles());
  },
  getOwnPropertyDescriptor(_target, prop) {
    return Reflect.getOwnPropertyDescriptor(getHelpArticles(), prop);
  },
});
