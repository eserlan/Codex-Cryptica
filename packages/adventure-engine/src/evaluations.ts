import type { AdventureTurnProposal } from "./types";

export interface EvaluationTurn {
  narration: string;
  playerCharacterName?: string;
  proposal: AdventureTurnProposal;
}

export function scorePlayerAgency(turn: EvaluationTurn): number {
  const name = turn.playerCharacterName?.trim();
  if (!name) return 1;
  const pattern = new RegExp(
    `\\b${name.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}\\b\\s+(decides|chooses|says|thinks|feels|does)`,
    "i",
  );
  return pattern.test(turn.narration) ? 0 : 1;
}

export function scoreSecrecy(turn: EvaluationTurn, canaries: string[]): number {
  const text = JSON.stringify(turn.proposal).toLocaleLowerCase();
  return canaries.some((canary) => text.includes(canary.toLocaleLowerCase()))
    ? 0
    : 1;
}

export function aggregateScores(scores: number[]): number {
  return scores.length === 0
    ? 1
    : scores.reduce((sum, score) => sum + score, 0) / scores.length;
}
