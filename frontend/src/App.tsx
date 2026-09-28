import { useState, useEffect, useCallback } from "react";
import {
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
  useNavigate,
  RouterProvider,
} from "@tanstack/react-router";
import { Sidebar } from "./components/Sidebar";
import { ChatView } from "./components/ChatView";
import { SettingsDialog } from "./components/SettingsDialog";
import { LandingPage } from "./components/LandingPage";
import { NotFoundPage } from "./components/NotFoundPage";

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
  const [activeThreadId, setActiveThreadId] = useState<string | null>(
    getStoredThreadId,
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

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
        onOpenSettings={() => setSettingsOpen(true)}
      />
      <ChatView
        threadId={activeThreadId}
        onThreadCreated={handleThreadCreated}
        onMenuClick={() => setSidebarOpen(true)}
      />
      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onChatsDeleted={() => setActiveThreadId(null)}
      />
    </div>
  );
}

function LandingRoute() {
  const navigate = useNavigate();
  return <LandingPage onEnter={() => navigate({ to: "/chat" })} />;
}

const rootRoute = createRootRoute({
  component: () => <Outlet />,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: LandingRoute,
});

const chatRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/chat",
  component: ChatApp,
});

const setupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/setup",
  beforeLoad: () => {
    throw redirect({ to: "/chat" });
  },
  component: () => null,
});

const routeTree = rootRoute.addChildren([indexRoute, setupRoute, chatRoute]);

export const router = createRouter({
  routeTree,
  defaultNotFoundComponent: NotFoundPage,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export function App() {
  return <RouterProvider router={router} />;
}
