import { useRef, useState, type ChangeEvent } from "react";
import {
  RiCheckLine,
  RiCloseLine,
  RiFileTextLine,
  RiInformationLine,
  RiLoader4Line,
  RiUploadCloud2Line,
} from "@remixicon/react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { api } from "@/lib/axios";

type UploadFormProps = {
  onUploaded?: () => void;
};

function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const units = ["KB", "MB", "GB"];
  let size = bytes / 1024;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[unitIndex]}`;
}

export function UploadForm({ onUploaded }: UploadFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<
    "idle" | "uploading" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    setFile(selected);
    setStatus("idle");
    setMessage("");
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage("Selecciona un archivo primero.");
      setStatus("error");
      return;
    }

    setStatus("uploading");
    setMessage("");

    try {
      // 1. Pedir al backend una URL firmada para subir directamente al almacenamiento (MinIO).
      // El archivo NO pasa por el backend; el backend solo crea el link.
      const { data } = await api.post("/upload/presigned-url", {
        filename: file.name,
        content_type: file.type,
      });

      // 2. Subir el archivo directamente a MinIO mediante la URL firmada (no pasa por el backend).
      // La URL es absoluta, por lo que el cliente de axios la usa tal cual (ignora baseURL).
      await api.put(data.upload_url, file, {
        headers: { "Content-Type": data.content_type },
      });

      // 3. Notificar al backend para encolar el archivo en el procesamiento posterior (opcional).
      let encolado = true;
      try {
        await api.post("/upload/complete", {
          object_name: data.object_name,
          filename: data.filename,
          content_type: data.content_type,
          size: file.size,
        });
      } catch {
        // El archivo ya se subió correctamente; solo falló el encolado.
        encolado = false;
      }

      setStatus("success");
      setMessage(
        encolado
          ? `Subido: ${data.filename}`
          : `Subido: ${data.filename} — aviso: no se encoló para procesamiento`,
      );
      onUploaded?.();
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Error al subir");
    }
  };

  const clearFile = () => {
    setFile(null);
    setStatus("idle");
    setMessage("");
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <div className="w-full min-w-0 max-w-full space-y-5">
      <div className="rounded-2xl border border-dashed border-primary/30 bg-primary/3 p-5 sm:p-6">
        <input
          ref={inputRef}
          type="file"
          onChange={handleSelect}
          className="hidden"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
        />
        <div className="flex flex-col items-center text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <RiUploadCloud2Line className="size-7" />
          </div>
          <p className="mt-4 font-medium">Selecciona un archivo para subir</p>
          <p className="mt-1 max-w-xs text-sm leading-5 text-muted-foreground">
            Formatos compatibles: PDF, DOCX, XLSX y TXT.
          </p>
          <Button
            variant="outline"
            className="mt-5"
            onClick={() => inputRef.current?.click()}
            type="button"
          >
            <RiUploadCloud2Line />
            Explorar archivos
          </Button>
        </div>
      </div>

      {file && (
        <div className="flex w-full min-w-0 max-w-full items-center gap-3 overflow-hidden rounded-xl border border-border/70 bg-muted/30 p-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-background text-primary shadow-sm">
            <RiFileTextLine className="size-5" />
          </div>
          <div className="min-w-0 flex-1 overflow-hidden">
            <p
              className="block min-w-0 truncate text-sm font-medium"
              title={file.name}
            >
              {file.name}
            </p>
            <div className="mt-1 flex min-w-0 items-center gap-2 overflow-hidden text-xs text-muted-foreground">
              <Badge variant="secondary" className="shrink-0">
                {file.name.split(".").pop()?.toUpperCase() ?? "ARCHIVO"}
              </Badge>
              <span className="shrink-0">{formatFileSize(file.size)}</span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            type="button"
            onClick={clearFile}
            aria-label="Quitar archivo seleccionado"
            title="Quitar archivo"
          >
            <RiCloseLine />
          </Button>
        </div>
      )}

      <div className="flex items-start gap-2 rounded-xl bg-muted/50 px-3 py-2.5 text-xs leading-5 text-muted-foreground">
        <RiInformationLine className="mt-0.5 size-4 shrink-0 text-primary" />
        <p>
          El archivo se envía directamente al almacenamiento. El backend solo
          genera el enlace y coordina su procesamiento.
        </p>
      </div>

      <Button
        onClick={handleUpload}
        disabled={!file || status === "uploading"}
        className="w-full"
      >
        {status === "uploading" ? (
          <>
            <RiLoader4Line className="animate-spin" />
            Subiendo archivo...
          </>
        ) : (
          <>
            <RiUploadCloud2Line />
            Subir archivo
          </>
        )}
      </Button>

      {message && (
        <div
          className={cn(
            "flex items-start gap-2 rounded-xl border px-3 py-2.5 text-sm",
            status === "success"
              ? "border-primary/20 bg-primary/10 text-primary"
              : "border-destructive/20 bg-destructive/10 text-destructive",
          )}
          role={status === "success" ? "status" : "alert"}
        >
          {status === "success" ? (
            <RiCheckLine className="mt-0.5 size-4 shrink-0" />
          ) : (
            <RiInformationLine className="mt-0.5 size-4 shrink-0" />
          )}
          <p>{message}</p>
        </div>
      )}
    </div>
  );
}
