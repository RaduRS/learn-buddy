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

// Flux is Deepgram's conversational STT model. Unlike the older Nova streams,
// it runs a turn-taking state machine and tells us when the child started and
// finished a thought, so we don't hand-roll VAD or endpointing.
//
// We send containerized WebM/Opus (what MediaRecorder produces), so `encoding`
// and `sample_rate` must be omitted and are auto-detected from the container.
// `eot_timeout_ms` caps how long silence can sit before Flux calls the turn
// over, which keeps the game snappy for kids.
const LISTEN_URL =
  "wss://api.deepgram.com/v2/listen" +
  "?model=flux-general-en" +
  "&eot_timeout_ms=2000";

// Flux recommends ~80ms audio chunks for its lowest latency.
const CHUNK_MS = 80;

/**
 * Streams the microphone to Deepgram Flux for live, turn-aware transcription.
 *
 * The browser connects straight to Deepgram (Vercel functions can't proxy a
 * WebSocket) using a short-lived token minted by `/api/ai/deepgram-token`, so
 * the real API key stays on the server.
 *
 * Flux emits `TurnInfo` messages rather than continuous transcripts:
 *   StartOfTurn  -> the child began speaking (our barge-in signal)
 *   Update       -> provisional transcript, refreshed a few times a second
 *   EndOfTurn    -> the child finished a thought; the confirmed transcript
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

  // Fresh callbacks without re-creating the sockets on every render.
  const cbs = useRef({ onFinal, onInterim, onSpeechStart });
  useEffect(() => {
    cbs.current = { onFinal, onInterim, onSpeechStart };
  }, [onFinal, onInterim, onSpeechStart]);

  const teardown = useCallback(() => {
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

      // Ask for the microphone FIRST. getUserMedia is the call that shows the
      // OS/browser permission prompt, so it must not sit behind anything that
      // can fail first — otherwise the child is never asked to allow the mic.
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      const tokenRes = await fetch("/api/ai/deepgram-token", { method: "POST" });
      if (!tokenRes.ok) throw new Error("Could not start listening");
      const { accessToken } = (await tokenRes.json()) as { accessToken?: string };
      if (!accessToken) throw new Error("Could not start listening");

      // The ephemeral JWT must be sent with the `bearer` subprotocol. The
      // `token` scheme is only for a raw API key; a JWT sent that way makes
      // Deepgram hang the handshake, which surfaced as "Listening stopped".
      const ws = new WebSocket(LISTEN_URL, ["bearer", accessToken]);
      wsRef.current = ws;

      ws.onopen = () => {
        const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm";
        const recorder = new MediaRecorder(stream, { mimeType: mime });
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0 && ws.readyState === WebSocket.OPEN) ws.send(e.data);
        };
        // Continuous audio doubles as keep-alive: Flux has no KeepAlive
        // control message, and sending a frame every 80ms keeps the socket
        // active even while the child is quiet.
        recorder.start(CHUNK_MS);
        recorderRef.current = recorder;

        setState("listening");
      };

      ws.onmessage = (event) => {
        let msg: {
          type?: string;
          event?: string;
          transcript?: string;
        };
        try {
          msg = JSON.parse(event.data as string);
        } catch {
          return;
        }

        if (msg.type !== "TurnInfo") return;
        const transcript = msg.transcript?.trim();

        switch (msg.event) {
          case "StartOfTurn":
            // The child started talking. Flux guarantees a non-empty
            // transcript here, which makes this a reliable barge-in signal.
            cbs.current.onSpeechStart?.();
            if (transcript) cbs.current.onInterim?.(transcript);
            break;
          case "Update":
            if (transcript) cbs.current.onInterim?.(transcript);
            break;
          case "EndOfTurn":
            if (transcript) cbs.current.onFinal?.(transcript);
            break;
          // We don't set `eager_eot_threshold`, so EagerEndOfTurn/TurnResumed
          // never arrive; ignore anything else the model may add later.
          default:
            break;
        }
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
