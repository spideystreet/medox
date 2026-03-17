import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ChatMessageProps {
  role: "human" | "ai";
  content: string;
  isStreaming?: boolean;
}

export function ChatMessage({ role, content, isStreaming }: ChatMessageProps) {
  const isUser = role === "human";

  // Detect warning banners in content
  const hasWarning = content.includes("\u26a0\ufe0f");
  const hasDanger =
    content.toLowerCase().includes("contre-indication") ||
    content.toLowerCase().includes("association d\u00e9conseill\u00e9e");

  // Extract SOURCES section
  const sourcesMatch = content.match(/SOURCES?\s*\n((?:CIS\s+\d+.*\n?)+)/i);
  const cisCodes = sourcesMatch
    ? sourcesMatch[1].match(/CIS\s+\d+/g) || []
    : [];
  const mainContent = sourcesMatch
    ? content.slice(0, sourcesMatch.index).trim()
    : content;

  if (isUser) {
    return (
      <div className="flex justify-end mb-4" data-testid="user-message">
        <div className="max-w-[80%] md:max-w-[60%] px-4 py-3 rounded-2xl rounded-br-sm bg-surface-overlay border border-surface-border text-text-primary text-sm">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start mb-6" data-testid="ai-message">
      <div className="max-w-[85%] md:max-w-[70%]">
        {hasWarning && (
          <div
            className={`
              mb-3 px-4 py-3 rounded-lg border text-sm
              ${
                hasDanger
                  ? "bg-danger-bg border-danger-border text-danger"
                  : "bg-warning-bg border-warning-border text-warning"
              }
            `}
            data-testid="warning-banner"
          >
            <span className="font-pixel text-pixel-xs mr-2">
              {hasDanger ? "DANGER" : "ALERTE"}
            </span>
          </div>
        )}

        <div className="prose-nephila text-sm text-text-primary leading-relaxed">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              strong: ({ children }) => (
                <strong className="text-accent font-semibold">
                  {children}
                </strong>
              ),
              em: ({ children }) => (
                <em className="text-text-secondary italic">{children}</em>
              ),
              code: ({ children }) => (
                <code className="font-mono text-xs bg-surface-overlay px-1.5 py-0.5 rounded text-accent-dim">
                  {children}
                </code>
              ),
              p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
              ul: ({ children }) => (
                <ul className="mb-3 ml-4 space-y-1 list-disc marker:text-text-muted">
                  {children}
                </ul>
              ),
              ol: ({ children }) => (
                <ol className="mb-3 ml-4 space-y-1 list-decimal marker:text-text-muted">
                  {children}
                </ol>
              ),
              h3: ({ children }) => (
                <h3 className="text-accent font-semibold mb-2 mt-4">
                  {children}
                </h3>
              ),
            }}
          >
            {mainContent}
          </ReactMarkdown>
          {isStreaming && (
            <span className="inline-block w-2 h-4 bg-text-primary ml-0.5 animate-pulse" />
          )}
        </div>

        {cisCodes.length > 0 && (
          <div className="mt-3 pt-3 border-t border-surface-border">
            <span className="text-[10px] uppercase tracking-widest text-text-muted mr-2">
              Sources
            </span>
            <div className="inline-flex flex-wrap gap-1.5 mt-1">
              {cisCodes.map((cis, i) => (
                <span
                  key={i}
                  className="font-mono text-xs px-2 py-0.5 rounded bg-surface-overlay border border-surface-border text-text-secondary"
                  data-testid="cis-badge"
                >
                  {cis}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
