// hooks/useDeepgramStream.ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type StreamState = "idle" | "connecting" | "listening" | "error";

interface Options {
  /** A final (endpointed) transcript: the child finished a thought. */
  onFinal?: (text: string) => void;
  /** The running interim transcript, updated as they speak. */
  onInterim?: (text: string) => void;
  /** Fired the instant speech is detected, before any words are final. */
  onSpeechStart?: () => void;
}

interface UseDeepgramStream {
  state: StreamState;
  error: string | null;
  /** Open the mic and the socket. Safe to call again after stop(). */
  start: () => Promise<void>;
  stop: () => void;
}

const LISTEN_URL =
  "wss://api.deepgram.com/v1/listen" +
  "?model=nova-2" +
  "&language=en" +
  "&smart_format=true" +
  "&interim_results=true" +
  "&punctuate=true" +
  "&endpointing=800" +
  "&vad_events=true";

const KEEPALIVE_MS = 8000;

/**
 * Streams the microphone to Deepgram for live transcription.
 *
 * The browser connects straight to Deepgram (Vercel functions can't proxy a
 * WebSocket) using a short-lived token minted by `/api/ai/deepgram-token`, so
 * the real API key stays on the server.
 */
export function useDeepgramStream({
  onFinal,
  onInterim,
  onSpeechStart,
}: Options = {}): UseDeepgramStream {
  const [state, setState] = useState<StreamState>("idle");
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const keepaliveRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fresh callbacks without re-creating the sockets on every render.
  const cbs = useRef({ onFinal, onInterim, onSpeechStart });
  useEffect(() => {
    cbs.current = { onFinal, onInterim, onSpeechStart };
  }, [onFinal, onInterim, onSpeechStart]);

  const teardown = useCallback(() => {
    if (keepaliveRef.current) {
      clearInterval(keepaliveRef.current);
      keepaliveRef.current = null;
    }
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      try {
        recorder.stop();
      } catch {
        // already stopped
      }
    }
    recorderRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    const ws = wsRef.current;
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
      ws.close();
    }
    wsRef.current = null;
  }, []);

  const stop = useCallback(() => {
    teardown();
    setState("idle");
  }, [teardown]);

  const start = useCallback(async () => {
    if (state === "connecting" || state === "listening") return;
    setError(null);
    setState("connecting");

    try {
      if (
        typeof navigator === "undefined" ||
        !navigator.mediaDevices?.getUserMedia ||
        typeof window.MediaRecorder === "undefined"
      ) {
        throw new Error("Microphone is not supported on this device");
      }

      const tokenRes = await fetch("/api/ai/deepgram-token", { method: "POST" });
      if (!tokenRes.ok) throw new Error("Could not start listening");
      const { accessToken } = (await tokenRes.json()) as { accessToken?: string };
      if (!accessToken) throw new Error("Could not start listening");

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      const ws = new WebSocket(LISTEN_URL, ["token", accessToken]);
      wsRef.current = ws;

      ws.onopen = () => {
        const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm";
        const recorder = new MediaRecorder(stream, { mimeType: mime });
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0 && ws.readyState === WebSocket.OPEN) ws.send(e.data);
        };
        recorder.start(250);
        recorderRef.current = recorder;

        keepaliveRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "KeepAlive" }));
          }
        }, KEEPALIVE_MS);

        setState("listening");
      };

      ws.onmessage = (event) => {
        let msg: {
          type?: string;
          is_final?: boolean;
          channel?: { alternatives?: { transcript?: string }[] };
        };
        try {
          msg = JSON.parse(event.data as string);
        } catch {
          return;
        }

        if (msg.type === "SpeechStarted") {
          cbs.current.onSpeechStart?.();
          return;
        }
        if (msg.type !== "Results") return;

        const transcript = msg.channel?.alternatives?.[0]?.transcript?.trim();
        if (!transcript) return;
        if (msg.is_final) cbs.current.onFinal?.(transcript);
        else cbs.current.onInterim?.(transcript);
      };

      ws.onerror = () => {
        setError("Listening stopped. Tap the mic to try again.");
        setState("error");
        teardown();
      };

      ws.onclose = () => {
        // A normal close after stop() is expected; only flag unexpected ones.
        if (wsRef.current === ws) {
          teardown();
          setState((s) => (s === "connecting" ? "error" : "idle"));
        }
      };
    } catch (err) {
      teardown();
      setState("error");
      setError(
        err instanceof Error && err.name === "NotAllowedError"
          ? "Buddy needs the microphone. Please allow it to hear you."
          : err instanceof Error
            ? err.message
            : "Could not start listening",
      );
    }
  }, [state, teardown]);

  useEffect(() => teardown, [teardown]);

  return { state, error, start, stop };
}
