/**
 * API Contracts and Type Definitions for the Language Generator.
 *
 * Located at specs/141-language-generator/contracts/language.ts
 */

export interface LanguageGeneratorOptions {
  genre: string; // The genre/setting (e.g., "Classic Fantasy")
  tone: string; // Linguistic style (e.g., "Lyrical & Vowel-rich")
  role: string; // Cultural/social role (e.g., "Thieves' Cant")
  structure: string; // Naming structure style (e.g., "Short & Monosyllabic")
  context?: string; // Optional custom context description
}

export interface LanguageGeneratorOutput {
  title: string;
  summary: string;
  lore: string;
  labels: string[];
  connections?: Array<{
    targetTitle: string;
    relationship: string;
  }>;
}
