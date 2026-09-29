import { useState, useEffect, useRef, useCallback, type FormEvent } from "react";
import { ChatMessage } from "./ChatMessage";
import { ThinkingIndicator, ErrorBanner } from "./ChatView";
import { useChatSession } from "../hooks/useChatSession";

const GITHUB_REPO = "spideystreet/medox";

const PROMPTS = [
  "Interactions amiodarone et warfarine",
  "Génériques du Doliprane",
  "Méthotrexate et ibuprofène",
];

// BDPM: bronze file mtime on data/bronze/bdpm/CIS_bdpm.txt (2026-03-23).
// ANSM: frozen thesaurus date from project docs (15 September 2023).
const DATA_FRESHNESS = "Base à jour · BDPM mars 2026 · ANSM 15 sept. 2023";

const STORAGE_KEY = "medox:activeThread";

function clearStoredThreadId() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // localStorage unavailable
  }
}

function useGitHubStars() {
  const [stars, setStars] = useState<number | null>(null);

  useEffect(() => {
    fetch(`https://api.github.com/repos/${GITHUB_REPO}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.stargazers_count != null) setStars(data.stargazers_count);
      })
      .catch(() => {});
  }, []);

  return stars;
}

function useAppVersion() {
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    fetch(`https://raw.githubusercontent.com/${GITHUB_REPO}/main/pyproject.toml`)
      .then((res) => (res.ok ? res.text() : null))
      .then((text) => {
        if (!text) return;
        const match = text.match(/version\s*=\s*"([^"]+)"/);
        if (match) setVersion(match[1]);
      })
      .catch(() => {});
  }, []);

  return version;
}

function GitHubIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

export function LandingPage() {
  const stars = useGitHubStars();
  const version = useAppVersion();
  const [sessionKey, setSessionKey] = useState(0);

  useEffect(() => {
    clearStoredThreadId();
  }, []);

  const resetToLanding = () => {
    clearStoredThreadId();
    setSessionKey((k) => k + 1);
  };

  return (
    <div className="min-h-screen bg-surface text-text-primary" data-testid="landing">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <button
          type="button"
          onClick={resetToLanding}
          className="font-sans text-lg font-medium tracking-tight hover:text-accent transition-colors"
          aria-label="Medox — retour à l'accueil"
        >
          Medox
        </button>
        <div className="flex items-center gap-4 text-sm text-text-muted">
          {version && <span className="font-mono text-xs">v{version}</span>}
          <a
            href={`https://github.com/${GITHUB_REPO}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 hover:text-text-primary transition-colors"
            aria-label="GitHub"
            data-testid="github-link"
          >
            <GitHubIcon />
            {stars != null && <span className="text-xs">{stars}</span>}
          </a>
        </div>
      </header>

      <LandingComposer key={sessionKey} />

      <footer className="px-6 pb-8 text-center text-xs leading-5 text-text-muted">
        <p>Outil expérimental. Il ne remplace pas l&apos;avis d&apos;un professionnel de santé.</p>
        <a
          href="https://github.com/spideystreet"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-block underline underline-offset-2 hover:text-text-primary"
        >
          @spideystreet
        </a>
      </footer>
    </div>
  );
}

function LandingComposer() {
  const [draft, setDraft] = useState("");
  // Always open the full landing. Do not restore a prior thread (that gutted the LP).
  const [threadId, setThreadId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleThreadCreated = useCallback((id: string) => {
    setThreadId(id || null);
  }, []);

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
  } = useChatSession({ threadId, onThreadCreated: handleThreadCreated });

  useEffect(() => {
    if (!hasMessages) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [displayMessages.length, typewriterDisplayed, activity, hasMessages]);

  const ask = (prompt?: string) => {
    const value = (prompt ?? draft).trim();
    if (!value || isStreaming) return;
    setDraft("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    void handleSend(value);
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    ask();
  };

  return (
    <main className="mx-auto max-w-3xl px-6 pb-16 pt-12 md:pt-20">
      <div
        className={`
          overflow-hidden transition-[max-height,opacity,transform] duration-500 ease-out
          ${
            hasMessages
              ? "max-h-0 opacity-0 -translate-y-3 pointer-events-none"
              : "max-h-[28rem] opacity-100 translate-y-0"
          }
        `}
        aria-hidden={hasMessages}
      >
        <p className="text-center text-xs font-medium uppercase tracking-[0.18em] text-accent">
          Agent pharmaceutique
        </p>
        <h1 className="mx-auto mt-4 max-w-xl text-center font-sans text-5xl font-medium tracking-[-0.045em] text-text-primary md:text-6xl">
          Ne cherchez plus.
          <br />
          Demandez.
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-center text-base leading-relaxed text-text-secondary">
          Il interroge la BDPM et le thésaurus ANSM, puis répond avec le niveau
          de contrainte et le code CIS.
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        data-testid="composer"
        className={`
          mx-auto flex flex-col rounded-[28px] border border-surface-border
          bg-surface-overlay p-3 shadow-soft
          transition-[margin,min-height] duration-500 ease-out
          ${hasMessages ? "mt-2 min-h-[min(58vh,32rem)]" : "mt-10"}
        `}
      >
        <div
          className={`
            grid transition-[grid-template-rows] duration-500 ease-out
            ${hasMessages ? "grid-rows-[1fr] flex-1" : "grid-rows-[0fr]"}
          `}
        >
          <div className="min-h-0 overflow-hidden">
            <div
              className="max-h-[min(52vh,28rem)] overflow-y-auto px-2 pb-3 pt-1"
              data-testid="composer-thread"
            >
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
        </div>

        {!hasMessages && (
          <div className="mb-2 flex items-center gap-2 px-3 pt-2 text-xs text-text-muted">
            <span className="thinking-mark" aria-hidden="true" />
            Agent prêt · sources officielles
          </div>
        )}

        <div className="mt-auto flex items-center gap-2 rounded-2xl bg-surface px-3 py-2">
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              const el = event.target;
              el.style.height = "auto";
              el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                ask();
              }
            }}
            rows={1}
            disabled={isStreaming}
            placeholder="Une interaction, un générique, une notice..."
            className="flex-1 resize-none bg-transparent px-2 py-2 text-base leading-6 text-text-primary outline-none placeholder:text-text-muted disabled:opacity-50"
            aria-label="Question pour l'agent"
            data-testid="chat-input"
          />
          <button
            type="submit"
            disabled={!draft.trim() || isStreaming}
            className="shrink-0 rounded-full bg-accent px-4 py-2 text-sm font-medium leading-6 text-white hover:bg-accent-dim disabled:opacity-40 disabled:hover:bg-accent"
            data-testid="send-btn"
          >
            Envoyer
          </button>
        </div>

        <div
          className={`
            grid transition-[grid-template-rows,opacity] duration-500 ease-out
            ${hasMessages ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100"}
          `}
        >
          <div className="min-h-0 overflow-hidden">
            <div className="mt-3 flex flex-wrap justify-center gap-2 px-1 pb-1">
              {PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => ask(prompt)}
                  className="rounded-full border border-surface-border bg-surface px-3 py-1.5 text-xs text-text-secondary transition-colors hover:border-accent/40 hover:text-text-primary"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        </div>
      </form>

      <div
        className={`
          transition-[opacity,transform,margin] duration-500 ease-out
          ${hasMessages ? "opacity-0 -translate-y-2 pointer-events-none h-0 mt-0 overflow-hidden" : "opacity-100 translate-y-0 mt-3"}
        `}
      >
        <p
          className="mx-auto text-center text-[11px] leading-4 text-text-muted/70"
          data-testid="data-freshness"
        >
          {DATA_FRESHNESS}
        </p>
      </div>

      <div
        className={`
          flex items-center justify-center gap-6 transition-[margin,opacity] duration-500 ease-out
          ${hasMessages ? "mt-6 opacity-70" : "mt-8 opacity-100"}
        `}
      >
        <div className="flex items-center gap-2">
          <img src="/mistral.png" alt="" width="20" height="20" />
          <span className="text-sm text-text-secondary">Mistral AI</span>
        </div>
        <span className="text-text-muted">·</span>
        <div className="flex items-center gap-2">
          <img src="/datagouv.png" alt="" height="20" className="h-5 w-auto" />
          <span className="text-sm text-text-secondary">data.gouv.fr</span>
        </div>
      </div>
    </main>
  );
}
