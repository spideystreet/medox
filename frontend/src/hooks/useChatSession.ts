import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useThreadState, useCreateThread } from "../api/hooks";
import {
  streamMessage,
  updateThreadMetadata,
  type Message,
} from "../api/client";

// Steady reveal, close to ChatGPT / Claude (~40 tokens/s).
const CHARS_PER_SECOND = 120;

function useTypewriter() {
  const [displayed, setDisplayed] = useState("");
  const targetRef = useRef("");
  const cursorRef = useRef(0);
  const carryRef = useRef(0);
  const lastRef = useRef(0);
  const frameRef = useRef<number>();
  const drainingRef = useRef(false);
  const fullyRevealedRef = useRef(false);
  const loopRef = useRef<(now: number) => void>(() => {});

  const stop = useCallback(() => {
    if (frameRef.current != null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = undefined;
    }
  }, []);

  const start = useCallback(() => {
    if (frameRef.current != null) return;
    lastRef.current = 0;
    frameRef.current = requestAnimationFrame((now) => loopRef.current(now));
  }, []);

  useEffect(() => {
    loopRef.current = (now: number) => {
      const previous = lastRef.current || now;
      const dt = Math.min(now - previous, 48);
      lastRef.current = now;

      const target = targetRef.current;
      if (cursorRef.current >= target.length) {
        if (drainingRef.current) {
          drainingRef.current = false;
          fullyRevealedRef.current = true;
          frameRef.current = undefined;
          return;
        }
        frameRef.current = requestAnimationFrame((t) => loopRef.current(t));
        return;
      }

      carryRef.current += (CHARS_PER_SECOND * dt) / 1000;
      const step = Math.floor(carryRef.current);
      if (step > 0) {
        carryRef.current -= step;
        cursorRef.current = Math.min(cursorRef.current + step, target.length);
        setDisplayed(target.slice(0, cursorRef.current));
      }
      frameRef.current = requestAnimationFrame((t) => loopRef.current(t));
    };
  }, []);

  const revealAll = useCallback(() => {
    stop();
    cursorRef.current = targetRef.current.length;
    carryRef.current = 0;
    drainingRef.current = false;
    fullyRevealedRef.current = true;
    setDisplayed(targetRef.current);
  }, [stop]);

  const prefersReducedMotion = useCallback(() => {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  const append = useCallback(
    (token: string) => {
      targetRef.current += token;
      fullyRevealedRef.current = false;
      if (prefersReducedMotion()) {
        revealAll();
        return;
      }
      start();
    },
    [prefersReducedMotion, revealAll, start],
  );

  const drain = useCallback(() => {
    drainingRef.current = true;
    fullyRevealedRef.current = false;
    if (prefersReducedMotion()) {
      revealAll();
      return;
    }
    start();
  }, [prefersReducedMotion, revealAll, start]);

  const reset = useCallback(() => {
    stop();
    targetRef.current = "";
    cursorRef.current = 0;
    carryRef.current = 0;
    lastRef.current = 0;
    drainingRef.current = false;
    fullyRevealedRef.current = false;
    setDisplayed("");
  }, [stop]);

  useEffect(() => stop, [stop]);

  return {
    displayed,
    append,
    drain,
    reset,
    get isFullyRevealed() {
      return fullyRevealedRef.current;
    },
  };
}

interface UseChatSessionOptions {
  threadId: string | null;
  onThreadCreated: (threadId: string) => void;
}

export function useChatSession({
  threadId,
  onThreadCreated,
}: UseChatSessionOptions) {
  const { data: threadState, isError: threadStateError } =
    useThreadState(threadId);
  const createThread = useCreateThread();
  const queryClient = useQueryClient();

  const typewriter = useTypewriter();
  const [isStreaming, setIsStreaming] = useState(false);
  const [activity, setActivity] = useState("Réflexion");
  const [streamDone, setStreamDone] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [optimisticMessages, setOptimisticMessages] = useState<Message[]>([]);

  const serverMessages = threadState?.values?.messages ?? [];

  const serverHasAiResponse = useMemo(() => {
    if (!streamDone) return false;
    const lastMsg = serverMessages[serverMessages.length - 1];
    return lastMsg?.type === "ai" && !!lastMsg.content;
  }, [serverMessages, streamDone]);

  useEffect(() => {
    if (serverHasAiResponse) {
      typewriter.reset();
      setOptimisticMessages([]);
      setStreamDone(false);
    }
  }, [serverHasAiResponse, typewriter]);

  useEffect(() => {
    if (threadStateError && threadId) {
      onThreadCreated("");
    }
  }, [threadStateError, threadId, onThreadCreated]);

  const displayMessages = useMemo(() => {
    if (optimisticMessages.length === 0) return serverMessages;
    const lastServer = serverMessages[serverMessages.length - 1];
    const optimisticHuman = optimisticMessages[0];
    if (
      lastServer?.type === "human" &&
      lastServer.content === optimisticHuman?.content
    ) {
      return serverMessages;
    }
    return [...serverMessages, ...optimisticMessages];
  }, [serverMessages, optimisticMessages]);

  const showTypewriter = !!typewriter.displayed && !serverHasAiResponse;
  const showCursor =
    isStreaming || (showTypewriter && !typewriter.isFullyRevealed);

  const handleSend = useCallback(
    async (content: string) => {
      setErrorMessage(null);
      setStreamDone(false);
      let currentThreadId = threadId;
      const isFirstMessage =
        !currentThreadId ||
        serverMessages.filter((m) => m.type === "human").length === 0;

      setOptimisticMessages([
        { type: "human", content, id: `temp-${Date.now()}` },
      ]);
      setActivity("Réflexion");
      setIsStreaming(true);
      typewriter.reset();

      if (!currentThreadId) {
        try {
          const thread = await createThread.mutateAsync();
          currentThreadId = thread.thread_id;
          onThreadCreated(currentThreadId);
        } catch {
          setIsStreaming(false);
          setOptimisticMessages([]);
          setErrorMessage("Impossible de démarrer la conversation.");
          return;
        }
      }

      if (isFirstMessage) {
        const title =
          content.length > 50 ? content.slice(0, 50) + "..." : content;
        updateThreadMetadata(currentThreadId, { title }).catch(() => {});
      }

      await streamMessage(currentThreadId, content, {
        onStatus: (label) => {
          setActivity(label);
        },
        onToken: (token) => {
          typewriter.append(token);
        },
        onDone: (fullMsg) => {
          setIsStreaming(false);
          if (!fullMsg) {
            typewriter.reset();
            setOptimisticMessages([]);
            setErrorMessage(
              "No response received. The agent may be unavailable.",
            );
          } else {
            typewriter.drain();
            setStreamDone(true);
          }
          queryClient.invalidateQueries({
            queryKey: ["thread-state", currentThreadId],
          });
          queryClient.invalidateQueries({ queryKey: ["threads"] });
        },
        onError: async (error) => {
          console.error("Stream error:", error);
          setIsStreaming(false);
          typewriter.reset();
          setOptimisticMessages([]);
          setErrorMessage(error.message || "Connection error. Please try again.");
        },
      });
    },
    [
      threadId,
      serverMessages,
      typewriter,
      createThread,
      onThreadCreated,
      queryClient,
    ],
  );

  const hasMessages =
    displayMessages.length > 0 || !!typewriter.displayed || !!errorMessage;

  return {
    displayMessages,
    isStreaming,
    activity,
    errorMessage,
    hasMessages,
    showTypewriter,
    showCursor,
    typewriterDisplayed: typewriter.displayed,
    handleSend,
  };
}
