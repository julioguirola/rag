import json
import logging
import signal
import sys
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
            cursor.execute(
                """
                INSERT INTO documents (filename)
                VALUES (%s)
                RETURNING id
                """,
                (filename,),
            )
            document_row = cursor.fetchone()
            if document_row is None:
                raise RuntimeError(
                    f"No se pudo obtener el id del documento '{filename}'"
                )
            document_id = document_row[0]

            for chunk_index, chunk in enumerate(chunks):
                logger.info(f"Procesando chunck {chunk_index}: {chunk[:10]}...")
                embedding = embeddings_model.embed_query(chunk)
                if len(embedding) != settings.embeddings_dimensions:
                    raise ValueError(
                        f"El modelo devolvió {len(embedding)} dimensiones; "
                        f"se esperaban {settings.embeddings_dimensions}"
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
                        "[" + ",".join(str(value) for value in embedding) + "]",
                    ),
                )

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
