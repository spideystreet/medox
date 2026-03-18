import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
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

interface ChatViewProps {
  threadId: string | null;
  onThreadCreated: (threadId: string) => void;
  onMenuClick: () => void;
}

export function ChatView({ threadId, onThreadCreated, onMenuClick }: ChatViewProps) {
  const { data: threadState, isError: threadStateError } = useThreadState(threadId);
  const createThread = useCreateThread();
  const queryClient = useQueryClient();

  const [streamingContent, setStreamingContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [optimisticMessages, setOptimisticMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const messages = threadState?.values?.messages ?? [];
  const displayMessages = [...messages, ...optimisticMessages];

  // If stored thread doesn't exist on server, reset
  useEffect(() => {
    if (threadStateError && threadId) {
      onThreadCreated("");
    }
  }, [threadStateError, threadId, onThreadCreated]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [displayMessages.length, streamingContent, scrollToBottom]);

  const handleSend = async (content: string) => {
    setErrorMessage(null);
    let currentThreadId = threadId;
    let isFirstMessage = false;

    // Always create a fresh thread if none selected
    if (!currentThreadId) {
      const thread = await createThread.mutateAsync();
      currentThreadId = thread.thread_id;
      onThreadCreated(currentThreadId);
      isFirstMessage = true;
    } else {
      const existingHuman = messages.filter((m) => m.type === "human");
      isFirstMessage = existingHuman.length === 0;
    }

    setOptimisticMessages([
      { type: "human", content, id: `temp-${Date.now()}` },
    ]);
    setIsStreaming(true);
    setStreamingContent("");

    if (isFirstMessage) {
      const title = content.length > 50 ? content.slice(0, 50) + "..." : content;
      updateThreadMetadata(currentThreadId, { title }).catch(() => {});
    }

    const doStream = async (tid: string) => {
      await streamMessage(tid, content, {
        onToken: (token) => {
          setStreamingContent((prev) => prev + token);
        },
        onDone: (fullMsg) => {
          setIsStreaming(false);
          setStreamingContent("");
          setOptimisticMessages([]);
          if (!fullMsg) {
            setErrorMessage("No response received. The agent may be unavailable.");
          }
          queryClient.invalidateQueries({
            queryKey: ["thread-state", tid],
          });
          queryClient.invalidateQueries({ queryKey: ["threads"] });
        },
        onError: async (error) => {
          // If the thread is invalid, try creating a new one
          if (tid === currentThreadId) {
            try {
              const newThread = await apiCreateThread();
              const newTitle = content.length > 50 ? content.slice(0, 50) + "..." : content;
              updateThreadMetadata(newThread.thread_id, { title: newTitle }).catch(() => {});
              onThreadCreated(newThread.thread_id);
              setStreamingContent("");
              await doStream(newThread.thread_id);
              return;
            } catch {
              // Fall through to error display
            }
          }
          console.error("Stream error:", error);
          setIsStreaming(false);
          setStreamingContent("");
          setOptimisticMessages([]);
          setErrorMessage("Connection error. Please try again.");
        },
      });
    };

    await doStream(currentThreadId);
  };

  const hasMessages = displayMessages.length > 0 || streamingContent || errorMessage;

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-surface">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-surface-border bg-surface">
        <button
          onClick={onMenuClick}
          className="md:hidden p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors"
          aria-label="Open menu"
          data-testid="menu-btn"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M3 5h14M3 10h14M3 15h14"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
        <Link to="/" className="font-pixel text-pixel-xs text-text-secondary tracking-wider hover:text-accent transition-colors">
          NEPHILA
        </Link>
      </header>

      {!hasMessages ? (
        <WelcomeScreen onSuggestionClick={handleSend} />
      ) : (
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="max-w-3xl mx-auto flex flex-col justify-end min-h-full">
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
            {isStreaming && streamingContent && (
              <ChatMessage role="ai" content={streamingContent} isStreaming />
            )}
            {isStreaming && !streamingContent && <TypingIndicator />}
            {errorMessage && <ErrorBanner message={errorMessage} />}
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
    <div className="flex justify-start mb-6 animate-fade-in" data-testid="typing-indicator">
      <div className="flex items-center gap-1.5 px-4 py-3 rounded-2xl bg-surface-raised">
        <span className="w-2 h-2 rounded-full bg-text-muted animate-bounce [animation-delay:0ms]" />
        <span className="w-2 h-2 rounded-full bg-text-muted animate-bounce [animation-delay:150ms]" />
        <span className="w-2 h-2 rounded-full bg-text-muted animate-bounce [animation-delay:300ms]" />
      </div>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      className="flex justify-start mb-4 animate-fade-in"
      data-testid="error-banner"
    >
      <div className="px-4 py-3 rounded-lg border bg-danger-bg border-danger-border text-danger text-sm">
        {message}
      </div>
    </div>
  );
}
