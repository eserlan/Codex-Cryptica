import { renderMarkdown as renderMd } from "$lib/utils/markdown";

export function replaceEmojisWithIcons(htmlStr: string): string {
  return htmlStr
    .replace(
      /👤/g,
      '<span class="icon-[lucide--user] w-3.5 h-3.5 inline-block align-text-bottom mr-1 text-theme-primary"></span>',
    )
    .replace(
      /👥/g,
      '<span class="icon-[lucide--users] w-3.5 h-3.5 inline-block align-text-bottom mr-1 text-theme-primary"></span>',
    )
    .replace(
      /📍/g,
      '<span class="icon-[lucide--map-pin] w-3.5 h-3.5 inline-block align-text-bottom mr-1 text-theme-primary"></span>',
    )
    .replace(
      /📅|⚡/g,
      '<span class="icon-[lucide--calendar] w-3.5 h-3.5 inline-block align-text-bottom mr-1 text-theme-primary"></span>',
    )
    .replace(
      /🐾/g,
      '<span class="icon-[lucide--paw-print] w-3.5 h-3.5 inline-block align-text-bottom mr-1 text-theme-primary"></span>',
    )
    .replace(
      /📦/g,
      '<span class="icon-[lucide--package] w-3.5 h-3.5 inline-block align-text-bottom mr-1 text-theme-primary"></span>',
    )
    .replace(
      /📄/g,
      '<span class="icon-[lucide--file-text] w-3.5 h-3.5 inline-block align-text-bottom mr-1 text-theme-primary"></span>',
    );
}

export function labelValueHtml(
  label: string,
  value: string,
  variant: "default" | "names" = "default",
): string {
  if (variant === "names") {
    const cleanLabel = label.replace(/\*\*/g, "").trim();
    const escapedLabel = cleanLabel
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    const iconifiedLabel = replaceEmojisWithIcons(
      renderMd(cleanLabel, { inline: true }),
    );
    return `<div class="group relative flex flex-col p-4 bg-theme-surface/30 border border-theme-border/60 rounded-xl hover:border-theme-primary/30 hover:bg-theme-surface/50 transition-all duration-200 shadow-sm mb-3 break-inside-avoid">
        <div class="flex items-start justify-between gap-3 mb-1">
          <span class="font-header font-bold text-base md:text-lg text-theme-primary leading-tight select-all">${iconifiedLabel}</span>
          <button
            type="button"
            class="opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100 p-1 hover:bg-theme-primary/10 text-theme-text/40 hover:text-theme-primary rounded transition-all duration-150 flex items-center justify-center cursor-pointer"
            data-copy-text="${escapedLabel}"
            title="Copy name to clipboard"
          >
            <span class="icon-[lucide--copy] w-3.5 h-3.5"></span>
          </button>
        </div>
        <span class="text-xs md:text-sm text-theme-text/80 leading-relaxed">${renderMd(value, { inline: true })}</span>
      </div>\n`;
  }
  const iconifiedLabel = replaceEmojisWithIcons(
    renderMd(label, { inline: true }),
  );
  return `<div class="flex flex-col mb-1"><span class="seo-label font-header font-bold uppercase tracking-widest text-xs text-theme-primary mb-0.5">${iconifiedLabel}</span><span>${renderMd(value, { inline: true })}</span></div>\n`;
}

// Label/value pairs ("- **Key**: value") get a bespoke stacked layout
// marked can't produce; everything else is delegated to marked.
export function renderGeneratorMarkdown(
  value: string,
  variant: "default" | "names" = "default",
): string {
  return renderMd(
    value
      // bold-key variant: "- **Key**: value" or "* **Key**: value"
      .replace(/^[*-] \*\*(.*?)\*\*: (.*)$/gm, (_, k, v) =>
        labelValueHtml(k, v, variant),
      )
      // plain-key variant: "* Key: value" or "- Key: value" (key ≤ 60 chars, no colon in key)
      .replace(/^[*-] ([A-Za-z][^:\n]{0,58}): (.+)$/gm, (_, k, v) =>
        labelValueHtml(k, v, variant),
      ),
  );
}

export function renderGeneratorLore(
  value: string,
  variant: "default" | "names" = "default",
): string {
  return renderGeneratorMarkdown(value, variant).replace(
    /class="flex flex-col mb-1"/g,
    'class="flex flex-col mb-5"',
  );
}
