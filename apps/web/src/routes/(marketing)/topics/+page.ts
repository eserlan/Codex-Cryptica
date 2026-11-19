import { listLiveTopics } from "#lib/content/topics/directory.js";
import type { PageLoad } from "./$types";

export const prerender = true;

export const load: PageLoad = () => ({ topics: listLiveTopics() });
