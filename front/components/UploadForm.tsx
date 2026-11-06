import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { api } from "@/lib/axios";

type UploadFormProps = {
  onUploaded?: () => void;
};

export function UploadForm({ onUploaded }: UploadFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<
    "idle" | "uploading" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
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

      if (!encolado) {
        setStatus("success");
        setMessage(
          `Subido: ${data.filename} (${file.size} bytes) — aviso: no se encoló para procesamiento`,
        );
        onUploaded?.();
        return;
      }

      setStatus("success");
      setMessage(`Subido: ${data.filename} (${file.size} bytes)`);
      onUploaded?.();
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Error al subir");
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Subir archivo</CardTitle>
        <CardDescription>
          El archivo se envía directamente al almacenamiento; el backend solo
          genera el link.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <input
          ref={inputRef}
          type="file"
          onChange={handleSelect}
          className="hidden"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
        />
        <Button
          variant="outline"
          onClick={() => inputRef.current?.click()}
          type="button"
        >
          Seleccionar archivo
        </Button>
        {file && (
          <p className="text-sm text-muted-foreground truncate">
            Archivo: {file.name} ({file.size} bytes)
          </p>
        )}
        <Button
          onClick={handleUpload}
          disabled={!file || status === "uploading"}
        >
          {status === "uploading"
            ? "Subiendo directamente..."
            : "Subir archivo"}
        </Button>
        {message && (
          <p
            className={cn(
              "text-sm",
              status === "success" ? "text-green-600" : "text-destructive",
            )}
          >
            {message}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
