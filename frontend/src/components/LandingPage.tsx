interface LandingPageProps {
  onEnter: () => void;
}

export function LandingPage({ onEnter }: LandingPageProps) {
  return (
    <div className="h-screen bg-surface flex flex-col overflow-hidden relative">
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
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white/10 animate-float"
            style={{
              left: `${15 + i * 15}%`,
              top: `${20 + (i % 3) * 25}%`,
              animationDelay: `${i * 0.8}s`,
              animationDuration: `${4 + i * 0.5}s`,
            }}
          />
        ))}
      </div>

      {/* Main content — centered */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="relative z-10 text-center max-w-2xl mx-auto">
          {/* Pixel art logo */}
          <div className="mx-auto w-20 h-20 mb-6 animate-fade-in">
            <svg viewBox="0 0 96 96" className="w-full h-full">
              <g fill="#1a1a1a">
                <rect x="46" y="0" width="4" height="96" />
                <rect x="0" y="46" width="96" height="4" />
                <rect x="12" y="12" width="4" height="4" />
                <rect x="20" y="20" width="4" height="4" />
                <rect x="28" y="28" width="4" height="4" />
                <rect x="36" y="36" width="4" height="4" />
                <rect x="56" y="36" width="4" height="4" />
                <rect x="64" y="28" width="4" height="4" />
                <rect x="72" y="20" width="4" height="4" />
                <rect x="80" y="12" width="4" height="4" />
                <rect x="12" y="80" width="4" height="4" />
                <rect x="20" y="72" width="4" height="4" />
                <rect x="28" y="64" width="4" height="4" />
                <rect x="36" y="56" width="4" height="4" />
                <rect x="56" y="56" width="4" height="4" />
                <rect x="64" y="64" width="4" height="4" />
                <rect x="72" y="72" width="4" height="4" />
                <rect x="80" y="80" width="4" height="4" />
              </g>
              <g fill="#262626">
                <rect x="30" y="46" width="4" height="4" />
                <rect x="62" y="46" width="4" height="4" />
                <rect x="46" y="30" width="4" height="4" />
                <rect x="46" y="62" width="4" height="4" />
              </g>
              <rect x="44" y="44" width="8" height="8" fill="#404040" />
              <rect x="46" y="46" width="4" height="4" fill="#555" />
            </svg>
          </div>

          <h1
            className="font-pixel text-2xl md:text-3xl text-accent pixel-glow mb-3 animate-fade-in"
            style={{ animationDelay: "0.15s" }}
          >
            Nephila
          </h1>

          <p
            className="text-text-secondary text-lg md:text-xl mb-2 animate-fade-in"
            style={{ animationDelay: "0.3s" }}
          >
            Assistant pharmaceutique intelligent
          </p>

          <p
            className="text-text-muted text-sm max-w-md mx-auto mb-8 leading-relaxed animate-fade-in"
            style={{ animationDelay: "0.45s" }}
          >
            Interactions m&eacute;dicamenteuses, g&eacute;n&eacute;riques, RCP
            &mdash; v&eacute;rifi&eacute;s en temps r&eacute;el depuis les
            donn&eacute;es BDPM &amp; ANSM.
          </p>

          <div className="animate-fade-in-up" style={{ animationDelay: "0.6s" }}>
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
          </div>

          <div
            className="flex flex-wrap justify-center gap-2.5 mt-8 animate-fade-in"
            style={{ animationDelay: "0.75s" }}
          >
            {["Interactions ANSM", "Base BDPM", "G\u00e9n\u00e9riques", "RCP"].map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 text-xs text-text-muted border border-surface-border rounded-full bg-surface-raised"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Powered by Mistral — natural footer */}
      <div
        className="relative z-10 pb-6 flex flex-col items-center gap-1.5 animate-fade-in"
        style={{ animationDelay: "0.9s" }}
      >
        <span className="text-[10px] uppercase tracking-[0.2em] text-text-muted">
          Powered by
        </span>
        <div className="flex items-center gap-2">
          <svg width="18" height="18" viewBox="0 0 20 20" className="opacity-40">
            <g fill="currentColor" className="text-white">
              <rect x="0" y="0" width="4" height="4" />
              <rect x="8" y="0" width="4" height="4" />
              <rect x="16" y="0" width="4" height="4" />
              <rect x="0" y="4" width="4" height="4" opacity="0.7" />
              <rect x="4" y="4" width="4" height="4" opacity="0.5" />
              <rect x="8" y="4" width="4" height="4" opacity="0.7" />
              <rect x="12" y="4" width="4" height="4" opacity="0.5" />
              <rect x="16" y="4" width="4" height="4" opacity="0.7" />
              <rect x="0" y="8" width="4" height="4" />
              <rect x="4" y="8" width="4" height="4" opacity="0.7" />
              <rect x="8" y="8" width="4" height="4" />
              <rect x="12" y="8" width="4" height="4" opacity="0.7" />
              <rect x="16" y="8" width="4" height="4" />
              <rect x="0" y="12" width="4" height="4" opacity="0.7" />
              <rect x="8" y="12" width="4" height="4" opacity="0.7" />
              <rect x="16" y="12" width="4" height="4" opacity="0.7" />
              <rect x="0" y="16" width="4" height="4" />
              <rect x="8" y="16" width="4" height="4" />
              <rect x="16" y="16" width="4" height="4" />
            </g>
          </svg>
          <span className="font-pixel text-pixel-xs text-text-muted opacity-60">
            Mistral AI
          </span>
        </div>
      </div>
    </div>
  );
}
