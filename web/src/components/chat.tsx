"use client";

import {
  AssistantRuntimeProvider,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useLocalRuntime,
  type ChatModelAdapter,
  type ChatModelRunOptions,
  type ThreadMessage,
} from "@assistant-ui/react";
import { useMemo } from "react";

type ContentPart = { type: string; text?: string };

/** Assistant-ui stores thread messages in a level-indexed array; holes are common. */
function compactThreadMessages(
  messages: readonly ThreadMessage[],
): ThreadMessage[] {
  return Array.from(messages).filter(
    (m): m is ThreadMessage => m != null && typeof (m as ThreadMessage).role === "string",
  );
}

function extractText(parts: readonly ContentPart[]): string {
  if (!parts?.length) return "";
  return parts
    .map((p) => {
      if (
        (p.type === "text" || p.type === "reasoning") &&
        typeof p.text === "string"
      ) {
        return p.text;
      }
      return "";
    })
    .join("");
}

function threadMessagesToApi(messages: readonly ThreadMessage[]) {
  const out: { role: "user" | "assistant" | "system"; content: string }[] =
    [];
  for (const m of compactThreadMessages(messages)) {
    if (m.role === "system") {
      const t = extractText(m.content as readonly ContentPart[]);
      if (t) out.push({ role: "system", content: t });
      continue;
    }
    if (m.role === "user") {
      const t = extractText(m.content as readonly ContentPart[]);
      if (t) out.push({ role: "user", content: t });
    } else if (m.role === "assistant") {
      const t = extractText(m.content as readonly ContentPart[]);
      if (t) out.push({ role: "assistant", content: t });
    }
  }
  return out;
}

function createChatAdapter(apiBase: string): ChatModelAdapter {
  const base = apiBase.replace(/\/$/, "");

  return {
    async run(options: ChatModelRunOptions) {
      const { messages, abortSignal } = options;
      const res = await fetch(`${base}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: threadMessagesToApi(messages) }),
        signal: abortSignal,
      });

      if (!res.ok) {
        const detail = await res.text();
        throw new Error(detail || `Request failed (${res.status})`);
      }

      const data = (await res.json()) as { content: string };
      return {
        content: [{ type: "text" as const, text: data.content }],
      };
    },
  };
}

function UserMessage() {
  return (
    <MessagePrimitive.Root className="mx-auto flex w-full max-w-3xl justify-end gap-3 px-4 py-3">
      <div className="max-w-[85%] rounded-2xl bg-zinc-900 px-4 py-2.5 text-sm leading-relaxed text-zinc-50">
        <MessagePrimitive.Content />
      </div>
    </MessagePrimitive.Root>
  );
}

function AssistantMessage() {
  return (
    <MessagePrimitive.Root className="mx-auto flex w-full max-w-3xl justify-start gap-3 px-4 py-3">
      <div className="max-w-[85%] rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm leading-relaxed text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-100">
        <MessagePrimitive.Content />
      </div>
    </MessagePrimitive.Root>
  );
}

export function Chat() {
  const apiBase =
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ??
    "http://localhost:8000";

  const adapter = useMemo(() => createChatAdapter(apiBase), [apiBase]);
  const runtime = useLocalRuntime(adapter);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="flex h-[min(100dvh,880px)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <header className="shrink-0 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <h1 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Assistant
          </h1>
          <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
            Powered by your FastAPI + LangChain backend
          </p>
        </header>

        <ThreadPrimitive.Root className="flex min-h-0 flex-1 flex-col bg-zinc-50/80 dark:bg-zinc-900/50">
          <ThreadPrimitive.Viewport className="min-h-0 flex-1 overflow-y-auto">
            <ThreadPrimitive.Empty>
              <div className="flex h-full min-h-[200px] flex-col items-center justify-center px-6 py-12 text-center text-zinc-500 dark:text-zinc-400">
                <p className="text-sm">Send a message to start the conversation.</p>
              </div>
            </ThreadPrimitive.Empty>
            <ThreadPrimitive.Messages
              components={{
                UserMessage,
                AssistantMessage,
              }}
            />
            <ThreadPrimitive.ScrollToBottom className="mx-auto my-4 flex w-full max-w-3xl justify-center" />
          </ThreadPrimitive.Viewport>

          <ComposerPrimitive.Root className="shrink-0 border-t border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="mx-auto flex w-full max-w-3xl items-end gap-2">
              <ComposerPrimitive.Input
                placeholder="Message…"
                rows={1}
                className="max-h-40 min-h-11 flex-1 resize-none rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-500 dark:focus:ring-zinc-800"
              />
              <ComposerPrimitive.Send className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl bg-zinc-900 px-5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200">
                Send
              </ComposerPrimitive.Send>
            </div>
          </ComposerPrimitive.Root>
        </ThreadPrimitive.Root>
      </div>
    </AssistantRuntimeProvider>
  );
}
