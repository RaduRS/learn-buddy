"use client";

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import Image from "next/image";
import {
  Camera,
  Loader2,
  Pause,
  Play,
  ScanText,
  Sparkles,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Buddy } from "@/components/mascot/Buddy";
import { useSfx } from "@/components/sound/SoundProvider";
import { cn } from "@/lib/utils";

interface ReadingHelperGameProps {
  userId: string;
  gameId: string;
  userAge: number;
  onGameComplete: (score: number, totalQuestions: number) => void;
}

type OcrProvider = "nebius" | "openai-nano";

export default function ReadingHelperGame({
  onGameComplete,
}: ReadingHelperGameProps) {
  const { play } = useSfx();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState("");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isReadingImage, setIsReadingImage] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasScored, setHasScored] = useState(false);
  const [lastSelectedFile, setLastSelectedFile] = useState<File | null>(null);
  const [ocrProvider, setOcrProvider] = useState<OcrProvider>("openai-nano");
  const [pendingProvider, setPendingProvider] = useState<OcrProvider | null>(null);
  const [isProviderModalOpen, setIsProviderModalOpen] = useState(false);
  const [providerPassword, setProviderPassword] = useState("");

  useEffect(() => {
    return () => {
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current.onplay = null;
        audioElementRef.current.onpause = null;
        audioElementRef.current.onended = null;
        audioElementRef.current.src = "";
        audioElementRef.current = null;
      }
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [imagePreviewUrl, audioUrl]);

  const openCamera = () => {
    play("tap");
    setError(null);
    fileInputRef.current?.click();
  };

  const loadImageElement = async (file: File): Promise<HTMLImageElement> => {
    const objectUrl = URL.createObjectURL(file);
    try {
      return await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new window.Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Could not read image"));
        img.src = objectUrl;
      });
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  };

  const buildImageDataUrl = async (
    file: File,
    provider: OcrProvider,
    mode: "balanced" | "high_quality" = "balanced",
  ) => {
    const image = await loadImageElement(file);
    const longestSide = Math.max(image.width, image.height);
    const targetLongest =
      provider === "openai-nano"
        ? mode === "high_quality"
          ? Math.min(1680, Math.max(1200, longestSide))
          : Math.min(1280, Math.max(960, longestSide))
        : Math.min(1800, Math.max(1200, longestSide));
    const quality =
      provider === "openai-nano" ? (mode === "high_quality" ? 0.9 : 0.8) : 0.92;
    const scale = targetLongest / longestSide;
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not process image");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", quality);
  };

  const normalizeText = (text: string) =>
    text
      .replace(/\r\n/g, "\n")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

  const getAudioPlayer = () => {
    if (!audioElementRef.current) {
      audioElementRef.current = new Audio();
      audioElementRef.current.onplay = () => setIsAudioPlaying(true);
      audioElementRef.current.onpause = () => setIsAudioPlaying(false);
      audioElementRef.current.onended = () => setIsAudioPlaying(false);
    }
    return audioElementRef.current;
  };

  const playAudioFromUrl = async (
    url: string,
    options?: {
      restart?: boolean;
      suppressPermissionError?: boolean;
      suppressInterruptedError?: boolean;
    },
  ) => {
    const player = getAudioPlayer();
    const shouldRestart = options?.restart ?? true;
    const isSameSource = player.src === url;
    if (!isSameSource && !player.paused) player.pause();
    if (!isSameSource) player.src = url;
    if (shouldRestart) {
      if (isSameSource && !player.paused) player.pause();
      player.currentTime = 0;
    }
    try {
      await player.play();
    } catch (err) {
      if (
        options?.suppressInterruptedError &&
        err instanceof Error &&
        /(interrupted by a call to pause\(\)|AbortError)/i.test(err.message)
      ) {
        setIsAudioPlaying(false);
        return;
      }
      if (
        options?.suppressPermissionError &&
        err instanceof Error &&
        /(NotAllowedError|request is not allowed|denied permission)/i.test(
          err.message,
        )
      ) {
        setIsAudioPlaying(false);
        return;
      }
      throw err;
    }
  };

  const toggleAudioPlayback = async () => {
    if (!audioUrl) return;
    play("tap");
    const player = getAudioPlayer();
    if (isAudioPlaying) {
      player.pause();
      return;
    }
    await playAudioFromUrl(audioUrl, {
      restart: false,
      suppressPermissionError: true,
      suppressInterruptedError: true,
    });
  };

  const extractTextFromImage = async (file: File) => {
    const OCR_TIMEOUT_MS = 90000;
    const imageDataUrl = await buildImageDataUrl(file, ocrProvider, "balanced");
    const highQualityImageDataUrl =
      ocrProvider === "openai-nano"
        ? await buildImageDataUrl(file, ocrProvider, "high_quality")
        : null;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), OCR_TIMEOUT_MS);

    const requestOcr = async (payloadImage: string) => {
      const response = await fetch("/api/ai/reading-ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageDataUrl: payloadImage,
          provider: ocrProvider,
        }),
        signal: controller.signal,
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || "Could not extract text from image");
      }
      const payload = (await response.json()) as { text?: string };
      const cleaned = normalizeText(payload.text || "");
      if (!cleaned) throw new Error("No readable text found in the photo");
      return cleaned;
    };

    try {
      try {
        return await requestOcr(imageDataUrl);
      } catch (firstAttemptError) {
        if (highQualityImageDataUrl) return await requestOcr(highQualityImageDataUrl);
        throw firstAttemptError;
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error("Image processing took too long. Please tap Retry.");
      }
      throw err;
    } finally {
      window.clearTimeout(timeout);
    }
  };

  const generateAudio = async (text: string) => {
    setIsGeneratingAudio(true);
    setError(null);
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.currentTime = 0;
    }
    setIsAudioPlaying(false);
    setAudioUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });

    try {
      const response = await fetch("/api/ai/reading-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, ocrProvider }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || "Failed to generate audio");
      }
      const audioBlob = await response.blob();
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
      await playAudioFromUrl(url, {
        suppressPermissionError: true,
        suppressInterruptedError: true,
      });
      if (!hasScored) {
        setHasScored(true);
        play("levelup");
        onGameComplete(1, 1);
      }
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Could not generate audio";
      setError(message);
      play("wrong");
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const processImage = async (file: File) => {
    setIsReadingImage(true);
    setError(null);
    setExtractedText("");
    try {
      const previewUrl = URL.createObjectURL(file);
      setImagePreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return previewUrl;
      });
      const cleaned = await extractTextFromImage(file);
      setExtractedText(cleaned);
      await generateAudio(cleaned);
    } catch (ocrError) {
      const message =
        ocrError instanceof Error ? ocrError.message : "Text extraction failed";
      setError(message);
    } finally {
      setIsReadingImage(false);
    }
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setLastSelectedFile(file);
    await processImage(file);
  };

  const retryProcessing = async () => {
    if (!lastSelectedFile) {
      openCamera();
      return;
    }
    play("tap");
    await processImage(lastSelectedFile);
  };

  const handleProviderChangeRequest = (value: string) => {
    const nextProvider = value as OcrProvider;
    if (nextProvider === ocrProvider) return;
    setPendingProvider(nextProvider);
    setProviderPassword("");
    setIsProviderModalOpen(true);
  };

  const closeProviderModal = () => {
    setIsProviderModalOpen(false);
    setProviderPassword("");
    setPendingProvider(null);
  };

  const confirmProviderChange = () => {
    if (providerPassword === "1990" && pendingProvider) {
      setOcrProvider(pendingProvider);
    }
    closeProviderModal();
  };

  return (
    <div className="space-y-5">
      <div className="surface-card cat-reading p-5 sm:p-7">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid place-items-center w-12 h-12 rounded-2xl bg-[oklch(0.20_0.06_285_/_0.6)] border border-[var(--arcade-edge)]">
              <ScanText className="w-6 h-6" style={{ color: "var(--cat-reading)" }} />
            </span>
            <div>
              <h2 className="font-display text-2xl text-arcade-strong">
                Read Aloud Camera
              </h2>
              <p className="text-arcade-mid text-sm">
                Snap any text — Buddy will read it back.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-arcade-soft font-display">OCR</span>
            <select
              value={ocrProvider}
              onChange={(event) => handleProviderChangeRequest(event.target.value)}
              className="h-10 rounded-full bg-[var(--arcade-card-soft)] border border-[var(--arcade-edge)] px-3 text-sm text-arcade-strong"
              disabled={isReadingImage || isGeneratingAudio}
            >
              <option value="openai-nano">GPT-4.1 Nano</option>
              <option value="nebius">Nebius</option>
            </select>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={openCamera}
            disabled={isReadingImage || isGeneratingAudio}
            className="font-display text-lg px-6 py-3 rounded-full inline-flex items-center gap-2
                       text-[var(--ink-on-color)]
                       bg-[var(--cat-reading)]
                       border border-[oklch(0.55_0.16_70)]
                       shadow-[0_8px_22px_-10px_var(--cat-reading-glow),inset_0_1px_0_oklch(1_0_0_/_0.4)]
                       active:scale-[0.97]
                       disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isReadingImage ? (
              <Loader2 className="w-5 h-5 animate-spin" aria-hidden />
            ) : (
              <Camera className="w-5 h-5" aria-hidden />
            )}
            {isReadingImage ? "Reading…" : "Open camera"}
          </button>

          {audioUrl && (
            <button
              type="button"
              onClick={() => void toggleAudioPlayback()}
              disabled={isReadingImage || isGeneratingAudio}
              className="font-display px-5 py-3 rounded-full inline-flex items-center gap-2
                         text-[var(--ink-on-color)]
                         bg-[var(--cat-music)]
                         border border-[oklch(0.45_0.10_160)]
                         shadow-[0_8px_22px_-10px_var(--cat-music-glow),inset_0_1px_0_oklch(1_0_0_/_0.4)]
                         active:scale-[0.97]
                         disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isReadingImage || isGeneratingAudio ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
              ) : isAudioPlaying ? (
                <Pause className="w-4 h-4" aria-hidden />
              ) : (
                <Play className="w-4 h-4" aria-hidden />
              )}
              {isReadingImage || isGeneratingAudio
                ? "Please wait…"
                : isAudioPlaying
                  ? "Pause"
                  : "Play"}
            </button>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {isGeneratingAudio && (
        <div className="surface-card cat-music p-5 flex items-center gap-3 text-arcade-strong">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--cat-music)" }} aria-hidden />
          <span className="font-display">Generating natural voice audio…</span>
        </div>
      )}

      {error && (
        <div className="surface-card cat-spatial p-5 space-y-3" role="alert">
          <p className="text-arcade-strong font-display">{error}</p>
          <button
            type="button"
            onClick={retryProcessing}
            disabled={isReadingImage || isGeneratingAudio}
            className="font-display px-5 py-2.5 rounded-full
                       bg-[var(--arcade-card-soft)] text-arcade-strong
                       border border-[var(--arcade-edge)]
                       active:scale-[0.97]
                       disabled:opacity-50"
          >
            {(isReadingImage || isGeneratingAudio) && (
              <Loader2 className="w-4 h-4 mr-2 animate-spin inline" />
            )}
            Retry
          </button>
        </div>
      )}

      {!imagePreviewUrl && !isReadingImage && !error && (
        <div className="surface-card p-8 text-center max-w-2xl mx-auto">
          <div className="flex justify-center mb-4">
            <Buddy mood="wave" size="lg" />
          </div>
          <h3 className="font-display text-2xl text-arcade-strong">
            Show me something to read!
          </h3>
          <p className="mt-2 text-arcade-mid">
            A book page, a sign, a label — point the camera and tap.
          </p>
        </div>
      )}

      {imagePreviewUrl && (
        <div className="surface-card cat-reading p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5" style={{ color: "var(--joy-gold)" }} aria-hidden />
            <h3 className="font-display text-lg text-arcade-strong">
              Captured text preview
            </h3>
          </div>
          <div className="relative w-full h-64 md:h-[420px] rounded-2xl border border-[var(--arcade-edge)] overflow-hidden bg-[oklch(0.20_0.06_285_/_0.55)]">
            <Image
              src={imagePreviewUrl}
              alt="Captured text"
              fill
              unoptimized
              className="object-contain"
            />
          </div>
          {extractedText && (
            <div className="mt-4 space-y-2">
              <span className="chip">
                <span className="text-sm opacity-80">Detected text</span>
              </span>
              <p className="text-arcade-mid leading-relaxed bg-[oklch(0.20_0.06_285_/_0.45)] border border-[var(--arcade-edge)] rounded-2xl p-4 whitespace-pre-wrap">
                {extractedText}
              </p>
            </div>
          )}
        </div>
      )}

      <Dialog
        open={isProviderModalOpen}
        onOpenChange={(open) => (open ? setIsProviderModalOpen(true) : closeProviderModal())}
      >
        <DialogContent
          className={cn(
            "bg-[var(--arcade-card)] border-[var(--arcade-edge)] rounded-3xl",
            "p-0",
          )}
        >
          <div className="bg-arcade rounded-3xl">
            <DialogHeader className="px-6 pt-6 pb-2 text-left">
              <DialogTitle className="font-display text-xl text-arcade-strong">
                Enter password
              </DialogTitle>
            </DialogHeader>
            <div className="px-6 pb-6 space-y-4">
              <Input
                type="password"
                value={providerPassword}
                onChange={(event) => setProviderPassword(event.target.value)}
                placeholder="Password"
                className="bg-[var(--arcade-card-soft)] border-[var(--arcade-edge)] text-arcade-strong placeholder:text-arcade-soft h-12 rounded-2xl px-4"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeProviderModal}
                  className="font-display px-5 py-2.5 rounded-full
                             bg-[var(--arcade-card-soft)] text-arcade-strong
                             border border-[var(--arcade-edge)]
                             active:scale-[0.97]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmProviderChange}
                  className="font-display px-5 py-2.5 rounded-full text-[var(--ink-on-color)]
                             bg-[var(--cat-reading)]
                             border border-[oklch(0.55_0.16_70)]
                             shadow-[0_8px_22px_-10px_var(--cat-reading-glow),inset_0_1px_0_oklch(1_0_0_/_0.4)]
                             active:scale-[0.97]"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
