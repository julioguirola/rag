import json
import signal
import sys

import redis

from app.config import get_settings
from app.monitoring import get_logger

settings = get_settings()
logger = get_logger()

redis_client = redis.from_url(settings.redis_url, decode_responses=True)
queue_name = settings.upload_queue_name

running = True


def stop(signum, frame):
    global running
    running = False
    logger.info("Deteniendo listener de archivos...")


signal.signal(signal.SIGINT, stop)
signal.signal(signal.SIGTERM, stop)

logger.info(f"Listener de archivos iniciado. Esperando en la cola: {queue_name} ...")

while running:
    # Bloquea hasta que llegue un archivo a la cola.
    # La API empuja con lpush (cabeza), por lo que brpop lee por la cola (FIFO).
    item = redis_client.brpop(queue_name, timeout=1)
    if item is None:
        continue

    _, payload_json = item
    try:
        payload = json.loads(payload_json)
        filename = payload.get("filename", "desconocido")
        logger.info(f"{filename} procesado .. ")
    except (json.JSONDecodeError, TypeError) as e:
        logger.error(f"Error al procesar mensaje de la cola: {e}")

logger.info("Listener de archivos detenido.")
sys.exit(0)
