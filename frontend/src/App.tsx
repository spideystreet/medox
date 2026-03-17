import { useState, useEffect, useCallback } from "react";
import { Sidebar } from "./components/Sidebar";
import { ChatView } from "./components/ChatView";
import { LandingPage } from "./components/LandingPage";

const STORAGE_KEY = "nephila:activeThread";
const ENTERED_KEY = "nephila:entered";

function getStoredThreadId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function storeThreadId(threadId: string | null) {
  try {
    if (threadId) {
      localStorage.setItem(STORAGE_KEY, threadId);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // localStorage unavailable
  }
}

function hasEntered(): boolean {
  try {
    return localStorage.getItem(ENTERED_KEY) === "true";
  } catch {
    return false;
  }
}

export function App() {
  const [showLanding, setShowLanding] = useState(!hasEntered());
  const [activeThreadId, setActiveThreadId] = useState<string | null>(
    getStoredThreadId,
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    storeThreadId(activeThreadId);
  }, [activeThreadId]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleEnter = useCallback(() => {
    try {
      localStorage.setItem(ENTERED_KEY, "true");
    } catch {
      // localStorage unavailable
    }
    setShowLanding(false);
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

  if (showLanding) {
    return <LandingPage onEnter={handleEnter} />;
  }

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
