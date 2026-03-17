import { useState, useRef, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { WelcomeScreen } from "./WelcomeScreen";
import { useThreadState, useCreateThread } from "../api/hooks";
import { streamMessage, updateThreadMetadata, type Message } from "../api/client";

interface ChatViewProps {
  threadId: string | null;
  onThreadCreated: (threadId: string) => void;
  onMenuClick: () => void;
}

export function ChatView({ threadId, onThreadCreated, onMenuClick }: ChatViewProps) {
  const { data: threadState } = useThreadState(threadId);
  const createThread = useCreateThread();
  const queryClient = useQueryClient();

  const [streamingContent, setStreamingContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [optimisticMessages, setOptimisticMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isFirstMessageRef = useRef(false);

  const messages = threadState?.values?.messages ?? [];
  const displayMessages = [...messages, ...optimisticMessages];

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [displayMessages.length, streamingContent, scrollToBottom]);

  const handleSend = async (content: string) => {
    let currentThreadId = threadId;

    if (!currentThreadId) {
      const thread = await createThread.mutateAsync();
      currentThreadId = thread.thread_id;
      onThreadCreated(currentThreadId);
      isFirstMessageRef.current = true;
    } else {
      const existingMessages = messages.filter((m) => m.type === "human");
      isFirstMessageRef.current = existingMessages.length === 0;
    }

    setOptimisticMessages([
      { type: "human", content, id: `temp-${Date.now()}` },
    ]);
    setIsStreaming(true);
    setStreamingContent("");

    // Set title from first message
    if (isFirstMessageRef.current) {
      const title = content.length > 50 ? content.slice(0, 50) + "..." : content;
      updateThreadMetadata(currentThreadId, { title }).catch(() => {});
    }

    await streamMessage(currentThreadId, content, {
      onToken: (token) => {
        setStreamingContent((prev) => prev + token);
      },
      onDone: () => {
        setIsStreaming(false);
        setStreamingContent("");
        setOptimisticMessages([]);
        queryClient.invalidateQueries({
          queryKey: ["thread-state", currentThreadId],
        });
        queryClient.invalidateQueries({ queryKey: ["threads"] });
      },
      onError: (error) => {
        console.error("Stream error:", error);
        setIsStreaming(false);
        setStreamingContent("");
        setOptimisticMessages([]);
      },
    });
  };

  const hasMessages = displayMessages.length > 0 || streamingContent;

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
        <h2 className="font-pixel text-pixel-xs text-text-secondary tracking-wider">
          NEPHILA
        </h2>
      </header>

      {!hasMessages ? (
        <WelcomeScreen onSuggestionClick={handleSend} />
      ) : (
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="max-w-3xl mx-auto">
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
