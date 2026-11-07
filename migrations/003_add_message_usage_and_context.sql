ALTER TABLE messages
    ADD COLUMN input_tokens INTEGER,
    ADD COLUMN output_tokens INTEGER,
    ADD COLUMN context_usage_percent DOUBLE PRECISION,
    ADD COLUMN output_usage_percent DOUBLE PRECISION,
    ADD COLUMN retrieval_context JSONB NOT NULL DEFAULT '[]'::jsonb;
