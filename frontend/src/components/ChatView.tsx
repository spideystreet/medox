import { useState, useRef, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { WelcomeScreen } from "./WelcomeScreen";
import { useThreadState, useCreateThread } from "../api/hooks";
import { streamMessage, type Message } from "../api/client";

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

    // Create thread if needed
    if (!currentThreadId) {
      const thread = await createThread.mutateAsync();
      currentThreadId = thread.thread_id;
      onThreadCreated(currentThreadId);
    }

    // Add optimistic user message
    setOptimisticMessages([
      { type: "human", content, id: `temp-${Date.now()}` },
    ]);
    setIsStreaming(true);
    setStreamingContent("");

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
      {/* Header */}
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

      {/* Messages or Welcome */}
      {!hasMessages ? (
        <WelcomeScreen onSuggestionClick={handleSend} />
      ) : (
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="max-w-3xl mx-auto">
            {displayMessages
              .filter((m) => m.type === "human" || m.type === "ai")
              .filter((m) => m.content)
              .map((msg, i) => (
                <ChatMessage key={msg.id || i} role={msg.type as "human" | "ai"} content={msg.content} />
              ))}
            {streamingContent && (
              <ChatMessage role="ai" content={streamingContent} isStreaming />
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      )}

      {/* Input */}
      <ChatInput onSend={handleSend} disabled={isStreaming} />
    </div>
  );
}
