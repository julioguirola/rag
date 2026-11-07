from dataclasses import dataclass

import psycopg
from psycopg import sql
from langchain_nvidia_ai_endpoints import Model, NVIDIAEmbeddings, register_model

from app.config import get_settings


@dataclass(frozen=True)
class RetrievedChunk:
    document_id: int
    chunk_index: int
    filename: str
    content: str


class Retriever:
    """Retrieve relevant document context from the PostgreSQL vector store."""

    def __init__(self) -> None:
        settings = get_settings()
        self.settings = settings
        register_model(
            Model(
                id=settings.embeddings_model,
                model_type="embedding",
                client="NVIDIAEmbeddings",
                endpoint="https://integrate.api.nvidia.com/v1/embeddings",
            )
        )
        self.embeddings = NVIDIAEmbeddings(
            model=settings.embeddings_model,
            api_key=settings.nvidia_api_key,
            dimensions=settings.embeddings_dimensions,
        )

    def _connect(self) -> psycopg.Connection:
        return psycopg.connect(
            host=self.settings.db_host,
            port=self.settings.db_port,
            dbname=self.settings.postgres_db,
            user=self.settings.postgres_user,
            password=self.settings.postgres_password,
        )

    def retrieve(self, question: str) -> list[RetrievedChunk]:
        embedding = self.embeddings.embed_query(question)
        if len(embedding) != self.settings.embeddings_dimensions:
            raise ValueError(
                f"El modelo devolvió {len(embedding)} dimensiones; "
                f"se esperaban {self.settings.embeddings_dimensions}"
            )

        embedding_value = "[" + ",".join(str(value) for value in embedding) + "]"
        with self._connect() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT c.document_id, c.chunk_index, d.filename, c.content
                    FROM chunks AS c
                    JOIN documents AS d ON d.id = c.document_id
                    WHERE embedding IS NOT NULL
                    ORDER BY c.embedding <=> %s::vector
                    LIMIT 10
                    """,
                    (embedding_value,),
                )
                nearest_chunks = [
                    RetrievedChunk(
                        document_id=document_id,
                        chunk_index=chunk_index,
                        filename=filename,
                        content=content,
                    )
                    for document_id, chunk_index, filename, content in cursor.fetchall()
                ]

                if not nearest_chunks:
                    return []

                parameters: list[int] = []
                for chunk in nearest_chunks:
                    parameters.extend(
                        [
                            chunk.document_id,
                            max(0, chunk.chunk_index - 3),
                            chunk.chunk_index + 3,
                        ]
                    )

                condition = sql.SQL(
                    "(document_id = %s AND chunk_index BETWEEN %s AND %s)"
                )
                cursor.execute(
                    sql.SQL("""
                        SELECT c.document_id, c.chunk_index, d.filename, c.content
                        FROM chunks AS c
                        JOIN documents AS d ON d.id = c.document_id
                        WHERE ({conditions})
                        ORDER BY c.document_id, c.chunk_index
                        """).format(
                        conditions=sql.SQL(" OR ").join(
                            [condition] * len(nearest_chunks)
                        )
                    ),
                    parameters,
                )
                return [
                    RetrievedChunk(
                        document_id=document_id,
                        chunk_index=chunk_index,
                        filename=filename,
                        content=content,
                    )
                    for document_id, chunk_index, filename, content in cursor.fetchall()
                ]

    def build_context(self, chunks: list[RetrievedChunk]) -> str:
        return "\n\n".join(
            f"[Archivo: {chunk.filename}]\n{chunk.content}" for chunk in chunks
        )
