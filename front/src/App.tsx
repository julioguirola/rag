"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  RiAddLine,
  RiAlertLine,
  RiCheckLine,
  RiChat1Line,
  RiDatabase2Line,
  RiFileLine,
  RiFileTextLine,
  RiHomeLine,
  RiLoader4Line,
  RiRefreshLine,
  RiSparkling2Line,
  RiTimeLine,
} from "@remixicon/react";
import {
  BrowserRouter,
  NavLink,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";

import { UploadForm } from "@/components/UploadForm";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { api } from "@/lib/axios";
import { Home } from "@/src/pages/Home";
import { Chat } from "@/src/pages/Chat";

type DocumentProgress = {
  id: number;
  filename: string;
  processed_chunks: number;
  total_chunks: number;
  progress_percentage: number;
  status: "queued" | "processing" | "completed" | "retryable";
  created_at: string;
};

const statusDetails = {
  queued: {
    label: "En cola",
    icon: RiTimeLine,
    className: "border-amber-500/20 bg-amber-500/10 text-amber-700",
  },
  processing: {
    label: "Procesando",
    icon: RiLoader4Line,
    className: "border-primary/20 bg-primary/10 text-primary",
  },
  completed: {
    label: "Completado",
    icon: RiCheckLine,
    className: "border-primary/20 bg-primary/10 text-primary",
  },
  retryable: {
    label: "Reintentar",
    icon: RiAlertLine,
    className: "border-destructive/20 bg-destructive/10 text-destructive",
  },
} as const;

function DocumentStatus({
  status,
  retrying = false,
}: {
  status: DocumentProgress["status"];
  retrying?: boolean;
}) {
  const detail = statusDetails[status];
  const Icon = retrying ? RiLoader4Line : detail.icon;
  const isSpinning = status === "processing" || retrying;

  return (
    <Badge variant="outline" className={detail.className}>
      <Icon className={isSpinning ? "animate-spin" : undefined} />
      {retrying ? "Reintentando" : detail.label}
    </Badge>
  );
}

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
    setError("");
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

  const summary = useMemo(
    () => ({
      active: documents.filter(
        (document) =>
          document.status === "queued" || document.status === "processing",
      ).length,
      chunks: documents.reduce(
        (total, document) => total + document.processed_chunks,
        0,
      ),
    }),
    [documents],
  );

  return (
    <div className="min-h-full">
      <div className="mx-auto w-full max-w-7xl space-y-8 p-4 sm:p-6 lg:space-y-10 lg:p-10">
        <header className="flex flex-col gap-6 border-b border-border/70 pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className="border-primary/20 bg-primary/10 text-primary"
              >
                <RiDatabase2Line />
                Biblioteca
              </Badge>
              <span className="text-xs text-muted-foreground">
                Actualización automática
              </span>
            </div>
            <h1 className="mt-4 font-heading text-4xl font-semibold tracking-tight sm:text-5xl">
              Tus archivos
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-6 text-muted-foreground">
              Sigue el progreso de indexación y prepara tus documentos para
              hacer consultas con contexto.
            </p>
          </div>

          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogTrigger
              render={
                <Button size="lg" className="w-full sm:w-auto">
                  <RiAddLine />
                  Nuevo archivo
                </Button>
              }
            />
            <DialogContent className="min-w-0 overflow-hidden sm:max-w-lg">
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

        <section
          aria-label="Resumen de documentos"
          className="grid gap-4 sm:grid-cols-3"
        >
          <Card size="sm" className="bg-card/80">
            <CardContent className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Archivos</p>
                <p className="mt-2 font-heading text-3xl font-semibold tracking-tight">
                  {documents.length}
                </p>
              </div>
              <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <RiFileLine className="size-5" />
              </div>
            </CardContent>
          </Card>
          <Card size="sm" className="bg-card/80">
            <CardContent className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">En proceso</p>
                <p className="mt-2 font-heading text-3xl font-semibold tracking-tight">
                  {summary.active}
                </p>
              </div>
              <div className="flex size-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-700">
                <RiLoader4Line className="size-5" />
              </div>
            </CardContent>
          </Card>
          <Card size="sm" className="bg-card/80">
            <CardContent className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">
                  Chunks procesados
                </p>
                <p className="mt-2 font-heading text-3xl font-semibold tracking-tight">
                  {summary.chunks}
                </p>
              </div>
              <div className="flex size-11 items-center justify-center rounded-xl bg-sky-500/10 text-sky-700">
                <RiDatabase2Line className="size-5" />
              </div>
            </CardContent>
          </Card>
        </section>

        <Card>
          <CardHeader className="border-b border-border/70">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="text-xl">Procesamiento</CardTitle>
                <CardDescription className="mt-1">
                  El estado de cada archivo se actualiza automáticamente.
                </CardDescription>
              </div>
              <Badge variant="secondary">
                {documents.length}{" "}
                {documents.length === 1 ? "archivo" : "archivos"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-14 text-center text-muted-foreground">
                <RiLoader4Line className="size-6 animate-spin text-primary" />
                <p>Cargando archivos...</p>
              </div>
            ) : error ? (
              <div
                className="flex flex-col items-center justify-center gap-4 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-10 text-center"
                role="alert"
              >
                <RiAlertLine className="size-6 text-destructive" />
                <p className="text-sm text-destructive">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void loadDocuments()}
                >
                  Reintentar
                </Button>
              </div>
            ) : documents.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border px-4 py-14 text-center">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <RiFileTextLine className="size-7" />
                </div>
                <h2 className="mt-4 font-heading text-lg font-semibold">
                  Tu biblioteca está vacía
                </h2>
                <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                  Sube tu primer documento para empezar a construir tu espacio
                  de conocimiento.
                </p>
                <Button
                  className="mt-6"
                  onClick={() => setUploadDialogOpen(true)}
                >
                  <RiAddLine />
                  Subir primer archivo
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {documents.map((document) => {
                  const progress = Math.min(
                    100,
                    Math.max(0, document.progress_percentage),
                  );
                  const isComplete =
                    progress >= 100 || document.status === "completed";
                  const isRetrying = retrying.includes(document.id);

                  return (
                    <div
                      key={document.id}
                      className="group rounded-xl border border-border/70 bg-background/70 p-4 transition-colors hover:border-primary/30 hover:bg-muted/20"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-6">
                        <div className="flex min-w-0 flex-1 items-start gap-3">
                          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                            <RiFileTextLine className="size-5" />
                          </div>
                          <div className="min-w-0">
                            <p
                              className="truncate font-medium"
                              title={document.filename}
                            >
                              {document.filename}
                            </p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {document.processed_chunks} de{" "}
                              {document.total_chunks} chunks
                            </p>
                          </div>
                        </div>

                        <div className="w-full shrink-0 lg:w-72">
                          <div className="mb-2 flex items-center justify-between gap-3 text-xs font-medium text-muted-foreground">
                            <span>{isComplete ? "Listo" : "Progreso"}</span>
                            <span>{progress}%</span>
                          </div>
                          <div
                            className="h-2 overflow-hidden rounded-full bg-secondary"
                            role="progressbar"
                            aria-label={`Progreso de ${document.filename}`}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-valuenow={progress}
                          >
                            <div
                              className="h-full rounded-full bg-primary transition-[width] duration-500"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center justify-between gap-3 lg:w-32 lg:justify-end">
                          {isComplete ? (
                            <DocumentStatus status="completed" />
                          ) : document.status === "retryable" && !isRetrying ? (
                            <Button
                              variant="outline"
                              size="sm"
                              type="button"
                              onClick={() => void retryEmbeddings(document.id)}
                            >
                              <RiRefreshLine />
                              Reintentar
                            </Button>
                          ) : (
                            <DocumentStatus
                              status={document.status}
                              retrying={isRetrying}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
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
  const isDocumentsRoute = location.pathname === "/archivos";
  const isChatRoute = location.pathname === "/chat";
  const pageMeta = isDocumentsRoute
    ? {
        eyebrow: "Biblioteca",
        title: "Tus archivos",
        description: "Gestiona tus documentos y su progreso de indexación.",
      }
    : isChatRoute
      ? {
          eyebrow: "Asistente",
          title: "Chat",
          description: "Conversa con el agente de IA.",
        }
    : {
        eyebrow: "Espacio de trabajo",
        title: "Inicio",
        description: "Consulta, indexa y explora tu documentación.",
      };

  return (
    <SidebarProvider defaultOpen>
      <Sidebar collapsible="icon" className="border-sidebar-border/60">
        <SidebarHeader className="border-b border-sidebar-border/60 p-4">
          <div className="flex items-center gap-3 px-1">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground shadow-sm">
              <RiSparkling2Line className="size-5" />
            </div>
            <div className="min-w-0 group-data-[collapsible=icon]:hidden">
              <p className="truncate font-heading text-base font-semibold tracking-tight">
                RAG Studio
              </p>
              <p className="truncate text-xs text-sidebar-foreground/60">
                Conocimiento en contexto
              </p>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup className="px-3 py-6">
            <SidebarGroupLabel className="px-3 text-[0.65rem] tracking-[0.18em] text-sidebar-foreground/50 uppercase">
              Workspace
            </SidebarGroupLabel>
            <SidebarMenu className="gap-1">
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<NavLink to="/" />}
                  isActive={location.pathname === "/"}
                  tooltip="Inicio"
                  className="h-11 rounded-xl px-3 text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground data-active:bg-sidebar-primary/10 data-active:text-sidebar-primary"
                >
                  <RiHomeLine className="size-4" />
                  <span>Inicio</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<NavLink to="/archivos" />}
                  isActive={isDocumentsRoute}
                  tooltip="Archivos"
                  className="h-11 rounded-xl px-3 text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground data-active:bg-sidebar-primary/10 data-active:text-sidebar-primary"
                >
                  <RiFileLine className="size-4" />
                  <span>Archivos</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<NavLink to="/chat" />}
                  isActive={isChatRoute}
                  tooltip="Chat"
                  className="h-11 rounded-xl px-3 text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground data-active:bg-sidebar-primary/10 data-active:text-sidebar-primary"
                >
                  <RiChat1Line className="size-4" />
                  <span>Chat</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="border-t border-sidebar-border/60 p-4 group-data-[collapsible=icon]:p-2">
          <div className="flex items-center gap-3 rounded-xl bg-sidebar-accent/70 px-3 py-3 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
            <span className="size-2 shrink-0 rounded-full bg-sidebar-primary shadow-[0_0_0_4px_color-mix(in_oklch,var(--sidebar-primary),transparent_85%)]" />
            <div className="min-w-0 group-data-[collapsible=icon]:hidden">
              <p className="text-xs font-medium">Sistema operativo</p>
              <p className="mt-0.5 truncate text-[0.7rem] text-sidebar-foreground/60">
                Procesamiento activo
              </p>
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarRail />

      <SidebarInset className="min-h-svh w-0 min-w-0 flex-1 bg-muted/20">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border/70 bg-background/85 px-4 backdrop-blur-md sm:px-6 lg:px-10">
          <SidebarTrigger className="rounded-xl border border-border/70 bg-card shadow-sm" />
          <Separator orientation="vertical" className="hidden h-5 sm:block" />
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold tracking-wider text-primary uppercase">
              {pageMeta.eyebrow}
            </p>
            <p className="truncate text-sm text-muted-foreground">
              {pageMeta.description}
            </p>
          </div>
          <Badge
            variant="outline"
            className="ml-auto hidden border-primary/20 bg-primary/5 text-primary sm:inline-flex"
          >
            <span className="size-1.5 rounded-full bg-primary" />
            {pageMeta.title}
          </Badge>
        </header>

        <main className="min-w-0 flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/archivos" element={<DocumentsView />} />
            <Route path="/chat" element={<Chat />} />
          </Routes>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRouter />
    </BrowserRouter>
  );
}
