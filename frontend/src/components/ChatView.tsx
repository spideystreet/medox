import { useRef, useEffect, useCallback } from "react";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { WelcomeScreen } from "./WelcomeScreen";
import { useChatSession } from "../hooks/useChatSession";

interface ChatViewProps {
  threadId: string | null;
  onThreadCreated: (threadId: string) => void;
  onMenuClick: () => void;
}

export function ChatView({ threadId, onThreadCreated, onMenuClick }: ChatViewProps) {
  const {
    displayMessages,
    isStreaming,
    activity,
    errorMessage,
    hasMessages,
    showTypewriter,
    showCursor,
    typewriterDisplayed,
    handleSend,
  } = useChatSession({ threadId, onThreadCreated });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [displayMessages.length, typewriterDisplayed, activity, scrollToBottom]);

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
                    sources={msg.sources}
                  />
                ))}
              {showTypewriter && (
                <ChatMessage
                  role="ai"
                  content={typewriterDisplayed}
                  isStreaming={showCursor}
                />
              )}
              {isStreaming && !typewriterDisplayed && (
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

export function ThinkingIndicator({ label }: { label: string }) {
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

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="py-3 animate-fade-in" data-testid="error-banner">
      <div className="ml-10 px-3 py-2.5 rounded-lg bg-danger-bg/50 border border-danger-border/50 text-danger text-sm">
        {message}
      </div>
    </div>
  );
}
