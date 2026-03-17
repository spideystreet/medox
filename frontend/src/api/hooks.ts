import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listThreads,
  createThread,
  deleteThread,
  getThreadState,
  type Thread,
} from "./client";

export function useThreads() {
  return useQuery({
    queryKey: ["threads"],
    queryFn: listThreads,
    select: (threads: Thread[]) =>
      [...threads]
        .filter((t) => t.metadata?.title)
        .sort(
          (a, b) =>
            new Date(b.updated_at).getTime() -
            new Date(a.updated_at).getTime(),
        ),
  });
}

export function useThreadState(threadId: string | null) {
  return useQuery({
    queryKey: ["thread-state", threadId],
    queryFn: () => getThreadState(threadId!),
    enabled: !!threadId,
  });
}

export function useCreateThread() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createThread,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["threads"] });
    },
  });
}

export function useDeleteThread() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteThread,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["threads"] });
    },
  });
}
