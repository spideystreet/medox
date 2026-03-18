import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

const GLITCH_CHARS = "!@#$%^&*()_+-=[]{}|;:,.<>?/~`";

function GlitchText({ text }: { text: string }) {
  const [display, setDisplay] = useState(text);
  const [glitching, setGlitching] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setGlitching(true);
      let ticks = 0;
      const glitch = setInterval(() => {
        setDisplay(
          text
            .split("")
            .map((ch) =>
              Math.random() > 0.6
                ? GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)]
                : ch,
            )
            .join(""),
        );
        ticks++;
        if (ticks > 4) {
          clearInterval(glitch);
          setDisplay(text);
          setGlitching(false);
        }
      }, 60);
    }, 3000);
    return () => clearInterval(interval);
  }, [text]);

  return (
    <span className={glitching ? "text-danger" : ""}>{display}</span>
  );
}

export function NotFoundPage() {
  return (
    <div className="h-screen bg-surface flex flex-col items-center justify-center px-6 relative">
      {/* Pixel grid */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(#fff 1px, transparent 1px),
            linear-gradient(90deg, #fff 1px, transparent 1px)
          `,
          backgroundSize: "32px 32px",
        }}
      />

      {/* Scan lines */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.015]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, #fff 0px, #fff 1px, transparent 1px, transparent 3px)",
        }}
      />

      <div className="relative z-10 text-center animate-fade-in">
        {/* Big 404 */}
        <h1 className="font-pixel text-6xl md:text-8xl text-accent mb-6 pixel-glow">
          <GlitchText text="404" />
        </h1>

        {/* Pixel art broken pill */}
        <div className="mx-auto w-16 h-16 mb-6">
          <svg viewBox="0 0 64 64" className="w-full h-full">
            {/* Left half */}
            <rect x="12" y="24" width="16" height="4" fill="#333" />
            <rect x="12" y="28" width="16" height="4" fill="#333" />
            <rect x="12" y="32" width="16" height="4" fill="#333" />
            <rect x="12" y="36" width="16" height="4" fill="#333" />
            <rect x="8" y="28" width="4" height="8" fill="#333" />
            {/* Gap */}
            <rect x="30" y="30" width="4" height="4" fill="#262626" />
            {/* Right half — shifted down */}
            <rect x="36" y="28" width="16" height="4" fill="#444" />
            <rect x="36" y="32" width="16" height="4" fill="#444" />
            <rect x="36" y="36" width="16" height="4" fill="#444" />
            <rect x="36" y="40" width="16" height="4" fill="#444" />
            <rect x="52" y="32" width="4" height="8" fill="#444" />
          </svg>
        </div>

        <p className="font-pixel text-pixel-sm text-text-secondary mb-2">
          PAGE NOT FOUND
        </p>
        <p className="text-text-muted text-sm mb-8 max-w-sm mx-auto">
          This route doesn't exist. Maybe the prescription was wrong.
        </p>

        <Link
          to="/"
          className="
            inline-flex items-center gap-2 px-6 py-2.5
            bg-white text-black text-sm font-medium rounded-lg
            hover:bg-accent-dim transition-all duration-200
            pixel-shadow hover:translate-y-[-2px]
          "
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            className="rotate-180"
          >
            <path
              d="M3 8h10M9 4l4 4-4 4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Back to Medox
        </Link>
      </div>
    </div>
  );
}
