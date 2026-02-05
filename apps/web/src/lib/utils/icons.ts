import { DEFAULT_ICON } from "schema";

/**
 * Converts icon format from storage (lucide:name) to CSS class (icon-[lucide--name])
 * @param iconStr - Icon string in "prefix:name" or "icon-{prefix--name}" format
 * @returns CSS class for iconify icon
 */
export function getIconClass(iconStr: string | undefined): string {
    if (!iconStr) return `icon-[${DEFAULT_ICON.replace(":", "--")}]`;

    // Handle "prefix:name" format (e.g., "lucide:user")
    const parts = iconStr.split(":");
    if (parts.length === 2) {
        return `icon-[${parts[0]}--${parts[1]}]`;
    }

    // Already in icon-{...} format or fallback
    return iconStr.startsWith("icon-") ? iconStr : `icon-[${DEFAULT_ICON.replace(":", "--")}]`;
}

/**
 * Default icon class for UI fallback
 */
export const DEFAULT_ICON_CLASS = getIconClass(DEFAULT_ICON);
