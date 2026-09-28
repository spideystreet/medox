import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { WelcomeScreen } from "./WelcomeScreen";
import { useThreadState, useCreateThread } from "../api/hooks";
import {
  streamMessage,
  updateThreadMetadata,

  type Message,
} from "../api/client";

// Steady reveal, close to ChatGPT / Claude (~40 tokens/s).
const CHARS_PER_SECOND = 120;

function useTypewriter() {
  const [displayed, setDisplayed] = useState("");
  const targetRef = useRef("");
  const cursorRef = useRef(0);
  const carryRef = useRef(0);
  const lastRef = useRef(0);
  const frameRef = useRef<number>();
  const drainingRef = useRef(false);
  const fullyRevealedRef = useRef(false);
  const loopRef = useRef<(now: number) => void>(() => {});

  const stop = useCallback(() => {
    if (frameRef.current != null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = undefined;
    }
  }, []);

  const start = useCallback(() => {
    if (frameRef.current != null) return;
    lastRef.current = 0;
    frameRef.current = requestAnimationFrame((now) => loopRef.current(now));
  }, []);

  useEffect(() => {
    loopRef.current = (now: number) => {
      const previous = lastRef.current || now;
      const dt = Math.min(now - previous, 48);
      lastRef.current = now;

      const target = targetRef.current;
      if (cursorRef.current >= target.length) {
        if (drainingRef.current) {
          drainingRef.current = false;
          fullyRevealedRef.current = true;
          frameRef.current = undefined;
          return;
        }
        frameRef.current = requestAnimationFrame((t) => loopRef.current(t));
        return;
      }

      carryRef.current += (CHARS_PER_SECOND * dt) / 1000;
      const step = Math.floor(carryRef.current);
      if (step > 0) {
        carryRef.current -= step;
        cursorRef.current = Math.min(cursorRef.current + step, target.length);
        setDisplayed(target.slice(0, cursorRef.current));
      }
      frameRef.current = requestAnimationFrame((t) => loopRef.current(t));
    };
  }, []);

  const revealAll = useCallback(() => {
    stop();
    cursorRef.current = targetRef.current.length;
    carryRef.current = 0;
    drainingRef.current = false;
    fullyRevealedRef.current = true;
    setDisplayed(targetRef.current);
  }, [stop]);

  const prefersReducedMotion = useCallback(() => {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  const append = useCallback((token: string) => {
    targetRef.current += token;
    fullyRevealedRef.current = false;
    if (prefersReducedMotion()) {
      revealAll();
      return;
    }
    start();
  }, [prefersReducedMotion, revealAll, start]);

  const drain = useCallback(() => {
    drainingRef.current = true;
    fullyRevealedRef.current = false;
    if (prefersReducedMotion()) {
      revealAll();
      return;
    }
    start();
  }, [prefersReducedMotion, revealAll, start]);

  const reset = useCallback(() => {
    stop();
    targetRef.current = "";
    cursorRef.current = 0;
    carryRef.current = 0;
    lastRef.current = 0;
    drainingRef.current = false;
    fullyRevealedRef.current = false;
    setDisplayed("");
  }, [stop]);

  useEffect(() => stop, [stop]);

  return {
    displayed,
    append,
    drain,
    reset,
    get isFullyRevealed() { return fullyRevealedRef.current; },
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
  const [activity, setActivity] = useState("Réflexion");
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
  }, [displayMessages.length, typewriter.displayed, activity, scrollToBottom]);

  const handleSend = async (content: string) => {
    setErrorMessage(null);
    setStreamDone(false);
    let currentThreadId = threadId;
    const isFirstMessage =
      !currentThreadId ||
      serverMessages.filter((m) => m.type === "human").length === 0;

    setOptimisticMessages([
      { type: "human", content, id: `temp-${Date.now()}` },
    ]);
    setActivity("Réflexion");
    setIsStreaming(true);
    typewriter.reset();

    if (!currentThreadId) {
      try {
        const thread = await createThread.mutateAsync();
        currentThreadId = thread.thread_id;
        onThreadCreated(currentThreadId);
      } catch {
        setIsStreaming(false);
        setOptimisticMessages([]);
        setErrorMessage("Impossible de démarrer la conversation.");
        return;
      }
    }

    if (isFirstMessage) {
      const title = content.length > 50 ? content.slice(0, 50) + "..." : content;
      updateThreadMetadata(currentThreadId, { title }).catch(() => {});
    }

    const doStream = async (tid: string) => {
      await streamMessage(tid, content, {
        onStatus: (label) => {
          setActivity(label);
        },
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
          console.error("Stream error:", error);
          setIsStreaming(false);
          typewriter.reset();
          setOptimisticMessages([]);
          setErrorMessage(error.message || "Connection error. Please try again.");
        },
      });
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
        <span className="font-sans text-base font-medium tracking-tight text-text-primary">
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
              {isStreaming && !typewriter.displayed && (
                <ThinkingIndicator label={activity} />
              )}
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

function ThinkingIndicator({ label }: { label: string }) {
  return (
    <div
      className="flex items-center gap-3 py-4"
      data-testid="typing-indicator"
      aria-live="polite"
    >
      <span className="thinking-mark shrink-0" aria-hidden="true" />
      <span key={label} className="thinking-label text-sm">
        {label}
      </span>
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
