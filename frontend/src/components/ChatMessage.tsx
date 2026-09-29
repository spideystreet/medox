import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { CitedSource } from "../api/client";

interface ChatMessageProps {
  role: "human" | "ai";
  content: string;
  isStreaming?: boolean;
  sources?: CitedSource[];
}

export function ChatMessage({ role, content, isStreaming, sources }: ChatMessageProps) {
  const isUser = role === "human";

  // Detect warning banners in content
  const warning = warningLabel(content);

  // Extract SOURCES section
  const sourcesMatch = content.match(/SOURCES?\s*\n((?:CIS\s+\d+.*\n?)+)/i);
  const cited = mergeSources(content, sources);
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
            <span className="font-sans text-xs font-medium text-accent">M</span>
          </div>
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          {warning && (
            <div
              className={`mb-3 inline-flex items-center gap-2 rounded-full border py-1 pl-2 pr-2.5 text-xs ${
                warning.tone === "danger"
                  ? "border-danger-border bg-danger-bg text-danger"
                  : "border-warning-border bg-warning-bg text-warning"
              }`}
              data-testid="warning-banner"
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  warning.tone === "danger" ? "bg-danger" : "bg-warning"
                }`}
              />
              {warning.label}
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

          {cited.length > 0 && <SourceList sources={cited} />}
        </div>
      </div>
    </div>
  );
}

function warningLabel(content: string): { label: string; tone: "danger" | "warning" } | null {
  if (!content.includes("\u26a0\ufe0f")) return null;
  const lower = content.toLowerCase();
  if (lower.includes("contre-indication")) {
    return { label: "Contre-indication", tone: "danger" };
  }
  if (lower.includes("association d\u00e9conseill\u00e9e")) {
    return { label: "Association d\u00e9conseill\u00e9e", tone: "danger" };
  }
  return { label: "Alerte", tone: "warning" };
}

function mergeSources(content: string, given?: CitedSource[]): CitedSource[] {
  const seen = new Set<string>();
  const items: CitedSource[] = [];
  const add = (source: CitedSource) => {
    const key = `${source.kind}:${source.detail}`;
    if (!source.detail || seen.has(key)) return;
    seen.add(key);
    items.push(source);
  };
  for (const source of given ?? []) add(source);
  for (const match of content.match(/CIS\s+\d+/gi) ?? []) {
    add({ kind: "bdpm", title: "BDPM", detail: match.replace(/\s+/, " ") });
  }
  return items;
}

function SourceList({ sources }: { sources: CitedSource[] }) {
  const [open, setOpen] = useState(false);
  const kinds = [...new Set(sources.map((source) => source.kind))];
  const label = sources.length === 1 ? "1 source" : `${sources.length} sources`;

  return (
    <div className="mt-4">
      <button
        type="button"
        data-testid="sources-badge"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-surface-border bg-surface-raised py-1 pl-1.5 pr-3 text-xs text-text-secondary"
      >
        <span className="flex -space-x-1.5">
          {kinds.map((kind) => (
            <span key={kind} className="rounded-full ring-2 ring-surface-raised">
              <SourceMark kind={kind} />
            </span>
          ))}
        </span>
        {label}
      </button>
      {open && (
        <ul className="mt-2 space-y-1.5">
          {sources.map((source) => (
            <li key={`${source.kind}:${source.detail}`} className="flex items-center gap-2 text-sm">
              <SourceMark kind={source.kind} />
              <span className="text-text-secondary">{source.title}</span>
              <span
                className="truncate text-text-muted"
                data-testid={/^CIS\s+\d+$/i.test(source.detail) ? "cis-badge" : undefined}
              >
                {source.detail}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SourceMark({ kind }: { kind: string }) {
  if (kind === "bdpm") {
    return (
      <img
        src="/datagouv.png"
        alt=""
        className="h-4 w-4 rounded-full bg-white object-contain"
      />
    );
  }
  return (
    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#12324d] text-[8px] font-semibold text-white">
      A
    </span>
  );
}
