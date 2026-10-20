export const REDACTION_MARKER = "[removed: possible secret]";

const PATTERNS: RegExp[] = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
  /\bsk-[A-Za-z0-9_-]{16,}/g,
  /\b(?:ghp|gho|ghs|ghu)_[A-Za-z0-9]{20,}\b/g,
  /\bgithub_pat_[A-Za-z0-9_]{20,}\b/g,
  /\bAKIA[0-9A-Z]{16}\b/g,
  /\bAIza[0-9A-Za-z_-]{35}\b/g,
  /\bBearer\s+[A-Za-z0-9._~+/-]{8,}=*/gi,
  /\beyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\b/g,
  /\b(?:password|passwd|pwd|secret|token|api[ _-]?key)\s*[:=]\s*\S+/gi,
  /\b[0-9a-f]{40,}\b/gi,
  /\b[A-Za-z0-9+/]{48,}={0,2}/g,
];

/** Replaces recognisable secrets. The rest of the text is left exactly as written. */
export function redactSecrets(text: string): string {
  return PATTERNS.reduce(
    (out, pattern) => out.replace(pattern, REDACTION_MARKER),
    text,
  );
}
