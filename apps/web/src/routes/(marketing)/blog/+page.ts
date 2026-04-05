import { loadBlogIndex } from "$lib/content/blog-content";
import type { PageLoad } from "./$types";

export const load: PageLoad = async () => {
  const articles = await loadBlogIndex();
  return {
    articles,
  };
};
