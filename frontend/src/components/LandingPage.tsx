import { useState, useEffect } from "react";

interface LandingPageProps {
  onEnter: () => void;
}

function GlitchTitle() {
  const [text, setText] = useState("");
  const [showCursor, setShowCursor] = useState(true);
  const [glitching, setGlitching] = useState(false);
  const fullText = "Nephila";

  useEffect(() => {
    let i = 0;
    const typeInterval = setInterval(() => {
      if (i <= fullText.length) {
        setText(fullText.slice(0, i));
        i++;
      } else {
        clearInterval(typeInterval);
        setShowCursor(false);
        // Start periodic glitch after typing
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
      {/* Glitch layers */}
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

function SpiderWeb() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((s) => {
        if (s >= 4) {
          clearInterval(interval);
          return s;
        }
        return s + 1;
      });
    }, 300);
    return () => clearInterval(interval);
  }, []);

  return (
    <svg viewBox="0 0 96 96" className="w-full h-full">
      {/* Cross - step 1 */}
      <g fill="#262626" className={`transition-opacity duration-500 ${step >= 1 ? "opacity-100" : "opacity-0"}`}>
        <rect x="46" y="0" width="4" height="96" />
        <rect x="0" y="46" width="96" height="4" />
      </g>
      {/* Diagonals top - step 2 */}
      <g fill="#1a1a1a" className={`transition-opacity duration-500 ${step >= 2 ? "opacity-100" : "opacity-0"}`}>
        <rect x="12" y="12" width="4" height="4" />
        <rect x="20" y="20" width="4" height="4" />
        <rect x="28" y="28" width="4" height="4" />
        <rect x="36" y="36" width="4" height="4" />
        <rect x="56" y="36" width="4" height="4" />
        <rect x="64" y="28" width="4" height="4" />
        <rect x="72" y="20" width="4" height="4" />
        <rect x="80" y="12" width="4" height="4" />
      </g>
      {/* Diagonals bottom - step 3 */}
      <g fill="#1a1a1a" className={`transition-opacity duration-500 ${step >= 3 ? "opacity-100" : "opacity-0"}`}>
        <rect x="12" y="80" width="4" height="4" />
        <rect x="20" y="72" width="4" height="4" />
        <rect x="28" y="64" width="4" height="4" />
        <rect x="36" y="56" width="4" height="4" />
        <rect x="56" y="56" width="4" height="4" />
        <rect x="64" y="64" width="4" height="4" />
        <rect x="72" y="72" width="4" height="4" />
        <rect x="80" y="80" width="4" height="4" />
      </g>
      {/* Inner ring - step 3 */}
      <g fill="#333" className={`transition-opacity duration-500 ${step >= 3 ? "opacity-100" : "opacity-0"}`}>
        <rect x="30" y="46" width="4" height="4" />
        <rect x="62" y="46" width="4" height="4" />
        <rect x="46" y="30" width="4" height="4" />
        <rect x="46" y="62" width="4" height="4" />
      </g>
      {/* Center core - step 4 */}
      <g className={`transition-opacity duration-300 ${step >= 4 ? "opacity-100" : "opacity-0"}`}>
        <rect x="44" y="44" width="8" height="8" fill="#505050" />
        <rect x="46" y="46" width="4" height="4" fill="#888" />
      </g>
    </svg>
  );
}

export function LandingPage({ onEnter }: LandingPageProps) {
  const [showContent, setShowContent] = useState(false);

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

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="relative z-10 text-center max-w-2xl mx-auto">
          {/* Animated spider web */}
          <div className="mx-auto w-20 h-20 mb-8">
            <SpiderWeb />
          </div>

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

      {/* Powered by Mistral */}
      <div
        className={`relative z-10 pb-6 flex flex-col items-center gap-1.5 transition-opacity duration-700 ${showContent ? "opacity-100" : "opacity-0"}`}
      >
        <span className="text-[10px] uppercase tracking-[0.2em] text-text-muted">
          Powered by
        </span>
        <div className="flex items-center gap-2.5">
          {/* Mistral color logo — pixel "M" with yellow→orange→red gradient */}
          <svg width="20" height="20" viewBox="0 0 20 20">
            {/* Row 1 — Yellow */}
            <rect x="4" y="0" width="4" height="4" fill="#FFD700" />
            <rect x="16" y="0" width="4" height="4" fill="#FFD700" />
            {/* Row 2 — Yellow-Orange */}
            <rect x="0" y="4" width="4" height="4" fill="#FFA800" />
            <rect x="4" y="4" width="4" height="4" fill="#FFC000" />
            <rect x="12" y="4" width="4" height="4" fill="#FFA800" />
            <rect x="16" y="4" width="4" height="4" fill="#FFC000" />
            {/* Row 3 — Orange */}
            <rect x="0" y="8" width="4" height="4" fill="#FF8C00" />
            <rect x="4" y="8" width="4" height="4" fill="#FF8C00" />
            <rect x="8" y="8" width="4" height="4" fill="#FF8C00" />
            <rect x="12" y="8" width="4" height="4" fill="#FF8C00" />
            <rect x="16" y="8" width="4" height="4" fill="#FF8C00" />
            {/* Row 4 — Red-Orange */}
            <rect x="0" y="12" width="4" height="4" fill="#FF4500" />
            <rect x="8" y="12" width="4" height="4" fill="#FF4500" />
            <rect x="16" y="12" width="4" height="4" fill="#FF4500" />
            {/* Row 5 — Red */}
            <rect x="0" y="16" width="4" height="4" fill="#E00000" />
            <rect x="4" y="16" width="4" height="4" fill="#E00000" />
            <rect x="8" y="16" width="4" height="4" fill="#E00000" />
            <rect x="12" y="16" width="4" height="4" fill="#E00000" />
            <rect x="16" y="16" width="4" height="4" fill="#E00000" />
          </svg>
          <span className="text-xs text-text-muted opacity-70 tracking-wide">
            Mistral AI
          </span>
        </div>
      </div>
    </div>
  );
}
