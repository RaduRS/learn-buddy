import { useState, useCallback, useRef } from "react";

interface ApiCallOptions {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

interface ApiCallResult<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  timeoutReached: boolean;
}

export function useApiCall<T = unknown>(options: ApiCallOptions = {}) {
  const { timeout = 15000, retries = 1, retryDelay = 1000 } = options;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeoutReached, setTimeoutReached] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const execute = useCallback(
    async (
      apiFunction: () => Promise<T>,
      onSuccess?: (data: T) => void,
      onError?: (error: string) => void,
    ): Promise<ApiCallResult<T>> => {
      setLoading(true);
      setError(null);
      setTimeoutReached(false);

      let lastError: string | null = null;
      let attempt = 0;

      while (attempt <= retries) {
        attempt++;

        try {
          abortControllerRef.current = new AbortController();

          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => {
              abortControllerRef.current?.abort();
              reject(new Error(`Request timeout after ${timeout}ms`));
            }, timeout);
          });

          const data = await Promise.race([apiFunction(), timeoutPromise]);

          setLoading(false);
          onSuccess?.(data);
          return { data, error: null, loading: false, timeoutReached: false };
        } catch (err) {
          lastError = err instanceof Error ? err.message : "An error occurred";

          if (err instanceof Error && err.name === "AbortError") {
            setTimeoutReached(true);
          }

          if (attempt < retries) {
            await new Promise((resolve) => setTimeout(resolve, retryDelay));
          }
        }
      }

      setLoading(false);
      setError(lastError);
      onError?.(lastError || "Failed to complete request");
      return {
        data: null,
        error: lastError,
        loading: false,
        timeoutReached: true,
      };
    },
    [timeout, retries, retryDelay],
  );

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort();
    setLoading(false);
  }, []);

  return {
    execute,
    cancel,
    loading,
    error,
    timeoutReached,
  };
}
