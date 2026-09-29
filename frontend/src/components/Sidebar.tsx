import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useThreads, useCreateThread, useDeleteThread } from "../api/hooks";
import type { Thread } from "../api/client";

interface SidebarProps {
  activeThreadId: string | null;
  onSelectThread: (threadId: string) => void;
  onNewChat: (threadId: string) => void;
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
}

export function Sidebar({
  activeThreadId,
  onSelectThread,
  onNewChat,
  isOpen,
  onClose,
  onOpenSettings,
}: SidebarProps) {
  const { data: threads, isLoading } = useThreads();
  const createThread = useCreateThread();
  const deleteThread = useDeleteThread();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleNewChat = async () => {
    const thread = await createThread.mutateAsync();
    onNewChat(thread.thread_id);
  };

  const handleDelete = async (e: React.MouseEvent, threadId: string) => {
    e.stopPropagation();
    if (deletingId === threadId) {
      await deleteThread.mutateAsync(threadId);
      setDeletingId(null);
      if (activeThreadId === threadId) {
        onSelectThread("");
      }
    } else {
      setDeletingId(threadId);
      setTimeout(() => setDeletingId(null), 3000);
    }
  };

  const getThreadTitle = (thread: Thread) => {
    const title = thread.metadata?.title;
    if (typeof title === "string" && title.length > 0) return title;
    return "New conversation";
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden"
          onClick={onClose}
          data-testid="sidebar-overlay"
        />
      )}

      <aside
        className={`
          fixed md:relative z-50 h-full w-[260px]
          bg-surface-raised border-r border-surface-border/50
          flex flex-col transition-transform duration-200 ease-out
          ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
        data-testid="sidebar"
      >
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <Link to="/" className="font-sans text-lg font-medium tracking-tight text-text-primary hover:text-accent transition-colors">
              Medox
            </Link>
            <button
              className="md:hidden text-text-muted hover:text-text-primary transition-colors"
              onClick={onClose}
              aria-label="Close sidebar"
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

          <button
            onClick={handleNewChat}
            disabled={createThread.isPending}
            className="
              w-full px-3 py-2 text-sm
              border border-surface-border/60 rounded-lg
              text-text-secondary hover:text-text-primary hover:bg-surface-hover hover:border-surface-border
              transition-all duration-150
              disabled:opacity-50 disabled:cursor-not-allowed
              flex items-center gap-2
            "
            data-testid="new-chat-btn"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path
                d="M8 3v10M3 8h10"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            New conversation
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2">
          {isLoading && (
            <div className="px-2 py-3 space-y-1.5">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-8 bg-surface-overlay/50 rounded-lg animate-pulse"
                />
              ))}
            </div>
          )}

          {threads && threads.length === 0 && (
            <p className="px-3 py-4 text-sm text-text-muted/50">
              No conversations yet
            </p>
          )}

          <div className="space-y-0.5 pb-2">
            {threads?.map((thread) => (
              <div
                key={thread.thread_id}
                onClick={() => onSelectThread(thread.thread_id)}
                className={`
                  group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer
                  transition-colors duration-100
                  ${
                    activeThreadId === thread.thread_id
                      ? "bg-surface-overlay/70 text-text-primary"
                      : "text-text-muted hover:bg-surface-hover hover:text-text-secondary"
                  }
                `}
                data-testid="thread-item"
              >
                <span className="flex-1 text-sm truncate">
                  {getThreadTitle(thread)}
                </span>
                <button
                  onClick={(e) => handleDelete(e, thread.thread_id)}
                  className={`
                    shrink-0 p-1 rounded transition-all duration-150
                    ${
                      deletingId === thread.thread_id
                        ? "text-danger opacity-100"
                        : "opacity-0 group-hover:opacity-100 text-text-muted hover:text-text-primary"
                    }
                  `}
                  aria-label="Delete conversation"
                  data-testid="delete-thread-btn"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path
                      d="M3 3.5h8M5.5 3.5V2.5a1 1 0 011-1h1a1 1 0 011 1v1M5.5 6v4M8.5 6v4M4 3.5l.5 8a1 1 0 001 1h3a1 1 0 001-1l.5-8"
                      stroke="currentColor"
                      strokeWidth="1"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="p-3 border-t border-surface-border/30">
          <button
            onClick={onOpenSettings}
            className="
              w-full flex items-center gap-2.5 px-3 py-2 rounded-lg
              text-text-muted hover:text-text-primary hover:bg-surface-hover
              transition-all duration-150
            "
            aria-label="Settings"
            data-testid="settings-btn"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="shrink-0">
              <path
                d="M12 15a3 3 0 100-6 3 3 0 000 6z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="text-sm">Settings</span>
          </button>
        </div>
      </aside>
    </>
  );
}
