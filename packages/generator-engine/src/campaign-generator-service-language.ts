import { CampaignGeneratorCore } from "./campaign-generator-service-core";
import { buildLanguageRepairPrompt } from "./language-profile";
import { assessLanguageOutput } from "./language-output-assessment";
import {
  LANGUAGE_GENERATION_CONFIG,
  languageGeneratorOutput,
  languageOptions,
} from "./campaign-generator-language";
import { SYSTEM_INSTRUCTION } from "./campaign-generator-registry";
import { completeText } from "./campaign-generator-service-core";
import { promptMetrics } from "./campaign-generator-service-core";
import type {
  CampaignGeneratorDefinition,
  GeneratedDraft,
  GeneratorOutput,
  GeneratorRunRequest,
} from "./campaign-generator-types";

type LanguageAssessment = {
  output?: GeneratorOutput;
  blockingIssues: string[];
  advisoryIssues: string[];
  issues: string[];
};

function isCleanLanguageAssessment(candidate: LanguageAssessment): boolean {
  return !!candidate.output && candidate.issues.length === 0;
}

function isAcceptableLanguageAssessment(
  candidate: LanguageAssessment,
): boolean {
  return !!candidate.output && candidate.blockingIssues.length === 0;
}

export class CampaignGeneratorLanguageService extends CampaignGeneratorCore {
  protected assessLanguageResponse(
    raw: string,
    request: GeneratorRunRequest,
    bannedNames: Set<string>,
  ): LanguageAssessment {
    const assessment = assessLanguageOutput(
      raw,
      languageOptions(request),
      bannedNames,
    );
    return {
      ...assessment,
      output: assessment.output
        ? languageGeneratorOutput(assessment.output)
        : undefined,
    };
  }

  protected async generateLanguageWithAI(
    generator: CampaignGeneratorDefinition,
    request: GeneratorRunRequest,
    bannedNames: Set<string>,
  ): Promise<GeneratedDraft | null> {
    if (!this.aiGateway) return null;
    // Language profiles are independent concepts, not conversational revisions.
    const fullPrompt = generator.buildPrompt({
      ...request,
      interaction: undefined,
    });

    try {
      const initial = await this.aiGateway.complete(
        fullPrompt,
        SYSTEM_INSTRUCTION,
        { generationConfig: LANGUAGE_GENERATION_CONFIG },
      );
      const first = this.assessLanguageResponse(
        completeText(initial),
        request,
        bannedNames,
      );
      if (isCleanLanguageAssessment(first)) {
        this.reportLanguagePrompt(request, fullPrompt);
        return generator.mapOutputToDraft(first.output!, request);
      }
      return this.completeLanguageRepairs(
        generator,
        request,
        bannedNames,
        fullPrompt,
        completeText(initial),
        first,
      );
    } catch {
      return null;
    }
  }

  private reportLanguagePrompt(
    request: GeneratorRunRequest,
    fullPrompt: string,
  ): void {
    this.onPromptMetrics?.(
      promptMetrics({
        request,
        fullPrompt,
        sentPrompt: fullPrompt,
        usedInteraction: false,
        replayed: false,
      }),
    );
  }

  private async completeLanguageRepairs(
    generator: CampaignGeneratorDefinition,
    request: GeneratorRunRequest,
    bannedNames: Set<string>,
    fullPrompt: string,
    initialRaw: string,
    first: ReturnType<
      CampaignGeneratorLanguageService["assessLanguageResponse"]
    >,
  ): Promise<GeneratedDraft | null> {
    let candidateRaw = initialRaw;
    let candidate = first;
    let lastAcceptableOutput = isAcceptableLanguageAssessment(first)
      ? first.output
      : undefined;
    const repairBudget = first.blockingIssues.length ? 2 : 1;

    for (let attempt = 0; attempt < repairBudget; attempt += 1) {
      const repaired = await this.requestLanguageRepair(
        candidateRaw,
        candidate.issues,
        fullPrompt,
      );
      if (!repaired) continue;
      candidateRaw = repaired;
      candidate = this.assessLanguageResponse(
        candidateRaw,
        request,
        bannedNames,
      );
      if (isCleanLanguageAssessment(candidate)) {
        return generator.mapOutputToDraft(candidate.output!, request);
      }
      if (isAcceptableLanguageAssessment(candidate)) {
        lastAcceptableOutput = candidate.output;
        break;
      }
    }

    const accepted = lastAcceptableOutput;
    return accepted ? generator.mapOutputToDraft(accepted, request) : null;
  }

  private async requestLanguageRepair(
    candidateRaw: string,
    issues: string[],
    fullPrompt: string,
  ): Promise<string | null> {
    try {
      const repair = await this.aiGateway!.complete(
        buildLanguageRepairPrompt(candidateRaw, issues, fullPrompt),
        SYSTEM_INSTRUCTION,
        { generationConfig: LANGUAGE_GENERATION_CONFIG },
      );
      return completeText(repair);
    } catch {
      // Preserve the last parseable candidate for the remaining repair.
      return null;
    }
  }
}
