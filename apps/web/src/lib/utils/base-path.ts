import { resolve } from "$app/paths";

/**
 * The app's base path without a trailing slash: "" at the site root,
 * "/codex" under a base path. Build root-relative hrefs as
 * `${basePath()}/answers`.
 *
 * Never append a path to `resolve("")`: since SvelteKit 3 it returns the base
 * *with* a trailing slash ("/" at the root, "./" or "../" while prerendering),
 * so the result is `//answers` (a host named "answers") or `.//answers`.
 */
export function basePath(): string {
  return resolve("").replace(/\/+$/, "");
}
