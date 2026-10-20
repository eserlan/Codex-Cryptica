import type { CorsEnv } from "./cors";
import type { D1DatabaseLike } from "./answer-aggregates";

export interface Env extends CorsEnv {
  GEMINI_API_KEY: string;
  OPENAI_API_KEY?: string;
  ALLOWED_ORIGINS?: string;
  ALLOW_CLOUDFLARE_PAGES_PREVIEW_ORIGINS?: string;
  AI?: any;
  BUCKET?: any; // R2Bucket
  TURNSTILE_SECRET_KEY?: string;
  CODEX_AUTOMATION_KEY?: string;
  PUBLISH_CREATE_RATE_LIMITER?: {
    limit: (options: { key: string }) => Promise<{ success: boolean }>;
  };
  PUBLISH_WRITE_RATE_LIMITER?: {
    limit: (options: { key: string }) => Promise<{ success: boolean }>;
  };
  /** HMAC signing secret for LLM session capability tokens. */
  SESSION_TOKEN_SECRET?: string;
  LLM_BURST_RATE_LIMITER?: {
    limit: (options: { key: string }) => Promise<{ success: boolean }>;
  };
  LLM_GENERATION_RATE_LIMITER?: {
    limit: (options: { key: string }) => Promise<{ success: boolean }>;
  };
  LLM_AUTOMATION_RATE_LIMITER?: {
    limit: (options: { key: string }) => Promise<{ success: boolean }>;
  };
  TEMPLATE_ADMIN_TOKEN?: string;
  /** HMAC key for hashing reporter addresses. Reporting is off without it. */
  TEMPLATE_REPORT_HASH_KEY?: string;
  TEMPLATE_REPORT_RATE_LIMITER?: {
    limit: (options: { key: string }) => Promise<{ success: boolean }>;
  };
  ANSWER_AGGREGATES?: D1DatabaseLike;
  ANSWER_FEEDBACK_RATE_LIMITER?: {
    limit: (options: { key: string }) => Promise<{ success: boolean }>;
  };
  SHARE_CREATE_RATE_LIMITER?: {
    limit: (options: { key: string }) => Promise<{ success: boolean }>;
  };
}
