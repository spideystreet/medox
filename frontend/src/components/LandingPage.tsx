import { useState, useEffect } from "react";

const GITHUB_REPO = "spideystreet/medox";

interface LandingPageProps {
  onEnter: () => void;
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

export function LandingPage({ onEnter }: LandingPageProps) {
  const stars = useGitHubStars();
  const version = useAppVersion();

  return (
    <div className="min-h-screen bg-surface text-text-primary">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <span className="font-sans text-lg font-medium tracking-tight">Medox</span>
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

      <main className="mx-auto grid min-h-[calc(100vh-9rem)] max-w-6xl items-center gap-16 px-6 py-10 md:grid-cols-[1.1fr_0.9fr]">
        <section className="animate-fade-in">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-accent">
            BDPM · ANSM
          </p>
          <h1 className="mt-4 font-sans text-6xl font-medium tracking-[-0.04em] text-text-primary md:text-7xl">
            Medox
          </h1>
          <p className="mt-4 text-xl text-text-secondary">
            Assistant pharmaceutique intelligent
          </p>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-text-muted">
            Interactions, génériques et informations importantes, lus dans les
            bases officielles. Chaque réponse cite un code CIS et le niveau de
            contrainte ANSM.
          </p>
          <button
            onClick={onEnter}
            className="mt-8 rounded-full bg-accent px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-accent-dim"
            data-testid="enter-app-btn"
          >
            Commencer
          </button>
          <div className="mt-10 flex items-center gap-6">
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
        </section>

        <aside className="animate-fade-in-up rounded-3xl border border-surface-border bg-surface-overlay p-6 shadow-soft">
          <p className="text-[11px] uppercase tracking-[0.16em] text-text-muted">
            Exemple d&apos;interface
          </p>
          <p className="mt-4 text-sm text-text-secondary">
            Quelles sont les interactions entre l&apos;amiodarone et la warfarine ?
          </p>
          <div className="mt-5 rounded-2xl bg-surface px-4 py-4">
            <p className="text-sm leading-relaxed text-text-primary">
              La réponse est produite à partir du thésaurus ANSM, avec le niveau
              de contrainte et le code CIS. Medox ne complète pas avec des
              connaissances hors source.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full border border-surface-border px-2.5 py-1 font-mono text-[11px] text-text-secondary">
                Niveau ANSM
              </span>
              <span className="rounded-full border border-surface-border px-2.5 py-1 font-mono text-[11px] text-text-secondary">
                CIS
              </span>
            </div>
          </div>
        </aside>
      </main>

      <footer className="px-6 pb-8 text-center text-xs leading-5 text-text-muted">
        <p>Outil expérimental.</p>
        <p>Il ne remplace pas l&apos;avis d&apos;un professionnel de santé.</p>
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
