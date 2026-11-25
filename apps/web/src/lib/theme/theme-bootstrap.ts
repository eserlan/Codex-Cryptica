/**
 * Pre-paint theme bootstrap for prerendered public pages (#5149).
 *
 * The app.html inline script exposes `window.__codexApplyTheme`, which sets
 * the theme CSS variables before the body is parsed. A page whose genre is
 * known at render time emits this script in its head so the first paint is
 * already themed, instead of flashing the workspace theme until hydration
 * applies the genre via a post-mount effect.
 *
 * Returns "" for the workspace theme (the app.html default) or no theme.
 */
export function themeBootstrapScript(
  themeId: string | null | undefined,
): string {
  if (!themeId || themeId === "workspace") return "";
  // Keep an arbitrary id from closing the inline script element.
  const serializedTheme = JSON.stringify(themeId).replaceAll("<", "\\u003C");
  return (
    "<" +
    "script>window.__codexApplyTheme && window.__codexApplyTheme(" +
    serializedTheme +
    ");</" +
    "script>"
  );
}
