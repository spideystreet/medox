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
      <div className="flex justify-end py-2 animate-fade-in" data-testid="user-message">
        <div className="max-w-[80%] md:max-w-[65%] px-4 py-2.5 rounded-2xl rounded-br-md bg-text-primary text-white text-sm leading-relaxed">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="py-3 animate-fade-in group" data-testid="ai-message">
      <div className="flex gap-3 max-w-full">
        {/* Avatar */}
        <div className="shrink-0 mt-0.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent/20 to-accent/5 border border-accent/10 flex items-center justify-center">
            <span className="font-serif text-sm text-accent">M</span>
          </div>
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          {hasWarning && (
            <div
              className={`
                mb-3 px-3 py-2.5 rounded-lg border text-sm flex items-center gap-2
                ${
                  hasDanger
                    ? "bg-danger-bg/50 border-danger-border/50 text-danger"
                    : "bg-warning-bg/50 border-warning-border/50 text-warning"
                }
              `}
              data-testid="warning-banner"
            >
              <span className="font-sans text-[11px] tracking-[0.14em] shrink-0">
                {hasDanger ? "DANGER" : "ALERTE"}
              </span>
            </div>
          )}

          <div className="text-[14px] text-text-primary/90 leading-[1.75]">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                strong: ({ children }) => (
                  <strong className="text-text-primary font-semibold">
                    {children}
                  </strong>
                ),
                em: ({ children }) => (
                  <em className="text-text-secondary italic">{children}</em>
                ),
                code: ({ children }) => (
                  <code className="font-mono text-[13px] bg-surface-overlay px-1.5 py-0.5 rounded text-accent-dim">
                    {children}
                  </code>
                ),
                p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
                ul: ({ children }) => (
                  <ul className="mb-3 ml-4 space-y-1 list-disc marker:text-text-muted/50">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="mb-3 ml-4 space-y-1 list-decimal marker:text-text-muted/50">
                    {children}
                  </ol>
                ),
                h3: ({ children }) => (
                  <h3 className="text-text-primary font-semibold mb-2 mt-5 text-[15px]">
                    {children}
                  </h3>
                ),
              }}
            >
              {mainContent}
            </ReactMarkdown>
            {isStreaming && (
              <span className="inline-block w-0.5 h-[18px] bg-accent ml-0.5 -mb-0.5 animate-blink" />
            )}
          </div>

          {cisCodes.length > 0 && (
            <div className="mt-4 pt-3 border-t border-surface-border/40">
              <span className="text-[10px] uppercase tracking-[0.15em] text-text-muted">
                Sources
              </span>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {cisCodes.map((cis, i) => (
                  <span
                    key={i}
                    className="font-mono text-[11px] px-2 py-0.5 rounded-md bg-surface-raised text-text-secondary"
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
    </div>
  );
}
