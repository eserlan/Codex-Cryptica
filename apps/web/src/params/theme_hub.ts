import type { ParamMatcher } from "@sveltejs/kit";
import { HUB_THEME_SLUGS } from "$lib/content/hub-themes";

export const VALID_HUB_THEMES = new Set<string>(HUB_THEME_SLUGS);

export const match: ParamMatcher = (param) => VALID_HUB_THEMES.has(param);
