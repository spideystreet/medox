import { useState } from "react";
import { useThreads, useCreateThread, useDeleteThread } from "../api/hooks";
import type { Thread } from "../api/client";

interface SidebarProps {
  activeThreadId: string | null;
  onSelectThread: (threadId: string) => void;
  onNewChat: (threadId: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({
  activeThreadId,
  onSelectThread,
  onNewChat,
  isOpen,
  onClose,
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
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
          data-testid="sidebar-overlay"
        />
      )}

      <aside
        className={`
          fixed md:relative z-50 h-full w-72
          bg-surface-raised border-r border-surface-border
          flex flex-col transition-transform duration-200 ease-out
          ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
        data-testid="sidebar"
      >
        <div className="p-4 border-b border-surface-border">
          <div className="flex items-center justify-between mb-4">
            <h1 className="font-pixel text-pixel-sm text-accent pixel-glow tracking-wider">
              NEPHILA
            </h1>
            <button
              className="md:hidden text-text-muted hover:text-text-primary"
              onClick={onClose}
              aria-label="Close sidebar"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M5 5l10 10M15 5L5 15"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
              </svg>
            </button>
          </div>

          <button
            onClick={handleNewChat}
            disabled={createThread.isPending}
            className="
              w-full px-3 py-2.5 text-sm font-medium
              bg-surface-overlay border border-surface-border rounded-lg
              text-text-primary hover:bg-surface-hover hover:border-text-muted
              transition-colors duration-150
              disabled:opacity-50 disabled:cursor-not-allowed
              flex items-center gap-2
            "
            data-testid="new-chat-btn"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
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

        <div className="flex-1 overflow-y-auto py-2">
          <div className="px-3 py-1.5">
            <span className="text-[10px] font-medium uppercase tracking-widest text-text-muted">
              Conversations
            </span>
          </div>

          {isLoading && (
            <div className="px-4 py-3">
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-8 bg-surface-overlay rounded animate-pulse"
                  />
                ))}
              </div>
            </div>
          )}

          {threads && threads.length === 0 && (
            <p className="px-4 py-3 text-sm text-text-muted">
              No conversations yet
            </p>
          )}

          {threads?.map((thread) => (
            <div
              key={thread.thread_id}
              onClick={() => onSelectThread(thread.thread_id)}
              className={`
                group flex items-center gap-2 mx-2 px-3 py-2 rounded-lg cursor-pointer
                transition-colors duration-100
                ${
                  activeThreadId === thread.thread_id
                    ? "bg-surface-overlay text-text-primary"
                    : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
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
                  shrink-0 p-1 rounded transition-colors
                  ${
                    deletingId === thread.thread_id
                      ? "text-danger"
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

        <div className="p-3 border-t border-surface-border">
          <span className="font-pixel text-pixel-xs text-text-muted">
            v0.1.0
          </span>
        </div>
      </aside>
    </>
  );
}
