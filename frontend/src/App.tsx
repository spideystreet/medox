import { useState, useEffect, useCallback } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import { Sidebar } from "./components/Sidebar";
import { ChatView } from "./components/ChatView";
import { LandingPage } from "./components/LandingPage";

const STORAGE_KEY = "nephila:activeThread";

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

function ChatApp() {
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

function LandingRoute() {
  const navigate = useNavigate();
  return <LandingPage onEnter={() => navigate("/chat")} />;
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingRoute />} />
      <Route path="/chat" element={<ChatApp />} />
    </Routes>
  );
}
