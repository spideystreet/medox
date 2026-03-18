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

function GlitchTitle() {
  const [text, setText] = useState("");
  const [showCursor, setShowCursor] = useState(true);
  const [glitching, setGlitching] = useState(false);
  const fullText = "Medox";

  useEffect(() => {
    let i = 0;
    const typeInterval = setInterval(() => {
      if (i <= fullText.length) {
        setText(fullText.slice(0, i));
        i++;
      } else {
        clearInterval(typeInterval);
        setShowCursor(false);
        const glitchLoop = setInterval(() => {
          setGlitching(true);
          setTimeout(() => setGlitching(false), 200);
        }, 4000);
        return () => clearInterval(glitchLoop);
      }
    }, 120);
    return () => clearInterval(typeInterval);
  }, []);

  return (
    <div className="relative inline-block">
      <h1 className={`font-pixel text-3xl md:text-5xl text-accent ${glitching ? "animate-glitch" : ""}`}>
        {text}
        {showCursor && (
          <span className="inline-block w-[3px] h-[1em] bg-accent ml-1 animate-blink align-baseline" />
        )}
      </h1>
      {glitching && (
        <>
          <h1
            className="font-pixel text-3xl md:text-5xl absolute inset-0 text-red-500/30 animate-glitch-1"
            aria-hidden
          >
            {text}
          </h1>
          <h1
            className="font-pixel text-3xl md:text-5xl absolute inset-0 text-cyan-500/30 animate-glitch-2"
            aria-hidden
          >
            {text}
          </h1>
        </>
      )}
    </div>
  );
}

function GitHubIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

export function LandingPage({ onEnter }: LandingPageProps) {
  const [showContent, setShowContent] = useState(false);
  const stars = useGitHubStars();
  const version = useAppVersion();

  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="h-screen bg-surface flex flex-col overflow-hidden relative">
      {/* Scan lines overlay */}
      <div
        className="absolute inset-0 pointer-events-none z-20 opacity-[0.015]"
        style={{
          backgroundImage: "repeating-linear-gradient(0deg, #fff 0px, #fff 1px, transparent 1px, transparent 3px)",
        }}
      />

      {/* Pixel grid background */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `
          linear-gradient(#fff 1px, transparent 1px),
          linear-gradient(90deg, #fff 1px, transparent 1px)
        `,
        backgroundSize: "32px 32px",
      }} />

      {/* Floating pixel particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute bg-white/10 animate-float"
            style={{
              width: i % 3 === 0 ? "2px" : "1px",
              height: i % 3 === 0 ? "2px" : "1px",
              left: `${10 + i * 11}%`,
              top: `${15 + (i % 4) * 20}%`,
              animationDelay: `${i * 0.6}s`,
              animationDuration: `${3 + i * 0.7}s`,
            }}
          />
        ))}
      </div>

      {/* Top bar — Mistral (left) + version & GitHub (right) */}
      <div
        className={`relative z-10 pt-4 px-6 flex justify-between items-center transition-opacity duration-700 ${showContent ? "opacity-100" : "opacity-0"}`}
      >
        <div className="flex items-center gap-1.5 text-text-muted text-[10px] uppercase tracking-wider">
          Works better with
          <img src="/mistral.png" alt="Mistral AI" width="16" height="16" className="image-rendering-pixelated" />
          <span className="normal-case tracking-normal text-xs opacity-70">Mistral AI</span>
        </div>
        <div className="flex items-center gap-3">
          {version && (
            <span className="text-[10px] font-mono text-emerald-500 border border-emerald-500/30 bg-emerald-500/5 px-2 py-0.5 rounded">
              v{version}
            </span>
          )}
          <a
            href={`https://github.com/${GITHUB_REPO}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-text-muted hover:text-text-primary transition-colors"
            data-testid="github-link"
          >
            <GitHubIcon />
            {stars != null && (
              <span className="text-xs">
                {stars} <span className="text-yellow-500">&#9733;</span>
              </span>
            )}
          </a>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="relative z-10 text-center max-w-2xl mx-auto">
          {/* Glitch title */}
          <div className="mb-4">
            <GlitchTitle />
          </div>

          {/* Rest fades in after title types */}
          <div className={`transition-all duration-700 ${showContent ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            <p className="text-text-secondary text-lg md:text-xl mb-2">
              Assistant pharmaceutique intelligent
            </p>

            <p className="text-text-muted text-sm max-w-md mx-auto mb-8 leading-relaxed">
              Interactions m&eacute;dicamenteuses, g&eacute;n&eacute;riques, RCP
              &mdash; v&eacute;rifi&eacute;s en temps r&eacute;el depuis les
              donn&eacute;es BDPM &amp; ANSM.
            </p>

            <button
              onClick={onEnter}
              className="
                group relative px-8 py-3
                bg-white text-black font-medium text-sm
                rounded-lg
                hover:bg-accent-dim
                transition-all duration-200
                pixel-shadow hover:translate-y-[-2px]
              "
              data-testid="enter-app-btn"
            >
              <span className="relative z-10 flex items-center gap-2">
                Commencer
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="group-hover:translate-x-1 transition-transform">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </button>

            <div className="flex flex-wrap justify-center gap-2.5 mt-8">
              {["Interactions ANSM", "Base BDPM", "G\u00e9n\u00e9riques", "RCP"].map((tag, i) => (
                <span
                  key={tag}
                  className="px-3 py-1 text-xs text-text-muted border border-surface-border rounded-full bg-surface-raised animate-fade-in"
                  style={{ animationDelay: `${1.2 + i * 0.1}s` }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        className={`relative z-10 pb-5 flex items-center justify-center transition-opacity duration-700 ${showContent ? "opacity-100" : "opacity-0"}`}
      >
        <p className="text-[11px] text-text-muted">
          with &#10084;&#65039; by{" "}
          <a
            href="https://github.com/spideystreet"
            target="_blank"
            rel="noopener noreferrer"
            className="text-text-secondary hover:text-text-primary transition-colors underline underline-offset-2"
          >
            @spideystreet
          </a>
        </p>
      </div>
    </div>
  );
}
