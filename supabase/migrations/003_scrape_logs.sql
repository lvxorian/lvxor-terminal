CREATE TABLE IF NOT EXISTS scrape_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  query TEXT,
  region TEXT,
  locality TEXT,
  category TEXT,
  include_details BOOLEAN DEFAULT TRUE,
  max_results INTEGER DEFAULT 200,
  total_found INTEGER,
  without_web INTEGER,
  new_leads INTEGER,
  duplicates INTEGER,
  imported INTEGER DEFAULT 0,
  run_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_scrape_logs_created_at ON scrape_logs (created_at DESC);

ALTER TABLE scrape_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on scrape_logs" ON scrape_logs FOR ALL USING (true) WITH CHECK (true);