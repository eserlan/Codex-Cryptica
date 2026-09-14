import type { AnswerCategoryId } from "$lib/content/answers/schema";

export interface LikedAnswerItem {
  slug: string;
  question: string;
  summary: string;
  category?: AnswerCategoryId;
  categoryLabel?: string;
  href: string;
}

export interface SharedGeneratorItem {
  shareId: string;
  title: string;
  generatorId: string;
  generatorTitle?: string;
  /** False when only a management token was available to reconstruct the entry. */
  hasDescriptiveMetadata?: boolean;
  createdAt: string;
  url: string;
  excerpt?: string;
  managementToken?: string;
}

export interface MyStuffData {
  likedAnswers: LikedAnswerItem[];
  sharedGenerators: SharedGeneratorItem[];
}
