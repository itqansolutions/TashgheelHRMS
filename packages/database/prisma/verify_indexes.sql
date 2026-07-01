SELECT
  indexname,
  tablename,
  indexdef
FROM pg_indexes
WHERE indexname IN (
  'idx_candidates_embedding_hnsw',
  'idx_job_openings_embedding_hnsw'
);
