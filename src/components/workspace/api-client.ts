import { useEffect, useState } from "react";
import type { User } from "firebase/auth";

export type Api = <T>(path: string, options?: { method?: string; body?: unknown; signal?: AbortSignal }) => Promise<T>;
export type OperationFeedback = { message: string; error: boolean };
export type Perform = (action: () => Promise<unknown>, message: string, onFeedback?: (feedback: OperationFeedback | null) => void) => Promise<boolean>;


export function useResource<T>(load: (signal: AbortSignal) => Promise<T>, revision: number) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    setError("");
    load(controller.signal).then((value) => {
      if (!controller.signal.aborted) setData(value);
    }).catch((reason: unknown) => {
      if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Couldn't load this workspace.");
    });
    return () => controller.abort();
  }, [load, revision]);
  return { data, error };
}

export function accountApi(user: User): Api {
  return async <T,>(path: string, options: { method?: string; body?: unknown; signal?: AbortSignal } = {}) => {
    const token = await user.getIdToken();
    const response = await fetch("/api" + path, {
      method: options.method ?? "GET",
      headers: {
        Authorization: "Bearer " + token,
        ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    });
    if (response.status === 204) return undefined as T;
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(data?.error ?? "Couldn't reach the workspace. Try again.");
    return data as T;
  };
}
