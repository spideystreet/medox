import { useState, useEffect, useRef } from "react";
import { getApiKey, setApiKey, clearApiKey } from "../api/keys";
import { useThreads, useDeleteAllThreads } from "../api/hooks";

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
  onKeyCleared: () => void;
  onChatsDeleted: () => void;
}

export function SettingsDialog({
  open,
  onClose,
  onKeyCleared,
  onChatsDeleted,
}: SettingsDialogProps) {
  const [key, setKey] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: threads } = useThreads();
  const deleteAll = useDeleteAllThreads();

  const currentKey = getApiKey();
  const maskedKey = currentKey
    ? currentKey.slice(0, 8) + "..." + currentKey.slice(-4)
    : null;

  useEffect(() => {
    if (open) {
      setKey("");
      setSaved(false);
      setError("");
      setConfirmDeleteAll(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const handleSaveKey = (e: React.FormEvent) => {
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
    setApiKey(trimmed);
    setKey("");
    setSaved(true);
    setError("");
    setTimeout(() => setSaved(false), 2000);
  };

  const handleRemoveKey = () => {
    clearApiKey();
    onKeyCleared();
  };

  const handleDeleteAllChats = async () => {
    if (!confirmDeleteAll) {
      setConfirmDeleteAll(true);
      setTimeout(() => setConfirmDeleteAll(false), 3000);
      return;
    }
    const ids = threads?.map((t) => t.thread_id) ?? [];
    await deleteAll.mutateAsync(ids);
    setConfirmDeleteAll(false);
    onChatsDeleted();
  };

  const threadCount = threads?.length ?? 0;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      data-testid="settings-dialog"
    >
      <div className="w-full max-w-md bg-surface-raised border border-surface-border rounded-xl p-6 animate-fade-in max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-pixel text-pixel-xs text-text-primary tracking-wider">
            SETTINGS
          </h2>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary transition-colors"
            aria-label="Close settings"
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <path
                d="M5 5l10 10M15 5L5 15"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="space-y-6">
          {/* --- API Key --- */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-text-muted">
                <path
                  d="M10.5 1.5a3.5 3.5 0 00-2.83 5.54L2 12.71V14.5h2v-1.5h1.5V11.5H7l1.17-1.17A3.5 3.5 0 1010.5 1.5zm1 3a1 1 0 110-2 1 1 0 010 2z"
                  stroke="currentColor"
                  strokeWidth="1"
                  strokeLinejoin="round"
                />
              </svg>
              <h3 className="text-xs text-text-muted uppercase tracking-wider font-medium">
                API Key
              </h3>
            </div>

            {maskedKey && (
              <div className="flex items-center justify-between px-3 py-2 mb-2 bg-surface/50 border border-surface-border/30 rounded-lg">
                <span className="text-xs text-text-muted font-mono">{maskedKey}</span>
                <span className="text-[10px] text-accent/70 uppercase tracking-wider">Active</span>
              </div>
            )}

            <form onSubmit={handleSaveKey} className="space-y-2.5">
              <input
                ref={inputRef}
                type="password"
                value={key}
                onChange={(e) => {
                  setKey(e.target.value);
                  setError("");
                  setSaved(false);
                }}
                placeholder={maskedKey ? "Enter new key to replace..." : "Enter API key..."}
                className="
                  w-full px-3 py-2.5 text-sm
                  bg-surface border border-surface-border rounded-lg
                  text-text-primary placeholder:text-text-muted
                  outline-none focus:border-text-muted
                  transition-colors duration-150
                "
                data-testid="settings-api-key-input"
              />
              {error && <p className="text-xs text-danger">{error}</p>}
              {saved && <p className="text-xs text-accent">Key updated.</p>}

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="
                    flex-1 px-3 py-2 text-sm font-medium
                    bg-white text-black rounded-lg
                    hover:bg-accent-dim
                    transition-all duration-150
                  "
                  data-testid="settings-save-btn"
                >
                  Save key
                </button>
                {maskedKey && (
                  <button
                    type="button"
                    onClick={handleRemoveKey}
                    className="
                      px-3 py-2 text-sm
                      border border-surface-border rounded-lg
                      text-danger hover:bg-danger/10
                      transition-all duration-150
                    "
                    data-testid="settings-remove-btn"
                  >
                    Remove
                  </button>
                )}
              </div>
            </form>

            <p className="mt-2 text-[11px] text-text-muted">
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
              . Stored locally in your browser.
            </p>
          </section>

          <hr className="border-surface-border/30" />

          {/* --- Conversations --- */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-text-muted">
                <path
                  d="M2 3a1 1 0 011-1h10a1 1 0 011 1v8a1 1 0 01-1 1H5l-3 3V3z"
                  stroke="currentColor"
                  strokeWidth="1"
                  strokeLinejoin="round"
                />
              </svg>
              <h3 className="text-xs text-text-muted uppercase tracking-wider font-medium">
                Conversations
              </h3>
            </div>

            <div className="flex items-center justify-between px-3 py-2.5 bg-surface/50 border border-surface-border/30 rounded-lg">
              <div>
                <p className="text-sm text-text-secondary">
                  {threadCount} conversation{threadCount !== 1 ? "s" : ""}
                </p>
                <p className="text-[11px] text-text-muted">
                  Stored on server
                </p>
              </div>
              <button
                onClick={handleDeleteAllChats}
                disabled={threadCount === 0 || deleteAll.isPending}
                className={`
                  px-3 py-1.5 text-xs rounded-lg
                  border transition-all duration-150
                  disabled:opacity-30 disabled:cursor-not-allowed
                  ${
                    confirmDeleteAll
                      ? "text-danger border-danger/50 bg-danger/10 hover:bg-danger/20"
                      : "text-text-muted border-surface-border hover:text-danger hover:border-danger/40"
                  }
                `}
                data-testid="delete-all-btn"
              >
                {deleteAll.isPending
                  ? "Deleting..."
                  : confirmDeleteAll
                    ? "Confirm"
                    : "Delete all"}
              </button>
            </div>
          </section>

          <hr className="border-surface-border/30" />

          {/* --- About --- */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-text-muted">
                <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1" />
                <path d="M8 7v4M8 5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <h3 className="text-xs text-text-muted uppercase tracking-wider font-medium">
                About
              </h3>
            </div>

            <div className="space-y-1.5 text-[11px] text-text-muted">
              <div className="flex justify-between">
                <span>Version</span>
                <span className="text-text-secondary font-mono">0.2.3</span>
              </div>
              <div className="flex justify-between">
                <span>Data sources</span>
                <span className="text-text-secondary">BDPM + ANSM</span>
              </div>
              <div className="flex justify-between">
                <span>Model</span>
                <span className="text-text-secondary font-mono">ministral-8b</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
