/**
 * Delimit reference templates in AI prompts so models can use their structure
 * without copying their explanatory prose into generated content.
 */
export function templateGuidanceBlock(template: string): string {
  return `<template_guidance>\n${template.trim()}\n</template_guidance>`;
}

export function templateGuidanceInstruction(outputField: string): string {
  return `Use the template guidance only to understand each section's purpose. Preserve its markdown section headings, but write new, entity-specific prose beneath them. Do not reproduce explanatory text, placeholders, questions, examples, or XML tags from <template_guidance> in the generated ${outputField}.`;
}
