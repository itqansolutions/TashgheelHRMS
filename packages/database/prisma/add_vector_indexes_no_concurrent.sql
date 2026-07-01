CREATE INDEX IF NOT EXISTS idx_candidates_embedding_hnsw
  ON candidates USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS idx_job_openings_embedding_hnsw
  ON job_openings USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
