interface WelcomeScreenProps {
  onSuggestionClick: (suggestion: string) => void;
}

const suggestions = [
  {
    text: "Quelles sont les interactions entre l'amiodarone et la warfarine ?",
    label: "Interactions",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M6 2v12M10 2v12M2 6h12M2 10h12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    text: "Quels sont les génériques du Doliprane ?",
    label: "Génériques",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="2" y="4" width="12" height="8" rx="4" stroke="currentColor" strokeWidth="1.2" />
        <line x1="8" y1="4" x2="8" y2="12" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    ),
  },
  {
    text: "Mon patient sous méthotrexate peut-il prendre de l'ibuprofène ?",
    label: "Cas clinique",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M8 1v6M8 15V9M5 8h6M1 8h2M13 8h2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    text: "Quels médicaments contiennent du paracétamol comme principe actif ?",
    label: "Recherche",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.2" />
        <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
  },
];

export function WelcomeScreen({ onSuggestionClick }: WelcomeScreenProps) {
  return (
    <div
      className="flex-1 flex flex-col items-center justify-center px-4 pb-8"
      data-testid="welcome-screen"
    >
      <div className="text-center max-w-2xl w-full animate-fade-in">
        {/* Greeting */}
        <div className="mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5 border border-accent/10 mb-5">
            <span className="font-serif text-lg text-accent">M</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-light text-text-primary mb-2 tracking-tight">
            How can I help you?
          </h1>
          <p className="text-text-muted text-sm">
            Drug interactions, generics, compositions — powered by BDPM & ANSM
          </p>
        </div>

        {/* Suggestion grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-xl mx-auto">
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => onSuggestionClick(s.text)}
              className="
                group relative text-left px-4 py-3.5
                bg-surface-raised/50 border border-surface-border/40 rounded-xl
                hover:bg-surface-raised hover:border-surface-border/80
                hover:shadow-lg hover:shadow-black/5
                cursor-pointer transition-all duration-200 ease-out
                hover:-translate-y-0.5
                animate-fade-in-up
              "
              style={{ animationDelay: `${i * 60}ms` }}
              data-testid="suggestion"
            >
              <div className="flex items-start gap-3">
                <span className="shrink-0 mt-0.5 text-text-muted/50 group-hover:text-accent/70 transition-colors">
                  {s.icon}
                </span>
                <div className="min-w-0">
                  <span className="text-[10px] uppercase tracking-widest text-text-muted/40 group-hover:text-text-muted/60 transition-colors">
                    {s.label}
                  </span>
                  <p className="text-sm text-text-secondary group-hover:text-text-primary leading-snug mt-0.5 transition-colors">
                    {s.text}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
