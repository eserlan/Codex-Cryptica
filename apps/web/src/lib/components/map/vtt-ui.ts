import type { SessionMode } from "../../../types/vtt";

export function shouldShowInitiativePanel(
  vttEnabled: boolean,
  mode: SessionMode,
) {
  return vttEnabled && mode === "combat";
}

export function getPrimaryButtonStateClass(isActive: boolean) {
  const focusClasses =
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary";
  const stateClass = isActive
    ? "bg-theme-primary/20 text-theme-primary ring-1 ring-theme-primary/50 hover:bg-theme-primary/30"
    : "text-theme-muted hover:text-theme-text hover:bg-theme-primary/10";
  return `${stateClass} ${focusClasses}`;
}

export function getMeasurementToolButtonClass(isActive: boolean) {
  return [
    "group relative inline-flex h-8 w-[3.375rem] items-center overflow-hidden rounded-full border p-0.5 text-left backdrop-blur shadow-lg transition-all duration-200",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary focus-visible:ring-offset-2 focus-visible:ring-offset-theme-surface",
    isActive
      ? "border-theme-primary bg-theme-primary shadow-[0_14px_30px_rgba(0,0,0,0.35)] hover:bg-theme-primary/90"
      : "border-theme-border bg-theme-surface/90 hover:border-theme-primary/60 hover:shadow-[0_14px_30px_rgba(0,0,0,0.28)]",
  ].join(" ");
}
