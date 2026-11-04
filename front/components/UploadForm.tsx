import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export function UploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
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
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${API_URL}/upload`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Error ${res.status}`);
      }
      const data = await res.json();
      setStatus("success");
      setMessage(`Subido: ${data.filename} (${data.size} bytes)`);
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Error al subir");
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Subir archivo</CardTitle>
        <CardDescription>Selecciona un archivo de tu PC y envíalo al backend.</CardDescription>
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
          <p className="text-sm text-muted-foreground truncate">Archivo: {file.name}</p>
        )}
        <Button
          onClick={handleUpload}
          disabled={!file || status === "uploading"}
        >
          {status === "uploading" ? "Subiendo..." : "Enviar al backend"}
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