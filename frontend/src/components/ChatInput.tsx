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

  return (
    <div className="px-4 pb-4 pt-2">
      <div
        className="
          max-w-3xl mx-auto flex items-center gap-2
          bg-surface-raised border border-surface-border rounded-xl
          px-4 py-2.5
          focus-within:border-text-muted transition-colors duration-150
        "
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Posez votre question..."
          disabled={disabled}
          rows={1}
          className="
            flex-1 bg-transparent text-sm text-text-primary
            placeholder:text-text-muted resize-none outline-none
            max-h-40 disabled:opacity-50
          "
          data-testid="chat-input"
        />
        <button
          onClick={handleSubmit}
          disabled={disabled || !value.trim()}
          className="
            shrink-0 p-2 rounded-lg
            text-text-muted hover:text-text-primary
            disabled:opacity-30 disabled:cursor-not-allowed
            transition-colors duration-150
          "
          data-testid="send-btn"
          aria-label="Send message"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path
              d="M9 15V3M9 3l5 5M9 3L4 8"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
      <p className="text-center text-[11px] text-text-muted mt-2">
        Medox peut faire des erreurs. V&eacute;rifiez les informations
        importantes.
      </p>
    </div>
  );
}
