"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  RiLoader4Line,
  RiRefreshLine,
  RiTimeLine,
  RiHomeLine,
  RiFileLine,
  RiDatabase2Line,
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
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Home } from "@/src/pages/Home";

type DocumentProgress = {
  id: number;
  filename: string;
  processed_chunks: number;
  total_chunks: number;
  progress_percentage: number;
  status: "queued" | "processing" | "completed" | "retryable";
  created_at: string;
};

function DocumentsView() {
  const [documents, setDocuments] = useState<DocumentProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
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
    <div className="flex h-full w-full flex-col">
      <header className="mb-8 flex items-start justify-between gap-4 border-b pb-4">
        <div>
          <p className="text-sm font-medium text-primary">RAG Workspace</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            Archivos
          </h1>
          <p className="mt-2 text-muted-foreground">
            Consulta el progreso de procesamiento de tus documentos.
          </p>
        </div>
        <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
          <DialogTrigger render={<Button>Nuevo archivo</Button>} />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Subir nuevo archivo</DialogTitle>
              <DialogDescription>
                El archivo se procesará después de completar la subida.
              </DialogDescription>
            </DialogHeader>
            <UploadForm
              onUploaded={() => {
                setUploadDialogOpen(false);
                void loadDocuments();
              }}
            />
          </DialogContent>
        </Dialog>
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:p-6">
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
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <RiDatabase2Line className="mb-4 size-6 text-muted-foreground" />
                <p className="text-muted-foreground">
                  Todavía no hay archivos guardados.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-muted">
                {documents.map((document) => (
                  <div
                    key={document.id}
                    className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 flex flex-col gap-1">
                      <p className="truncate font-medium leading-none">
                        {document.filename}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {document.processed_chunks} de {document.total_chunks}{" "}
                        chunks
                      </p>
                    </div>
                    <div className="flex w-full shrink-0 items-center gap-3 sm:w-64 pt-4 sm:pt-0">
                      <div className="w-full">
                        <div className="mb-1.5 flex justify-end text-sm font-medium text-muted-foreground">
                          {document.progress_percentage}%
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                          <div
                            className="h-full rounded-full bg-primary transition-[width]"
                            style={{
                              width: `${document.progress_percentage}%`,
                            }}
                          />
                        </div>
                      </div>
                      {document.progress_percentage >=
                      100 ? null : document.status === "queued" ? (
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
    </div>
  );
}

function AppRouter() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="flex h-svh">
      <SidebarProvider defaultOpen={true}>
        <Sidebar side="left" className="border-r">
          <SidebarTrigger />
          <SidebarGroup className="mb-4">
            <SidebarGroupLabel>RAG</SidebarGroupLabel>
            <SidebarSeparator />
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={location.pathname === "/"}
                  onClick={() => navigate("/")}
                >
                  <RiHomeLine className="size-4" />
                  Home
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={location.pathname === "/archivos"}
                  onClick={() => navigate("/archivos")}
                >
                  <RiFileLine className="size-4" />
                  Subir archivo
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        </Sidebar>
        <SidebarRail />
        <SidebarContent className="flex-1 bg-background min-w-0">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/archivos" element={<DocumentsView />} />
          </Routes>
        </SidebarContent>
      </SidebarProvider>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRouter />
    </BrowserRouter>
  );
}
