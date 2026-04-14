export function normalizeGuestView(view?: string | null) {
  const normalized = view?.trim().replace(/^\/+/, "").replace(/\/+$/, "");
  return normalized ? normalized : null;
}

export function getGuestViewFromPathname(
  pathname: string,
  basePath = "",
): string | null {
  const normalizedBase = basePath === "/" ? "" : basePath.replace(/\/+$/, "");
  const hasBase =
    normalizedBase &&
    (pathname === normalizedBase || pathname.startsWith(`${normalizedBase}/`));
  const relativePath = hasBase
    ? pathname.slice(normalizedBase.length)
    : pathname;

  return normalizeGuestView(relativePath);
}

export function buildGuestRoutePath(
  basePath: string,
  view?: string | null,
): string | null {
  const normalizedView = normalizeGuestView(view);
  if (!normalizedView) return null;

  const normalizedBase = basePath === "/" ? "" : basePath.replace(/\/+$/, "");
  return `${normalizedBase}/${normalizedView}`.replace(/\/+/g, "/");
}
