-- Anonymous adventure artwork cue demand aggregates.
-- Tracks normalized & unmapped cue tuples (never player names, place names,
-- narration, or vault/session IDs) so we can see which locations, NPCs,
-- scenes, atmospheres, and monsters need artwork.
CREATE TABLE IF NOT EXISTS artwork_cue_demand (
  signature TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  genre TEXT NOT NULL,
  known_cues TEXT NOT NULL,
  unmapped_cues TEXT NOT NULL,
  demographic_cues TEXT NOT NULL,
  matched_asset_id TEXT,
  hit_count INTEGER NOT NULL DEFAULT 1,
  last_seen_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_artwork_cue_demand_misses
  ON artwork_cue_demand (matched_asset_id, type, genre, hit_count DESC);
