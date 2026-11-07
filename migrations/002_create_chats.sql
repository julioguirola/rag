CREATE TABLE
    chats (
        id BIGSERIAL PRIMARY KEY,
        title TEXT NOT NULL DEFAULT 'Nuevo chat',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

CREATE TABLE
    messages (
        id BIGSERIAL PRIMARY KEY,
        chat_id BIGINT NOT NULL REFERENCES chats (id) ON DELETE CASCADE,
        user_input TEXT NOT NULL,
        ai_response TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

CREATE INDEX messages_chat_id_created_at_idx
    ON messages (chat_id, created_at, id);
