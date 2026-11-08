import json
import logging
import signal
import sys
import time
from io import BytesIO
from pathlib import Path
from tempfile import NamedTemporaryFile

import redis
from docx2txt import process as extract_docx_text
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_nvidia_ai_endpoints import Model, NVIDIAEmbeddings, register_model
from minio import Minio
from minio.error import S3Error
from pypdf import PdfReader
import psycopg

from app.config import get_settings
from app.monitoring import get_logger

settings = get_settings()
logger = get_logger()
logger.setLevel(getattr(logging, settings.log_level.upper(), logging.INFO))

redis_client = redis.from_url(settings.redis_url, decode_responses=True)
minio_client = Minio(
    settings.minio_endpoint,
    access_key=settings.minio_access_key,
    secret_key=settings.minio_secret_key,
    secure=settings.minio_secure,
)

register_model(
    Model(
        id=settings.embeddings_model,
        model_type="embedding",
        client="NVIDIAEmbeddings",
        endpoint="https://integrate.api.nvidia.com/v1/embeddings",
    )
)
embeddings_model = NVIDIAEmbeddings(
    model=settings.embeddings_model,
    api_key=settings.nvidia_api_key,
    dimensions=settings.embeddings_dimensions,
)
queue_name = settings.upload_queue_name
file_status_key = "file_processing_status"

running = True


def stop(signum, frame):
    global running
    running = False
    logger.info("Deteniendo listener de archivos...")


signal.signal(signal.SIGINT, stop)
signal.signal(signal.SIGTERM, stop)

logger.info(f"Listener de archivos iniciado. Esperando en la cola: {queue_name} ...")


def load_file_text(bucket: str, object_name: str, content_type: str) -> str:
    response = minio_client.get_object(bucket, object_name)
    try:
        content = response.read()
    finally:
        response.close()
        response.release_conn()

    if content_type == "application/pdf":
        return "\n".join(
            page.extract_text() or "" for page in PdfReader(BytesIO(content)).pages
        )

    if content_type in {
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword",
    }:
        with NamedTemporaryFile(suffix=Path(object_name).suffix) as file:
            file.write(content)
            file.flush()
            return extract_docx_text(file.name)

    return content.decode("utf-8")


def retry_missing_embeddings(document_id: int) -> None:
    logger.info(f"Reintentando embeddings del documento {document_id}")
    redis_client.hset(file_status_key, str(document_id), "processing")
    with psycopg.connect(
        host=settings.db_host,
        port=settings.db_port,
        dbname=settings.postgres_db,
        user=settings.postgres_user,
        password=settings.postgres_password,
    ) as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT id, chunk_index, content
                FROM chunks
                WHERE document_id = %s AND embedding IS NULL
                ORDER BY chunk_index
                """,
                (document_id,),
            )
            chunks = cursor.fetchall()
            embeddings_enabled = True

            for chunk_id, chunk_index, chunk in chunks:
                embedding_value = None
                if embeddings_enabled:
                    try:
                        embedding = embeddings_model.embed_query(chunk)
                        if len(embedding) != settings.embeddings_dimensions:
                            raise ValueError(
                                f"El modelo devolvió {len(embedding)} dimensiones; "
                                f"se esperaban {settings.embeddings_dimensions}"
                            )
                        embedding_value = (
                            "[" + ",".join(str(value) for value in embedding) + "]"
                        )
                    except Exception:
                        embeddings_enabled = False
                        logger.exception(
                            "Falló el reintento de embeddings; los chunks "
                            "restantes permanecerán sin embedding"
                        )

                if embedding_value is not None:
                    logger.info(
                        f"Chunk {chunk_index} del documento {document_id} procesado"
                    )
                    cursor.execute(
                        """
                        UPDATE chunks
                        SET embedding = %s
                        WHERE id = %s AND embedding IS NULL
                        """,
                        (embedding_value, chunk_id),
                    )
                connection.commit()
                if embeddings_enabled:
                    time.sleep(1)

    redis_client.hdel(file_status_key, str(document_id))
    logger.info(
        "Reintento de embeddings finalizado",
        extra={
            "extra_data": {
                "document_id": document_id,
                "chunks": len(chunks),
            }
        },
    )


def process_file(payload: dict) -> None:
    filename = payload.get("filename", "desconocido")
    logger.info(f"Procesando: {filename}")
    text = load_file_text(
        payload["bucket"],
        payload["object_name"],
        payload.get("content_type", ""),
    )
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=50,
        separators=["\n\n", "\n", " ", ""],
    )
    chunks = splitter.split_text(text)
    with psycopg.connect(
        host=settings.db_host,
        port=settings.db_port,
        dbname=settings.postgres_db,
        user=settings.postgres_user,
        password=settings.postgres_password,
    ) as connection:
        with connection.cursor() as cursor:
            document_id = payload.get("document_id")
            if document_id is None:
                raise RuntimeError(f"El archivo '{filename}' no tiene un document_id")
            cursor.execute(
                """
                UPDATE documents
                SET metadata = metadata || %s::jsonb
                WHERE id = %s
                """,
                (json.dumps({"total_chunks": len(chunks)}), document_id),
            )
            if cursor.rowcount != 1:
                raise RuntimeError(
                    f"No se encontró el documento {document_id} para '{filename}'"
                )
            connection.commit()
            redis_client.hset(file_status_key, str(document_id), "processing")
            embeddings_enabled = True

            for chunk_index, chunk in enumerate(chunks):
                logger.info(f"Procesando chunck {chunk_index}: {chunk[:10]}...")
                embedding_value = None
                if embeddings_enabled:
                    try:
                        embedding = embeddings_model.embed_query(chunk)
                        if len(embedding) != settings.embeddings_dimensions:
                            raise ValueError(
                                f"El modelo devolvió {len(embedding)} dimensiones; "
                                f"se esperaban {settings.embeddings_dimensions}"
                            )
                        embedding_value = (
                            "[" + ",".join(str(value) for value in embedding) + "]"
                        )
                    except Exception:
                        embeddings_enabled = False
                        logger.exception(
                            "Falló el modelo de embeddings; el chunk actual y "
                            "los siguientes se guardarán sin embedding"
                        )

                cursor.execute(
                    """
                    INSERT INTO chunks (document_id, chunk_index, content, embedding)
                    VALUES (%s, %s, %s, %s)
                    """,
                    (
                        document_id,
                        chunk_index,
                        chunk,
                        embedding_value,
                    ),
                )
                connection.commit()
                if embeddings_enabled:
                    time.sleep(1)

            redis_client.hdel(file_status_key, str(document_id))
    logger.info(
        "Archivo procesado",
        extra={
            "extra_data": {
                "filename": filename,
                "chunks": len(chunks),
            }
        },
    )


while running:
    # Bloquea hasta que llegue un archivo a la cola.
    # La API empuja con lpush (cabeza), por lo que brpop lee por la cola (FIFO).
    item = redis_client.brpop(queue_name, timeout=1)
    if item is None:
        continue

    _, payload_json = item
    try:
        payload = json.loads(payload_json)
        is_retry = payload.get("type") == "retry_embeddings" or (
            "document_id" in payload and "bucket" not in payload
        )
        if is_retry:
            retry_missing_embeddings(payload["document_id"])
        else:
            process_file(payload)
    except (
        json.JSONDecodeError,
        TypeError,
        KeyError,
        UnicodeDecodeError,
        OSError,
        S3Error,
        psycopg.Error,
        RuntimeError,
        ValueError,
    ) as e:
        logger.error(f"Error al procesar mensaje de la cola: {e}")

logger.info("Listener de archivos detenido.")
sys.exit(0)
