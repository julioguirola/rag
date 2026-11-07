import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  RiChat1Line,
  RiFileTextLine,
  RiLoader4Line,
  RiRobot2Line,
  RiSendPlane2Line,
  RiUserLine,
} from "@remixicon/react";

import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageGroup,
} from "@/components/ui/message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/axios";

type ChatMessage = {
  id: number;
  role: "user" | "assistant";
  content: string;
  context?: ContextChunk[];
};

type ContextChunk = {
  filename: string;
  chunk_index: number;
  content: string;
};

type ChatResponse = {
  response: string;
  context: ContextChunk[];
};

export function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [isResponding, setIsResponding] = useState(false);
  const [error, setError] = useState("");
  const [visibleContext, setVisibleContext] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isResponding]);

  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = draft.trim();

    if (!message || isResponding) {
      return;
    }

    setDraft("");
    setError("");
    setMessages((current) => [
      ...current,
      { id: Date.now(), role: "user", content: message },
    ]);
    setIsResponding(true);

    try {
      const { data } = await api.post<ChatResponse>("/chat", { message });
      setMessages((current) => [
        ...current,
        {
          id: Date.now() + 1,
          role: "assistant",
          content: data.response,
          context: data.context,
        },
      ]);
    } catch {
      setError("No se pudo obtener una respuesta. Intenta de nuevo.");
    } finally {
      setIsResponding(false);
    }
  };

  return (
    <div className="min-h-full">
      <div className="mx-auto flex min-h-[calc(100svh-4rem)] w-full max-w-5xl flex-col gap-6 p-4 sm:p-6 lg:p-10">
        <header className="flex flex-col gap-3 border-b border-border/70 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Badge
              variant="outline"
              className="border-primary/20 bg-primary/10 text-primary"
            >
              <RiChat1Line />
              Asistente
            </Badge>
            <h1 className="mt-4 font-heading text-4xl font-semibold tracking-tight sm:text-5xl">
              Chat
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-6 text-muted-foreground">
              Conversa con el agente y recibe respuestas en tiempo real.
            </p>
          </div>
        </header>

        <Card className="flex min-h-0 flex-1 flex-col border-border/70">
          <CardContent className="flex min-h-0 flex-1 flex-col gap-4 p-4 sm:p-6">
            <MessageGroup className="min-h-0 flex-1 overflow-y-auto pr-1">
              {messages.length === 0 && !isResponding ? (
                <div className="flex h-full flex-col items-center justify-center py-16 text-center">
                  <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <RiRobot2Line className="size-7" />
                  </div>
                  <h2 className="mt-4 font-heading text-lg font-semibold">
                    ¿En qué puedo ayudarte?
                  </h2>
                  <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                    Escribe un mensaje para comenzar la conversación.
                  </p>
                </div>
              ) : (
                <>
                  {messages.map((message) => (
                    <Message
                      key={message.id}
                      align={message.role === "user" ? "end" : "start"}
                      className="mb-4"
                    >
                      <MessageAvatar
                        className={
                          message.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-primary/10 text-primary"
                        }
                      >
                        {message.role === "user" ? (
                          <RiUserLine className="size-4" />
                        ) : (
                          <RiRobot2Line className="size-4" />
                        )}
                      </MessageAvatar>
                      <MessageContent
                        className={
                          message.role === "user"
                            ? "max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-3 text-primary-foreground sm:max-w-[75%]"
                            : "max-w-[85%] rounded-2xl rounded-bl-sm bg-muted px-4 py-3 sm:max-w-[75%]"
                        }
                      >
                        <p className="whitespace-pre-wrap leading-6">
                          {message.content}
                        </p>
                        {message.role === "assistant" && message.context && (
                          <>
                            <button
                              type="button"
                              className="w-fit text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                              onClick={() =>
                                setVisibleContext((current) =>
                                  current === message.id ? null : message.id,
                                )
                              }
                              aria-expanded={visibleContext === message.id}
                            >
                              <span className="inline-flex items-center gap-1">
                                <RiFileTextLine className="size-3.5" />
                                {visibleContext === message.id
                                  ? "Ocultar contexto"
                                  : "Ver contexto"}
                              </span>
                            </button>
                            {visibleContext === message.id && (
                              <div className="max-h-80 overflow-y-auto rounded-lg border border-border/60 bg-background/60 p-3 text-xs">
                                {message.context.map((chunk, index) => (
                                  <div
                                    key={`${chunk.filename}-${chunk.chunk_index}-${index}`}
                                    className="border-b border-border/50 py-2 last:border-b-0 last:pb-0 first:pt-0"
                                  >
                                    <p className="mb-1 flex items-center gap-1 font-medium text-foreground">
                                      <RiFileTextLine className="size-3.5 text-primary" />
                                      {chunk.filename}
                                    </p>
                                    <p className="whitespace-pre-wrap leading-5 text-muted-foreground">
                                      {chunk.content}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </MessageContent>
                    </Message>
                  ))}
                  {isResponding && (
                    <Message className="mb-4">
                      <MessageAvatar className="bg-primary/10 text-primary">
                        <RiRobot2Line className="size-4" />
                      </MessageAvatar>
                      <MessageContent className="rounded-2xl rounded-bl-sm bg-muted px-4 py-3">
                        <RiLoader4Line
                          className="size-5 animate-spin text-primary"
                          aria-label="El agente está respondiendo"
                        />
                      </MessageContent>
                    </Message>
                  )}
                  <div ref={messagesEndRef} />
                </>
              )}
            </MessageGroup>

            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}

            <form onSubmit={sendMessage} className="flex items-end gap-3">
              <Textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
                placeholder="Escribe tu mensaje..."
                aria-label="Mensaje para el agente"
                disabled={isResponding}
                rows={2}
                className="max-h-40 min-h-12"
              />
              <Button
                type="submit"
                size="icon-lg"
                disabled={isResponding || !draft.trim()}
                aria-label="Enviar mensaje"
              >
                <RiSendPlane2Line />
              </Button>
            </form>
            <p className="text-center text-xs text-muted-foreground">
              {isResponding
                ? "El agente está respondiendo..."
                : "Enter para enviar · Shift + Enter para una nueva línea"}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
