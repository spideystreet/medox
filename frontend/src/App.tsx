import { useState, useEffect, useCallback } from "react";
import { Routes, Route, useNavigate, Navigate } from "react-router-dom";
import { Sidebar } from "./components/Sidebar";
import { ChatView } from "./components/ChatView";
import { LandingPage } from "./components/LandingPage";
import { SetupScreen } from "./components/SetupScreen";
import { getApiKey, setApiKey } from "./api/keys";

const STORAGE_KEY = "medox:activeThread";

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
  const navigate = useNavigate();
  const [activeThreadId, setActiveThreadId] = useState<string | null>(
    getStoredThreadId,
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Redirect to setup if no API key
  useEffect(() => {
    if (!getApiKey()) {
      navigate("/setup", { replace: true });
    }
  }, [navigate]);

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

  if (!getApiKey()) return null;

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
  const handleEnter = () => {
    if (getApiKey()) {
      navigate("/chat");
    } else {
      navigate("/setup");
    }
  };
  return <LandingPage onEnter={handleEnter} />;
}

function SetupRoute() {
  const navigate = useNavigate();
  const handleSave = (key: string) => {
    setApiKey(key);
    navigate("/chat");
  };
  return <SetupScreen onSave={handleSave} />;
}

function RequireKey({ children }: { children: React.ReactNode }) {
  if (!getApiKey()) {
    return <Navigate to="/setup" replace />;
  }
  return <>{children}</>;
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingRoute />} />
      <Route path="/setup" element={<SetupRoute />} />
      <Route
        path="/chat"
        element={
          <RequireKey>
            <ChatApp />
          </RequireKey>
        }
      />
    </Routes>
  );
}
