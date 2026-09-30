import { loadLocalBlogArticles } from "$lib/content/blog-content";
import { getAnswerCategory } from "$lib/content/answers/categories";
import { getAllAnswers, answerPath } from "$lib/content/answers/registry";
import { buildAbsoluteUrl } from "./site";
import { renderAtomFeed, type FeedEntry, type FeedMeta } from "./feed";

const DEFAULT_BLOG_AUTHOR = "Codex Cryptica";

export const answerFeedEntries = (): FeedEntry[] =>
  getAllAnswers().map((answer) => {
    const category = getAnswerCategory(answer.category)?.title;
    return {
      title: answer.question,
      url: buildAbsoluteUrl(answerPath(answer)),
      publishedAt: answer.publishedAt,
      summary: answer.seo.description,
      contentType: "answer",
      categories: [...(category ? [category] : []), ...answer.labels],
    };
  });

export const blogFeedEntries = (): FeedEntry[] =>
  loadLocalBlogArticles().map((article) => ({
    title: article.title,
    url: buildAbsoluteUrl(`/blog/${article.slug}`),
    publishedAt: article.publishedAt,
    ...(article.updatedAt ? { updatedAt: article.updatedAt } : {}),
    summary: article.description,
    contentType: "blog",
    categories: article.topic ? [article.topic] : [],
    author: article.author ?? DEFAULT_BLOG_AUTHOR,
  }));

const feed = (
  path: string,
  sitePath: string,
  title: string,
  subtitle: string,
  entries: FeedEntry[],
): string => {
  const meta: FeedMeta = {
    title,
    subtitle,
    selfUrl: buildAbsoluteUrl(path),
    siteUrl: buildAbsoluteUrl(sitePath),
  };
  return renderAtomFeed(meta, entries);
};

export const renderCombinedFeed = () =>
  feed(
    "/feed.xml",
    "/",
    "Codex Cryptica: Answers and blog",
    "New RPG and worldbuilding answers and articles from Codex Cryptica.",
    [...answerFeedEntries(), ...blogFeedEntries()],
  );

export const renderAnswersFeed = () =>
  feed(
    "/answers/feed.xml",
    "/answers",
    "Codex Cryptica: RPG and worldbuilding answers",
    "Short, practical answers to questions that come up while running and building tabletop campaigns.",
    answerFeedEntries(),
  );

export const renderBlogFeed = () =>
  feed(
    "/blog/feed.xml",
    "/blog",
    "Codex Cryptica: Blog",
    "Articles, guides and news from Codex Cryptica.",
    blogFeedEntries(),
  );
