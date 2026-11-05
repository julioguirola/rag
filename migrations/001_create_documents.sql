CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE
    documents (
        id BIGSERIAL PRIMARY KEY,
        filename TEXT NOT NULL,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW()
    );

CREATE TABLE
    chunks (
        id BIGSERIAL PRIMARY KEY,
        document_id BIGINT NOT NULL REFERENCES documents (id) ON DELETE CASCADE,
        chunk_index INT NOT NULL, -- posición dentro del documento
        CONTENT TEXT NOT NULL, -- texto del chunk
        embedding vector (2000), -- ajusta a la dimensión de tu modelo
        UNIQUE (document_id, chunk_index)
    );

-- Índice para búsqueda por similitud coseno
CREATE INDEX ON chunks USING hnsw (embedding vector_cosine_ops);