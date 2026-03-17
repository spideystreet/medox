const API_BASE = "/api";

export interface Thread {
  thread_id: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Message {
  type: "human" | "ai" | "tool";
  content: string;
  id: string;
  name?: string;
}

export interface ThreadState {
  values: {
    messages: Message[];
    cis_codes?: string[];
    interactions_found?: Array<{
      niveau_contrainte: string;
      detail: string;
    }>;
    source_cis?: string;
  };
}

export async function createThread(): Promise<Thread> {
  const res = await fetch(`${API_BASE}/threads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ metadata: {} }),
  });
  if (!res.ok) throw new Error(`Failed to create thread: ${res.status}`);
  return res.json();
}

export async function listThreads(): Promise<Thread[]> {
  const res = await fetch(`${API_BASE}/threads/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ limit: 50 }),
  });
  if (!res.ok) throw new Error(`Failed to list threads: ${res.status}`);
  return res.json();
}

export async function updateThreadMetadata(
  threadId: string,
  metadata: Record<string, unknown>,
): Promise<Thread> {
  const res = await fetch(`${API_BASE}/threads/${threadId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ metadata }),
  });
  if (!res.ok) throw new Error(`Failed to update thread: ${res.status}`);
  return res.json();
}

export async function deleteThread(threadId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/threads/${threadId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(`Failed to delete thread: ${res.status}`);
}

export async function getThreadHistory(
  threadId: string,
): Promise<ThreadState[]> {
  const res = await fetch(`${API_BASE}/threads/${threadId}/history`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ limit: 1 }),
  });
  if (!res.ok) throw new Error(`Failed to get history: ${res.status}`);
  return res.json();
}

export async function getThreadState(
  threadId: string,
): Promise<ThreadState> {
  const res = await fetch(`${API_BASE}/threads/${threadId}/state`);
  if (!res.ok) throw new Error(`Failed to get state: ${res.status}`);
  return res.json();
}

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onDone: (fullMessage: string) => void;
  onError: (error: Error) => void;
}

export async function streamMessage(
  threadId: string,
  message: string,
  callbacks: StreamCallbacks,
): Promise<void> {
  const res = await fetch(`${API_BASE}/threads/${threadId}/runs/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      assistant_id: "nephila_agent",
      input: {
        messages: [{ role: "human", content: message }],
      },
      stream_mode: ["messages"],
    }),
  });

  if (!res.ok) {
    callbacks.onError(new Error(`Stream failed: ${res.status}`));
    return;
  }

  const reader = res.body?.getReader();
  if (!reader) {
    callbacks.onError(new Error("No response body"));
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let fullMessage = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.startsWith("event: ")) {
        const eventType = line.slice(7).trim();
        if (eventType === "end") {
          callbacks.onDone(fullMessage);
          return;
        }
      }

      if (!line.startsWith("data: ")) continue;

      const data = line.slice(6);
      if (!data || data === "[DONE]") continue;

      try {
        const parsed = JSON.parse(data);

        // Handle messages stream mode
        if (Array.isArray(parsed) && parsed.length === 2) {
          const [metadata, chunk] = parsed;
          if (
            metadata?.langgraph_node === "agent" &&
            chunk?.content &&
            typeof chunk.content === "string"
          ) {
            fullMessage += chunk.content;
            callbacks.onToken(chunk.content);
          }
        }

        // Handle final state with complete AI message
        if (parsed?.messages) {
          const aiMessages = parsed.messages.filter(
            (m: Message) => m.type === "ai" && m.content,
          );
          if (aiMessages.length > 0) {
            const lastAi = aiMessages[aiMessages.length - 1];
            if (lastAi.content && typeof lastAi.content === "string") {
              fullMessage = lastAi.content;
            }
          }
        }
      } catch {
        // Skip malformed JSON lines
      }
    }
  }

  callbacks.onDone(fullMessage);
}
