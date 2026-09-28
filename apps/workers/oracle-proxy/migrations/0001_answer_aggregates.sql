-- Community answer-usefulness aggregates (spec 164).
-- Anonymous per-slug counters only. By design there is no column for voter
-- identity, IP, user agent, or reason text — that data must never be stored.
CREATE TABLE IF NOT EXISTS answer_aggregates (
  slug TEXT PRIMARY KEY,
  yes INTEGER NOT NULL DEFAULT 0,
  no INTEGER NOT NULL DEFAULT 0,
  views INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);
