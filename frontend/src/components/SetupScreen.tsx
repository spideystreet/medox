import { useState } from "react";

interface SetupScreenProps {
  onSave: (apiKey: string) => void;
}

export function SetupScreen({ onSave }: SetupScreenProps) {
  const [key, setKey] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = key.trim();
    if (!trimmed) {
      setError("API key is required");
      return;
    }
    if (trimmed.length < 10) {
      setError("This doesn't look like a valid API key");
      return;
    }
    onSave(trimmed);
  };

  return (
    <div className="h-screen bg-surface flex flex-col items-center justify-center px-6 relative">
      {/* Pixel grid background */}
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

      <div className="relative z-10 w-full max-w-md mx-auto animate-fade-in">
        <div className="text-center mb-8">
          <h1 className="font-pixel text-pixel-lg text-accent mb-3">
            SETUP
          </h1>
          <p className="text-text-secondary text-sm">
            Medox uses your own API key to query LLMs.
            <br />
            Your key stays in your browser — never stored on our servers.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-text-muted uppercase tracking-wider mb-2">
              OpenRouter or Mistral API Key
            </label>
            <input
              type="password"
              value={key}
              onChange={(e) => {
                setKey(e.target.value);
                setError("");
              }}
              placeholder="sk-or-... or ..."
              className="
                w-full px-4 py-3 text-sm
                bg-surface-raised border border-surface-border rounded-lg
                text-text-primary placeholder:text-text-muted
                outline-none focus:border-text-muted
                transition-colors duration-150
              "
              data-testid="api-key-input"
              autoFocus
            />
            {error && (
              <p className="mt-2 text-xs text-danger">{error}</p>
            )}
          </div>

          <button
            type="submit"
            className="
              w-full px-4 py-3 text-sm font-medium
              bg-white text-black rounded-lg
              hover:bg-accent-dim
              transition-all duration-200
              pixel-shadow hover:translate-y-[-1px]
            "
            data-testid="save-key-btn"
          >
            Start using Medox
          </button>
        </form>

        <div className="mt-6 text-center space-y-2">
          <p className="text-[11px] text-text-muted">
            Get a key from{" "}
            <a
              href="https://openrouter.ai/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-secondary underline underline-offset-2 hover:text-text-primary transition-colors"
            >
              OpenRouter
            </a>
            {" "}or{" "}
            <a
              href="https://console.mistral.ai/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-secondary underline underline-offset-2 hover:text-text-primary transition-colors"
            >
              Mistral AI
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
