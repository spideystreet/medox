import { useState, useRef, useEffect } from "react";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [value]);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const canSend = value.trim().length > 0 && !disabled;

  return (
    <div className="px-4 pb-4 pt-2">
      <div
        className="
          max-w-2xl mx-auto flex items-end gap-2
          bg-surface-raised border border-surface-border/60 rounded-2xl
          pl-5 pr-2 py-2
          focus-within:border-accent/30 focus-within:shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_2px_12px_rgba(0,0,0,0.15)]
          transition-all duration-300
        "
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about drug interactions, generics..."
          disabled={disabled}
          rows={1}
          className="
            flex-1 bg-transparent text-[14px] text-text-primary py-1.5
            placeholder:text-text-muted/40 resize-none outline-none
            max-h-40 disabled:opacity-50 leading-normal
          "
          data-testid="chat-input"
        />
        <button
          onClick={handleSubmit}
          disabled={!canSend}
          className={`
            shrink-0 p-2.5 rounded-xl transition-all duration-200
            ${canSend
              ? "bg-accent text-surface hover:bg-accent/80 hover:scale-105 active:scale-95 shadow-sm"
              : "text-text-muted/20 cursor-not-allowed"
            }
          `}
          data-testid="send-btn"
          aria-label="Send message"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M8 13V3M8 3l4.5 4.5M8 3L3.5 7.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
      <p className="text-center text-[11px] text-text-muted/30 mt-2">
        Medox can make mistakes. Always verify important information.
      </p>
    </div>
  );
}
