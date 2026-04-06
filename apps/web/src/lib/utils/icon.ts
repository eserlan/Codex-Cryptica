/**
 * Helper to format iconify classes for Svelte components.
 * Converts "lucide:user" into "icon-[lucide--user]"
 */
export const getIconClass = (iconStr: string | undefined): string => {
  if (!iconStr) return "icon-[lucide--circle]";
  const parts = iconStr.split(":");
  if (parts.length === 2) {
    return `icon-[${parts[0]}--${parts[1]}]`;
  }
  return iconStr.startsWith("icon-") ? iconStr : `icon-[lucide--circle]`;
};
