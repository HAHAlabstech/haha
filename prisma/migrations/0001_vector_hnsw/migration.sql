-- HAHA vector extension + HNSW index (plan §6.2).
-- Applied via `prisma migrate deploy` from CI/laptop. The Prisma schema maps
-- Bit.embedding as Unsupported("vector(384)"); the index lives here, not in
-- schema.prisma. Cosine operator (<=>) matches the worker's L2-normalized
-- 384-dim embeddings (Xenova/all-MiniLM-L6-v2, q8).

CREATE EXTENSION IF NOT EXISTS vector;

CREATE INDEX IF NOT EXISTS bit_embedding_hnsw_idx
  ON "Bit" USING hnsw (embedding vector_cosine_ops);
