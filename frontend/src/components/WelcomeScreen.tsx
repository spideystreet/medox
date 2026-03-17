interface WelcomeScreenProps {
  onSuggestionClick: (suggestion: string) => void;
}

export function WelcomeScreen({ onSuggestionClick }: WelcomeScreenProps) {
  return (
    <div
      className="flex-1 flex flex-col items-center justify-center px-4"
      data-testid="welcome-screen"
    >
      <div className="text-center space-y-4 animate-fade-in">
        {/* Pixel art spider web icon */}
        <div className="mx-auto w-16 h-16 relative mb-2 animate-pulse-slow">
          <svg viewBox="0 0 64 64" className="w-full h-full">
            <g fill="#262626">
              {/* Simple pixel web pattern */}
              <rect x="30" y="0" width="4" height="64" />
              <rect x="0" y="30" width="64" height="4" />
              <rect x="8" y="8" width="4" height="4" />
              <rect x="12" y="12" width="4" height="4" />
              <rect x="16" y="16" width="4" height="4" />
              <rect x="20" y="20" width="4" height="4" />
              <rect x="24" y="24" width="4" height="4" />
              <rect x="36" y="24" width="4" height="4" />
              <rect x="40" y="20" width="4" height="4" />
              <rect x="44" y="16" width="4" height="4" />
              <rect x="48" y="12" width="4" height="4" />
              <rect x="52" y="8" width="4" height="4" />
              <rect x="8" y="52" width="4" height="4" />
              <rect x="12" y="48" width="4" height="4" />
              <rect x="16" y="44" width="4" height="4" />
              <rect x="20" y="40" width="4" height="4" />
              <rect x="24" y="36" width="4" height="4" />
              <rect x="36" y="36" width="4" height="4" />
              <rect x="40" y="40" width="4" height="4" />
              <rect x="44" y="44" width="4" height="4" />
              <rect x="48" y="48" width="4" height="4" />
              <rect x="52" y="52" width="4" height="4" />
            </g>
            {/* Center node */}
            <rect x="28" y="28" width="8" height="8" fill="#404040" />
          </svg>
        </div>

        <h1 className="font-pixel text-pixel-lg text-accent pixel-glow">
          Nephila
        </h1>
        <p className="text-text-secondary text-sm">
          Assistant pharmaceutique &mdash; BDPM &amp; ANSM
        </p>

        <div className="mt-8 grid gap-3 max-w-md mx-auto">
          {[
            "Quelles sont les interactions entre l'amiodarone et la warfarine ?",
            "Quels sont les g\u00e9n\u00e9riques du Doliprane ?",
            "Mon patient sous m\u00e9thotrexate peut-il prendre de l'ibuprof\u00e8ne ?",
          ].map((q, i) => (
            <button
              key={i}
              onClick={() => onSuggestionClick(q)}
              className="
                px-4 py-3 text-left text-sm text-text-secondary
                bg-surface-raised border border-surface-border rounded-lg
                hover:bg-surface-hover hover:text-text-primary hover:border-text-muted
                hover:translate-x-1
                cursor-pointer transition-all duration-200
                animate-fade-in-up
              "
              style={{ animationDelay: `${i * 100}ms` }}
              data-testid="suggestion"
            >
              {q}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
