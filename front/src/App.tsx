import { useCallback, useEffect, useState } from "react";
import {
  RiLoader4Line,
  RiRefreshLine,
  RiTimeLine,
} from "@remixicon/react";
import { UploadForm } from "@/components/UploadForm";
import { api } from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type DocumentProgress = {
  id: number;
  filename: string;
  processed_chunks: number;
  total_chunks: number;
  progress_percentage: number;
  status: "queued" | "processing" | "completed" | "retryable";
  created_at: string;
};

function App() {
  const [documents, setDocuments] = useState<DocumentProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retrying, setRetrying] = useState<number[]>([]);

  const loadDocuments = useCallback(async () => {
    try {
      const { data } = await api.get<DocumentProgress[]>("/documents");
      setDocuments(data);
      setError("");
    } catch {
      setError("No se pudo cargar el progreso de los archivos.");
    } finally {
      setLoading(false);
    }
  }, []);

  const retryEmbeddings = async (documentId: number) => {
    setRetrying((current) => [...current, documentId]);
    try {
      await api.post(`/documents/${documentId}/retry-embeddings`);
      await loadDocuments();
    } catch {
      setError("No se pudo encolar el reintento de embeddings.");
    } finally {
      setRetrying((current) => current.filter((id) => id !== documentId));
    }
  };

  useEffect(() => {
    void loadDocuments();
    const interval = window.setInterval(() => void loadDocuments(), 3000);
    return () => window.clearInterval(interval);
  }, [loadDocuments]);

  return (
    <main className="min-h-screen bg-muted/30 p-6 md:p-10">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-primary">RAG Workspace</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">
              Archivos
            </h1>
            <p className="mt-2 text-muted-foreground">
              Consulta el progreso de procesamiento de tus documentos.
            </p>
          </div>
          <Dialog>
            <DialogTrigger render={<Button>Nuevo archivo</Button>} />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Subir nuevo archivo</DialogTitle>
                <DialogDescription>
                  El archivo se procesará después de completar la subida.
                </DialogDescription>
              </DialogHeader>
              <UploadForm onUploaded={() => void loadDocuments()} />
            </DialogContent>
          </Dialog>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Procesamiento</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="py-8 text-center text-muted-foreground">
                Cargando archivos...
              </p>
            ) : error ? (
              <p className="py-8 text-center text-destructive">{error}</p>
            ) : documents.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">
                Todavía no hay archivos guardados.
              </p>
            ) : (
              <div className="divide-y">
                {documents.map((document) => (
                  <div
                    key={document.id}
                    className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {document.filename}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {document.processed_chunks} de {document.total_chunks}{" "}
                        chunks
                      </p>
                    </div>
                    <div className="flex w-full shrink-0 items-center gap-3 sm:w-64">
                      <div className="w-full">
                        <div className="mb-1 flex justify-end text-sm font-medium">
                          {document.progress_percentage}%
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-secondary">
                          <div
                            className="h-full rounded-full bg-primary transition-[width]"
                            style={{
                              width: `${document.progress_percentage}%`,
                            }}
                          />
                        </div>
                      </div>
                      {document.progress_percentage >= 100 ? null : document.status === "queued" ? (
                        <RiTimeLine
                          className="size-4 text-muted-foreground"
                          aria-label="En cola"
                        />
                      ) : document.status === "processing" ||
                        retrying.includes(document.id) ? (
                        <RiLoader4Line
                          className="size-4 animate-spin text-muted-foreground"
                          aria-label="Procesando"
                        />
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          type="button"
                          title="Reintentar embeddings"
                          aria-label={`Reintentar embeddings de ${document.filename}`}
                          onClick={() => void retryEmbeddings(document.id)}
                        >
                          <RiRefreshLine />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

export default App;
