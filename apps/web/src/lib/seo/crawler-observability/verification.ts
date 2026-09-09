/**
 * Server-side AI Crawler & Fetcher Verification Engine (#2864).
 *
 * Implements strict anti-spoofing verification against published IP ranges
 * and Cloudflare verified-bot signals.
 *
 * CRITICAL RULE: A User-Agent match alone is NEVER classified as verified.
 */

import { isIpInCidrs } from "./cidr-matcher";
import { getPublishedCidrsForAgent } from "./published-ranges";

export type VerificationMethod =
  "ip_range" | "cloudflare_verified_bot" | "unverified";

export interface VerificationResult {
  verified: boolean;
  method: VerificationMethod;
  details: string;
}

export interface CloudflareCfProperties {
  clientBot?: boolean;
  botManagement?: {
    verifiedBot?: boolean;
    score?: number;
    corporateProxy?: boolean;
  };
  country?: string;
  asn?: number;
  asOrganization?: string;
}

/**
 * Verify whether an incoming request genuinely originates from the declared AI agent.
 *
 * Evaluation order:
 * 1. Test source IP against official published IP ranges for the specific agent.
 * 2. If no IP match or no published ranges, check Cloudflare's verified bot signal.
 * 3. If neither succeeds, classify as unverified (spoofed or untrusted proxy).
 */
export function verifyAiCrawler(
  agentName: string,
  clientIp: string | null | undefined,
  cf?: CloudflareCfProperties | null,
): VerificationResult {
  if (!agentName) {
    return {
      verified: false,
      method: "unverified",
      details: "No agent declared",
    };
  }

  // 1. Provider-published IP ranges check
  const publishedCidrs = getPublishedCidrsForAgent(agentName);
  if (clientIp && publishedCidrs.length > 0) {
    const isMatch = isIpInCidrs(clientIp, publishedCidrs);
    if (isMatch) {
      return {
        verified: true,
        method: "ip_range",
        details: `Source IP matched published CIDR for ${agentName}`,
      };
    }
  }

  // 2. Cloudflare verified-bot signal check
  const isCfVerified = Boolean(
    cf?.clientBot === true || cf?.botManagement?.verifiedBot === true,
  );
  if (isCfVerified) {
    return {
      verified: true,
      method: "cloudflare_verified_bot",
      details: "Verified via Cloudflare verified-bot signal",
    };
  }

  // 3. Fallback: User-Agent-only matches are always unverified
  return {
    verified: false,
    method: "unverified",
    details:
      "Unverified: source IP outside published ranges and no Cloudflare verified-bot signal",
  };
}
