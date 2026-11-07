import {
  RiArrowRightLine,
  RiBarChartBoxLine,
  RiChat1Line,
  RiCheckLine,
  RiShieldCheckLine,
  RiSparkling2Line,
  RiUploadCloud2Line,
} from "@remixicon/react";
import { Link } from "react-router-dom";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const workflowSteps = [
  {
    icon: RiUploadCloud2Line,
    title: "Sube tus archivos",
    description: "Añade la documentación que quieres explorar.",
  },
  {
    icon: RiBarChartBoxLine,
    title: "Deja que se indexen",
    description: "El sistema prepara cada fragmento para la búsqueda.",
  },
  {
    icon: RiChat1Line,
    title: "Haz una consulta",
    description: "Obtén respuestas basadas en tu propio contexto.",
  },
];

export function Home() {
  return (
    <div className="min-h-full">
      <div className="mx-auto w-full max-w-7xl space-y-12 p-4 sm:p-6 lg:space-y-16 lg:p-10">
        <section className="relative overflow-hidden rounded-[2rem] border border-primary/15 bg-linear-to-br from-primary/10 via-background to-background p-6 shadow-sm sm:p-10 lg:p-14">
          <div className="pointer-events-none absolute -top-32 -right-24 size-80 rounded-full bg-primary/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-40 left-1/3 size-96 rounded-full bg-primary/5 blur-3xl" />

          <div className="relative grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-16">
            <div>
              <Badge
                variant="outline"
                className="border-primary/20 bg-primary/10 text-primary"
              >
                <RiSparkling2Line />
                Sistema RAG
              </Badge>
              <h1 className="mt-6 max-w-3xl font-heading text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
                Convierte tus documentos en{" "}
                <span className="text-primary">respuestas útiles.</span>
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                Sube tu documentación, encuentra el contexto que necesitas y
                consulta tus archivos con respuestas claras y fundamentadas.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button
                  size="lg"
                  nativeButton={false}
                  render={<Link to="/archivos" />}
                >
                  <RiUploadCloud2Line />
                  Subir archivos
                  <RiArrowRightLine className="ml-1" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  nativeButton={false}
                  render={<Link to="/chat?new=1" />}
                >
                  <RiChat1Line />
                  Nuevo chat
                </Button>
              </div>

              <div className="mt-8 flex flex-wrap gap-x-5 gap-y-3 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-2">
                  <RiCheckLine className="size-4 text-primary" />
                  Contexto relevante
                </span>
                <span className="inline-flex items-center gap-2">
                  <RiShieldCheckLine className="size-4 text-primary" />
                  Tus archivos, bajo control
                </span>
              </div>
            </div>

            <Card className="relative border-border/70 bg-background/85 shadow-lg shadow-primary/5 backdrop-blur">
              <CardHeader className="border-b border-border/60">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold tracking-widest text-primary uppercase">
                      Cómo funciona
                    </p>
                    <CardTitle className="mt-2 text-xl">
                      De archivo a respuesta
                    </CardTitle>
                  </div>
                  <Badge variant="secondary">3 pasos</Badge>
                </div>
                <CardDescription className="mt-2">
                  Un flujo simple para trabajar con tu conocimiento.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-1 pt-6">
                {workflowSteps.map((step, index) => {
                  const Icon = step.icon;

                  return (
                    <div className="flex gap-3" key={step.title}>
                      <div className="flex flex-col items-center">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <Icon className="size-4" />
                        </div>
                        {index < workflowSteps.length - 1 && (
                          <div className="my-1 h-8 w-px bg-border" />
                        )}
                      </div>
                      <div className="pb-5">
                        <p className="font-medium">{step.title}</p>
                        <p className="mt-1 text-sm leading-5 text-muted-foreground">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
              <CardFooter className="border-t border-border/60 pt-5 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-2">
                  <span className="size-2 rounded-full bg-primary" />
                  Listo para empezar
                </span>
              </CardFooter>
            </Card>
          </div>
        </section>

        <section>
          <p className="text-sm font-semibold text-primary">Tu espacio de trabajo</p>
          <h2 className="mt-1 font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
            ¿Qué quieres hacer?
          </h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Card className="group relative overflow-hidden border-border/70 bg-card/80 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
              <div className="absolute inset-y-0 left-0 w-1 bg-primary" />
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <RiUploadCloud2Line className="size-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">Ver mis documentos</CardTitle>
                  <CardDescription className="mt-1 text-sm">
                    Consulta tus archivos y revisa su progreso de indexación.
                  </CardDescription>
                  <Button
                    className="mt-3"
                    size="sm"
                    nativeButton={false}
                    render={<Link to="/archivos" />}
                  >
                    Ver documentos
                    <RiArrowRightLine />
                  </Button>
                </div>
              </CardContent>
            </Card>
            <Card className="group relative overflow-hidden border-border/70 bg-card/80 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
              <div className="absolute inset-y-0 left-0 w-1 bg-primary" />
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <RiChat1Line className="size-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">Nuevo chat</CardTitle>
                  <CardDescription className="mt-1 text-sm">
                    Inicia una conversación nueva desde cero.
                  </CardDescription>
                  <Button
                    className="mt-3"
                    size="sm"
                    nativeButton={false}
                    render={<Link to="/chat?new=1" />}
                  >
                    Chatear
                    <RiArrowRightLine />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
}
