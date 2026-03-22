import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { WelcomeScreen } from "./WelcomeScreen";
import { useThreadState, useCreateThread } from "../api/hooks";
import {
  streamMessage,
  updateThreadMetadata,
  createThread as apiCreateThread,
  type Message,
} from "../api/client";
import { getApiKey } from "../api/keys";

// Typewriter: tokens accumulate in a target buffer, revealed progressively
const CHARS_PER_TICK = 3;
const DRAIN_CHARS_PER_TICK = 12;
const TICK_MS = 16;

function useTypewriter() {
  const [displayed, setDisplayed] = useState("");
  const targetRef = useRef("");
  const cursorRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const drainingRef = useRef(false);
  const fullyRevealedRef = useRef(false);

  const startTicking = useCallback(() => {
    if (intervalRef.current) return;
    intervalRef.current = setInterval(() => {
      const target = targetRef.current;
      const cursor = cursorRef.current;
      if (cursor >= target.length) {
        if (drainingRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = undefined;
          drainingRef.current = false;
          fullyRevealedRef.current = true;
        }
        return;
      }
      const speed = drainingRef.current ? DRAIN_CHARS_PER_TICK : CHARS_PER_TICK;
      const next = Math.min(cursor + speed, target.length);
      cursorRef.current = next;
      setDisplayed(target.slice(0, next));
    }, TICK_MS);
  }, []);

  const append = useCallback((token: string) => {
    targetRef.current += token;
    fullyRevealedRef.current = false;
    startTicking();
  }, [startTicking]);

  const drain = useCallback(() => {
    drainingRef.current = true;
    fullyRevealedRef.current = false;
    startTicking();
  }, [startTicking]);

  const reset = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = undefined;
    }
    targetRef.current = "";
    cursorRef.current = 0;
    drainingRef.current = false;
    fullyRevealedRef.current = false;
    setDisplayed("");
  }, []);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return {
    displayed,
    append,
    drain,
    reset,
    get isFullyRevealed() { return fullyRevealedRef.current; },
    get isDraining() { return drainingRef.current; },
  };
}

interface ChatViewProps {
  threadId: string | null;
  onThreadCreated: (threadId: string) => void;
  onMenuClick: () => void;
}

export function ChatView({ threadId, onThreadCreated, onMenuClick }: ChatViewProps) {
  const { data: threadState, isError: threadStateError } = useThreadState(threadId);
  const createThread = useCreateThread();
  const queryClient = useQueryClient();

  const typewriter = useTypewriter();
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamDone, setStreamDone] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [optimisticMessages, setOptimisticMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const serverMessages = threadState?.values?.messages ?? [];

  // Check if server has caught up with the AI response
  const serverHasAiResponse = useMemo(() => {
    if (!streamDone) return false;
    const lastMsg = serverMessages[serverMessages.length - 1];
    return lastMsg?.type === "ai" && !!lastMsg.content;
  }, [serverMessages, streamDone]);

  // Once server has the AI response, clean up optimistic state (no visual change)
  useEffect(() => {
    if (serverHasAiResponse) {
      // Server has the real messages now — silently clean up
      typewriter.reset();
      setOptimisticMessages([]);
      setStreamDone(false);
    }
  }, [serverHasAiResponse, typewriter]);

  // If stored thread doesn't exist on server, reset
  useEffect(() => {
    if (threadStateError && threadId) {
      onThreadCreated("");
    }
  }, [threadStateError, threadId, onThreadCreated]);

  // Merge server + optimistic messages
  const displayMessages = useMemo(() => {
    if (optimisticMessages.length === 0) return serverMessages;
    const lastServer = serverMessages[serverMessages.length - 1];
    const optimisticHuman = optimisticMessages[0];
    if (lastServer?.type === "human" && lastServer.content === optimisticHuman?.content) {
      return serverMessages;
    }
    return [...serverMessages, ...optimisticMessages];
  }, [serverMessages, optimisticMessages]);

  // Should we show the typewriter AI bubble?
  // Show it when we have typewriter content AND server hasn't caught up yet
  const showTypewriter = !!typewriter.displayed && !serverHasAiResponse;
  const showCursor = isStreaming || (showTypewriter && !typewriter.isFullyRevealed);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [displayMessages.length, typewriter.displayed, scrollToBottom]);

  const handleSend = async (content: string) => {
    setErrorMessage(null);
    setStreamDone(false);
    let currentThreadId = threadId;
    let isFirstMessage = false;

    if (!currentThreadId) {
      const thread = await createThread.mutateAsync();
      currentThreadId = thread.thread_id;
      onThreadCreated(currentThreadId);
      isFirstMessage = true;
    } else {
      const existingHuman = serverMessages.filter((m) => m.type === "human");
      isFirstMessage = existingHuman.length === 0;
    }

    setOptimisticMessages([
      { type: "human", content, id: `temp-${Date.now()}` },
    ]);
    setIsStreaming(true);
    typewriter.reset();

    if (isFirstMessage) {
      const title = content.length > 50 ? content.slice(0, 50) + "..." : content;
      updateThreadMetadata(currentThreadId, { title }).catch(() => {});
    }

    const doStream = async (tid: string) => {
      await streamMessage(tid, content, {
        onToken: (token) => {
          typewriter.append(token);
        },
        onDone: (fullMsg) => {
          setIsStreaming(false);
          if (!fullMsg) {
            typewriter.reset();
            setOptimisticMessages([]);
            setErrorMessage("No response received. The agent may be unavailable.");
          } else {
            typewriter.drain();
            setStreamDone(true);
          }
          queryClient.invalidateQueries({
            queryKey: ["thread-state", tid],
          });
          queryClient.invalidateQueries({ queryKey: ["threads"] });
        },
        onError: async (error) => {
          if (tid === currentThreadId) {
            try {
              const newThread = await apiCreateThread();
              const newTitle = content.length > 50 ? content.slice(0, 50) + "..." : content;
              updateThreadMetadata(newThread.thread_id, { title: newTitle }).catch(() => {});
              onThreadCreated(newThread.thread_id);
              typewriter.reset();
              await doStream(newThread.thread_id);
              return;
            } catch {
              // Fall through to error display
            }
          }
          console.error("Stream error:", error);
          setIsStreaming(false);
          typewriter.reset();
          setOptimisticMessages([]);
          setErrorMessage("Connection error. Please try again.");
        },
      }, getApiKey());
    };

    await doStream(currentThreadId);
  };

  const hasMessages = displayMessages.length > 0 || typewriter.displayed || errorMessage;

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-surface">
      <header className="md:hidden flex items-center gap-3 px-5 h-12 border-b border-surface-border/50 bg-surface">
        <button
          onClick={onMenuClick}
          className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors"
          aria-label="Open menu"
          data-testid="menu-btn"
        >
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
            <path
              d="M3 5h14M3 10h14M3 15h14"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
        <span className="font-pixel text-pixel-xs text-text-muted tracking-wider">
          MEDOX
        </span>
      </header>

      {!hasMessages ? (
        <WelcomeScreen onSuggestionClick={handleSend} />
      ) : (
        <div className="flex-1 overflow-y-auto relative">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-surface to-transparent z-10" />
          <div className="max-w-2xl mx-auto px-4 md:px-6 py-8 flex flex-col justify-end min-h-full">
            <div className="space-y-1">
              {displayMessages
                .filter((m) => m.type === "human" || m.type === "ai")
                .filter((m) => m.content)
                .map((msg, i) => (
                  <ChatMessage
                    key={msg.id || i}
                    role={msg.type as "human" | "ai"}
                    content={msg.content}
                  />
                ))}
              {showTypewriter && (
                <ChatMessage role="ai" content={typewriter.displayed} isStreaming={showCursor} />
              )}
              {isStreaming && !typewriter.displayed && <TypingIndicator />}
              {errorMessage && <ErrorBanner message={errorMessage} />}
            </div>
            <div ref={messagesEndRef} />
          </div>
        </div>
      )}

      <ChatInput onSend={handleSend} disabled={isStreaming} />
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="py-3 animate-fade-in" data-testid="typing-indicator">
      <div className="flex gap-3">
        <div className="shrink-0">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent/20 to-accent/5 border border-accent/10 flex items-center justify-center">
            <span className="font-pixel text-[8px] text-accent tracking-wider">M</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 pt-2">
          <span className="w-1.5 h-1.5 rounded-full bg-accent/40 animate-bounce [animation-delay:0ms]" />
          <span className="w-1.5 h-1.5 rounded-full bg-accent/40 animate-bounce [animation-delay:150ms]" />
          <span className="w-1.5 h-1.5 rounded-full bg-accent/40 animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="py-3 animate-fade-in" data-testid="error-banner">
      <div className="ml-10 px-3 py-2.5 rounded-lg bg-danger-bg/50 border border-danger-border/50 text-danger text-sm">
        {message}
      </div>
    </div>
  );
}
