import { safeJsonLd } from "$lib/utils/json-ld";
import type { GeneratorOutput } from "$lib/services/seo/generator-engine";

type Faq = { question: string; answer: string };

export function buildFaqJsonLd(faqs: Faq[]): string {
  if (faqs.length === 0) return "";
  return safeJsonLd({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  });
}

export function buildSoftwareApplicationJsonLd(params: {
  canonicalPath?: string;
  metaDescription: string;
  faqs: Faq[];
}): string {
  const { canonicalPath, metaDescription, faqs } = params;
  return safeJsonLd({
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Codex Cryptica",
    applicationCategory: "GameApplication",
    operatingSystem: "Web",
    url: canonicalPath
      ? `https://codexcryptica.com${canonicalPath}`
      : "https://codexcryptica.com/tools",
    description: metaDescription,
    mainEntity:
      faqs.length > 0
        ? {
            "@type": "FAQPage",
            mainEntity: faqs.map((faq) => ({
              "@type": "Question",
              name: faq.question,
              acceptedAnswer: {
                "@type": "Answer",
                text: faq.answer,
              },
            })),
          }
        : undefined,
  });
}

export function buildBreadcrumbJsonLd(params: {
  canonicalPath?: string;
  introTitle: string;
}): string {
  const { canonicalPath, introTitle } = params;
  return safeJsonLd({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://codexcryptica.com",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Generators",
        item: "https://codexcryptica.com/tools",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: introTitle,
        item: canonicalPath
          ? `https://codexcryptica.com${canonicalPath}`
          : "https://codexcryptica.com/tools",
      },
    ],
  });
}

export function buildResultJsonLd(
  generatedData: GeneratorOutput | null,
): string | null {
  if (!generatedData) return null;

  const description =
    generatedData.summary || generatedData.content?.slice(0, 150) || "";

  if (generatedData.type === "character") {
    return safeJsonLd({
      "@context": "https://schema.org",
      "@type": "Person",
      name: generatedData.title,
      description,
      jobTitle: "Fictional Character",
    });
  }

  if (generatedData.type === "location") {
    return safeJsonLd({
      "@context": "https://schema.org",
      "@type": "Place",
      name: generatedData.title,
      description,
    });
  }

  return safeJsonLd({
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: generatedData.title,
    description,
    genre: "Fantasy / RPG Campaign Lore",
  });
}
