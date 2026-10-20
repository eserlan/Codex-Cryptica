import { bannedNamesIn } from "./naming-policy";

export function addBannedNameFindings(
  names: string[],
  avoidNames: string[],
  hard: string[],
): void {
  const banned = bannedNamesIn(names, avoidNames);
  if (banned.length > 0) {
    hard.push(`banned placeholder name: ${banned.join(", ")}`);
  }
}
