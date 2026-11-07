import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  RiAddLine,
  RiChat1Line,
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
import { useSearchParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/axios";

type ChatSummary = {
  id: number;
  title: string;
  updated_at: string;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  inputTokens?: number;
  outputTokens?: number;
  contextUsagePercent?: number;
  outputUsagePercent?: number;
};

type ChatResponse = {
  chat_id: number;
  response: string;
  input_tokens: number | null;
  output_tokens: number | null;
  context_usage_percent: number | null;
  output_usage_percent: number | null;
};

type StoredMessage = {
  id: number;
  user_input: string;
  ai_response: string;
};

export function Chat() {
  const [searchParams] = useSearchParams();
  const isNewChat = searchParams.get("new") === "1";
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isResponding, setIsResponding] = useState(false);
  const [error, setError] = useState("");
  const [contextLimitReached, setContextLimitReached] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadChats = async () => {
    const { data } = await api.get<ChatSummary[]>("/chats");
    setChats(data);
    return data;
  };

  const openChat = async (chatId: number) => {
    setSelectedChatId(chatId);
    setError("");
    try {
      const { data } = await api.get<StoredMessage[]>(
        `/chats/${chatId}/messages`,
      );
      setMessages(
        data.flatMap((message) => [
          {
            id: `${message.id}-user`,
            role: "user" as const,
            content: message.user_input,
          },
          {
            id: `${message.id}-assistant`,
            role: "assistant" as const,
            content: message.ai_response,
          },
        ]),
      );
    } catch {
      setError("No se pudo cargar la conversación.");
    }
  };

  const startNewChat = () => {
    setError("");
    setSelectedChatId(null);
    setMessages([]);
    setContextLimitReached(false);
  };

  useEffect(() => {
    void loadChats()
      .then((data) => {
        if (!isNewChat && data.length > 0) {
          return openChat(data[0].id);
        }
        return undefined;
      })
      .catch(() => setError("No se pudo cargar la lista de chats."))
      .finally(() => setIsLoading(false));
  }, [isNewChat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isResponding]);

  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = draft.trim();
    if (!message || isResponding) return;

    setDraft("");
    setError("");
    setMessages((current) => [
      ...current,
      { id: `${Date.now()}-user`, role: "user", content: message },
    ]);
    setIsResponding(true);

    try {
      let chatId = selectedChatId;
      if (chatId === null) {
        chatId = null;
      }
      const { data } = await api.post<ChatResponse>("/chat", {
        message,
        chat_id: chatId,
      });
      setMessages((current) => [
        ...current,
        {
          id: `${Date.now()}-assistant`,
          role: "assistant",
          content: data.response,
          inputTokens: data.input_tokens ?? undefined,
          outputTokens: data.output_tokens ?? undefined,
          contextUsagePercent: data.context_usage_percent ?? undefined,
          outputUsagePercent: data.output_usage_percent ?? undefined,
        },
      ]);
      setContextLimitReached(
        data.context_usage_percent !== null &&
          data.context_usage_percent > 90,
      );
      setSelectedChatId(data.chat_id);
      await loadChats();
    } catch {
      setError("No se pudo obtener una respuesta. Intenta de nuevo.");
    } finally {
      setIsResponding(false);
    }
  };

  return (
    <div className="min-h-full">
      <div className="mx-auto flex min-h-[calc(100svh-4rem)] w-full max-w-7xl flex-col gap-6 p-4 sm:p-6 lg:p-10">
        <header className="flex flex-col gap-3 border-b border-border/70 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Badge variant="outline" className="border-primary/20 bg-primary/10 text-primary">
              <RiChat1Line />
              Asistente
            </Badge>
            <h1 className="mt-4 font-heading text-4xl font-semibold tracking-tight sm:text-5xl">
              Chat
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-6 text-muted-foreground">
              Continúa tus conversaciones con el agente.
            </p>
          </div>
          <Button type="button" onClick={startNewChat}>
            <RiAddLine />
            Nuevo chat
          </Button>
        </header>

        <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <Card className="min-h-0">
            <CardContent className="flex h-full flex-col gap-3 p-3">
              <div className="flex items-center justify-between px-2">
                <h2 className="font-medium">Tus chats</h2>
              </div>
              <div className="min-h-0 space-y-1 overflow-y-auto">
                {isLoading ? (
                  <RiLoader4Line className="mx-auto mt-6 animate-spin text-primary" />
                ) : chats.length === 0 ? (
                  <p className="px-2 py-6 text-sm text-muted-foreground">
                    Aún no tienes chats guardados.
                  </p>
                ) : (
                  chats.map((chat) => (
                    <button
                      type="button"
                      key={chat.id}
                      onClick={() => void openChat(chat.id)}
                      className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                        selectedChatId === chat.id
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-muted"
                      }`}
                    >
                      <span className="block truncate font-medium">{chat.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(chat.updated_at).toLocaleDateString()}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="flex min-h-0 flex-col border-border/70">
            <CardContent className="flex min-h-0 flex-1 flex-col gap-4 p-4 sm:p-6">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <h2 className="truncate font-medium">
                  {chats.find((chat) => chat.id === selectedChatId)?.title ??
                    "Nuevo chat"}
                </h2>
              </div>
              <MessageGroup className="min-h-0 flex-1 overflow-y-auto pr-1">
                {messages.length === 0 && !isResponding ? (
                  <div className="flex h-full flex-col items-center justify-center py-16 text-center">
                    <RiRobot2Line className="size-10 text-primary" />
                    <h2 className="mt-4 font-heading text-lg font-semibold">
                      ¿En qué puedo ayudarte?
                    </h2>
                    <p className="mt-2 text-sm text-muted-foreground">
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
                        <MessageAvatar className={message.role === "user" ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"}>
                          {message.role === "user" ? <RiUserLine className="size-4" /> : <RiRobot2Line className="size-4" />}
                        </MessageAvatar>
                        <MessageContent className={message.role === "user" ? "max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-3 text-primary-foreground sm:max-w-[75%]" : "max-w-[85%] rounded-2xl rounded-bl-sm bg-muted px-4 py-3 sm:max-w-[75%]"}>
                          <p className="whitespace-pre-wrap leading-6">{message.content}</p>
                          {message.role === "assistant" &&
                            message.contextUsagePercent !== undefined && (
                              <p className="mt-2 text-xs text-muted-foreground">
                                Contexto: {message.contextUsagePercent.toFixed(2)}% ·
                                salida: {message.outputUsagePercent?.toFixed(2)}%
                              </p>
                            )}
                        </MessageContent>
                      </Message>
                    ))}
                    {isResponding && (
                      <Message className="mb-4">
                        <MessageAvatar className="bg-primary/10 text-primary"><RiRobot2Line className="size-4" /></MessageAvatar>
                        <MessageContent className="rounded-2xl rounded-bl-sm bg-muted px-4 py-3">
                          <RiLoader4Line className="size-5 animate-spin text-primary" />
                        </MessageContent>
                      </Message>
                    )}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </MessageGroup>
              {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
              {contextLimitReached ? (
                <div className="space-y-3">
                  <p role="alert" className="text-center text-sm text-destructive">
                    El contexto de esta conversación supera el 90% del límite
                    disponible. Inicia un nuevo chat para continuar.
                  </p>
                  <Button
                    type="button"
                    onClick={startNewChat}
                    className="mx-auto flex"
                  >
                    <RiAddLine />
                    Nuevo chat
                  </Button>
                </div>
              ) : (
                <>
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
                      placeholder="Escribe un mensaje..."
                      aria-label="Mensaje para el agente"
                      disabled={isResponding}
                      rows={2}
                      className="max-h-40 min-h-12"
                    />
                    <Button type="submit" size="icon-lg" disabled={isResponding || !draft.trim()} aria-label="Enviar mensaje">
                      <RiSendPlane2Line />
                    </Button>
                  </form>
                  <p className="text-center text-xs text-muted-foreground">
                    Enter para enviar · Shift + Enter para una nueva línea
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
