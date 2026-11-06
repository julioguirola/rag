import {
  RiArrowRightLine,
  RiBarChartBoxLine,
  RiChat1Line,
  RiCheckLine,
  RiFileLine,
  RiSearchLine,
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

const features = [
  {
    icon: RiFileLine,
    eyebrow: "01 · Indexado",
    title: "Tus documentos, listos para consultar",
    description:
      "Sube PDF, DOCX, TXT y más. El contenido se divide en fragmentos y se prepara para una recuperación rápida.",
    meta: "PDF · DOCX · TXT",
  },
  {
    icon: RiSearchLine,
    eyebrow: "02 · Búsqueda",
    title: "Encuentra el contexto adecuado",
    description:
      "La búsqueda semántica entiende la intención de tu consulta, incluso cuando no coincide exactamente con el texto.",
    meta: "Búsqueda vectorial",
  },
  {
    icon: RiChat1Line,
    eyebrow: "03 · Respuestas",
    title: "Respuestas fundamentadas",
    description:
      "Genera respuestas usando la información recuperada de tus archivos y mantén el foco en tu propia documentación.",
    meta: "Contexto relevante",
  },
];

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
                  render={<Link to="/archivos" />}
                >
                  Ver mis archivos
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
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-primary">
                Tu espacio de trabajo
              </p>
              <h2 className="mt-1 font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
                Todo lo que necesitas para explorar tu conocimiento
              </h2>
            </div>
            <p className="max-w-sm text-sm leading-6 text-muted-foreground sm:text-right">
              Menos tiempo buscando. Más tiempo entendiendo y tomando
              decisiones.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;

              return (
                <Card
                  className="group h-full border-border/70 bg-card/80 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
                  key={feature.title}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                        <Icon className="size-5" />
                      </div>
                      <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                        {feature.eyebrow}
                      </span>
                    </div>
                    <CardTitle className="mt-5 text-xl">
                      {feature.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <CardDescription>{feature.description}</CardDescription>
                  </CardContent>
                  <CardFooter className="justify-between border-t border-border/60 pt-5 text-xs font-medium text-muted-foreground">
                    <span>{feature.meta}</span>
                    <RiArrowRightLine className="size-4 transition-transform group-hover:translate-x-1" />
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </section>

        <Card className="relative overflow-hidden border-primary/20 bg-primary text-primary-foreground shadow-lg shadow-primary/10">
          <div className="pointer-events-none absolute -top-16 right-10 size-48 rounded-full bg-primary-foreground/10 blur-3xl" />
          <CardContent className="relative flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div className="max-w-2xl">
              <Badge className="border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground">
                <RiSparkling2Line />
                Empieza en minutos
              </Badge>
              <h2 className="mt-4 font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
                Tu próxima respuesta puede estar en tus propios archivos.
              </h2>
              <p className="mt-2 text-sm leading-6 text-primary-foreground/75 sm:text-base">
                Carga un documento y descubre una forma más directa de consultar
                la información que ya tienes.
              </p>
            </div>
            <Button
              size="lg"
              variant="secondary"
              className="shrink-0"
              nativeButton={false}
              render={<Link to="/archivos" />}
            >
              Subir mi primer archivo
              <RiArrowRightLine />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
