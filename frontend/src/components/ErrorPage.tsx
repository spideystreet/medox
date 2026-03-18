import { useState, useEffect } from "react";

export function ErrorPage() {
  const [dots, setDots] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "" : d + "."));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const handleRetry = () => {
    window.location.reload();
  };

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

      <div className="relative z-10 text-center animate-fade-in">
        {/* Pixel art heartbeat flatline */}
        <div className="mx-auto w-48 h-12 mb-8">
          <svg viewBox="0 0 192 48" className="w-full h-full">
            <polyline
              points="0,24 40,24 50,8 60,40 70,20 80,28 90,24 192,24"
              fill="none"
              stroke="#ef4444"
              strokeWidth="2"
              className="animate-pulse"
            />
          </svg>
        </div>

        <h1 className="font-pixel text-2xl md:text-3xl text-danger mb-4">
          SYSTEM DOWN
        </h1>

        <p className="text-text-secondary text-sm mb-2">
          Medox is temporarily unavailable{dots}
        </p>
        <p className="text-text-muted text-xs mb-8 max-w-sm mx-auto">
          Our servers are taking a break. We're working on getting everything
          back online.
        </p>

        <button
          onClick={handleRetry}
          className="
            inline-flex items-center gap-2 px-6 py-2.5
            bg-white text-black text-sm font-medium rounded-lg
            hover:bg-accent-dim transition-all duration-200
            pixel-shadow hover:translate-y-[-2px]
          "
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M2 8a6 6 0 0110.472-4M14 8a6 6 0 01-10.472 4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <path
              d="M13 1v3h-3M3 15v-3h3"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Retry
        </button>
      </div>
    </div>
  );
}
