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
import {
  RiFileLine,
  RiSearchLine,
  RiChat1Line,
  RiRocketLine,
} from "@remixicon/react";
import { Link } from "react-router-dom";

export function Home() {
  return (
    <div className="space-y-10">
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium border border-primary/20">
          <Badge variant="outline">Sistema RAG</Badge>
        </div>
        <h1 className="mt-4 text-4xl font-bold tracking-tight">
          Retrieval-Augmented <br />
          Generation
        </h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-2xl">
          Combina la generación de lenguaje con la recuperación de información
          desde tus propios documentos. Sube archivos, indexa su contenido y
          consulta lo que necesitas con respuestas fundamentadas en tu
          documentación.
        </p>
        <div className="mt-8 flex items-center gap-3">
          <Button size="lg" className="flex-1">
            <Link to="/archivos" className="block w-full text-left">
              Subir archivo
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="flex flex-col h-full">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-md bg-muted">
                <RiFileLine className="size-5" />
              </div>
              <span className="text-xs font-medium uppercase tracking-wider">
                Indexado
              </span>
            </div>
          </CardHeader>
          <CardContent className="flex-1">
            <CardTitle className="text-base">Indexado de documentos</CardTitle>
            <CardDescription className="mt-3 text-sm text-muted-foreground">
              Sube PDF, DOCX, TXT y más. Los archivos se dividen en chunks y se
              vectorizan para búsqueda semántica.
            </CardDescription>
          </CardContent>
          <CardFooter>
            <Badge variant="secondary">PDF · DOCX · TXT</Badge>
          </CardFooter>
        </Card>

        <Card className="flex flex-col h-full">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-md bg-muted">
                <RiSearchLine className="size-5" />
              </div>
              <span className="text-xs font-medium uppercase tracking-wider">
                Búsqueda
              </span>
            </div>
          </CardHeader>
          <CardContent className="flex-1">
            <CardTitle className="text-base">Búsqueda semántica</CardTitle>
            <CardDescription className="mt-3 text-sm text-muted-foreground">
              Encuentra el fragmento más relevante de tus documentos sin
              depender de palabras clave exactas.
            </CardDescription>
          </CardContent>
          <CardFooter>
            <Badge variant="secondary">Vectorial</Badge>
          </CardFooter>
        </Card>

        <Card className="flex flex-col h-full">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-md bg-muted">
                <RiChat1Line className="size-5" />
              </div>
              <span className="text-xs font-medium uppercase tracking-wider">
                Contexto
              </span>
            </div>
          </CardHeader>
          <CardContent className="flex-1">
            <CardTitle className="text-base">Generación con contexto</CardTitle>
            <CardDescription className="mt-3 text-sm text-muted-foreground">
              Las respuestas se generan usando únicamente la información
              recuperada de tus archivos indexados.
            </CardDescription>
          </CardContent>
          <CardFooter>
            <Badge variant="secondary">RAG</Badge>
          </CardFooter>
        </Card>
      </div>

      <Card className="bg-primary text-primary-foreground border-primary">
        <CardHeader>
          <CardTitle className="text-xl">¿Listo para empezar?</CardTitle>
          <CardDescription>
            Sube tu primer archivo y comienza a consultar tu documentación con
            inteligencia artificial.
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex items-center gap-3 pt-8">
          <Button size="lg" variant="outline" className="flex-1 border-primary text-primary-foreground">
            <Link to="/archivos" className="flex w-full items-center justify-center">
              Subir primer archivo
            </Link>
          </Button>
          <div className="ml-auto text-xs text-primary-foreground/70">
            <RiRocketLine className="mr-1 size-4" /> Sistema operativo
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
