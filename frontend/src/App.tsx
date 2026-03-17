import { useState, useEffect, useCallback } from "react";
import { Sidebar } from "./components/Sidebar";
import { ChatView } from "./components/ChatView";

export function App() {
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar on desktop resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleSelectThread = useCallback((threadId: string) => {
    setActiveThreadId(threadId || null);
    setSidebarOpen(false);
  }, []);

  const handleNewChat = useCallback((threadId: string) => {
    setActiveThreadId(threadId);
    setSidebarOpen(false);
  }, []);

  const handleThreadCreated = useCallback((threadId: string) => {
    setActiveThreadId(threadId);
  }, []);

  return (
    <div className="h-screen flex overflow-hidden" data-testid="app">
      <Sidebar
        activeThreadId={activeThreadId}
        onSelectThread={handleSelectThread}
        onNewChat={handleNewChat}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <ChatView
        threadId={activeThreadId}
        onThreadCreated={handleThreadCreated}
        onMenuClick={() => setSidebarOpen(true)}
      />
    </div>
  );
}
