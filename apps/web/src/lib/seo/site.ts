const DEFAULT_PUBLIC_APP_URL = "https://codexcryptica.com";
const DEFAULT_ROBOTS_DIRECTIVE = "index, follow";

const normalizeOrigin = (value: string) => value.trim().replace(/\/+$/, "");

export const getPublicAppUrl = () =>
  normalizeOrigin(
    import.meta.env.VITE_PUBLIC_APP_URL || DEFAULT_PUBLIC_APP_URL,
  );

export const buildAbsoluteUrl = (path: string, origin = getPublicAppUrl()) => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return normalizedPath === "/" ? `${origin}/` : `${origin}${normalizedPath}`;
};

export const getRobotsDirective = () =>
  import.meta.env.VITE_ROBOTS_DIRECTIVE?.trim() || DEFAULT_ROBOTS_DIRECTIVE;
