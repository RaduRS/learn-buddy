"use client";

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Camera, Loader2, Pause, Play, Sparkles, ScanText } from "lucide-react";

interface ReadingHelperGameProps {
  userId: string;
  gameId: string;
  userAge: number;
  onGameComplete: (score: number, totalQuestions: number) => void;
}

type OcrProvider = "nebius" | "openai-nano";

export default function ReadingHelperGame({
  userId,
  gameId,
  userAge,
  onGameComplete,
}: ReadingHelperGameProps) {
  void userId;
  void gameId;
  void userAge;

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
  const [pendingProvider, setPendingProvider] = useState<OcrProvider | null>(
    null,
  );
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
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [imagePreviewUrl, audioUrl]);

  const openCamera = () => {
    setError(null);
    fileInputRef.current?.click();
  };

  const loadImageElement = async (file: File): Promise<HTMLImageElement> => {
    const objectUrl = URL.createObjectURL(file);
    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new window.Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Could not read image"));
        img.src = objectUrl;
      });
      return image;
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
    if (!ctx) {
      throw new Error("Could not process image");
    }
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

    if (!isSameSource && !player.paused) {
      player.pause();
    }
    if (!isSameSource) {
      player.src = url;
    }
    if (shouldRestart) {
      if (isSameSource && !player.paused) {
        player.pause();
      }
      player.currentTime = 0;
    }
    try {
      await player.play();
    } catch (error) {
      if (
        options?.suppressInterruptedError &&
        error instanceof Error &&
        /(interrupted by a call to pause\(\)|AbortError)/i.test(error.message)
      ) {
        setIsAudioPlaying(false);
        return;
      }
      if (
        options?.suppressPermissionError &&
        error instanceof Error &&
        /(NotAllowedError|request is not allowed|denied permission)/i.test(
          error.message,
        )
      ) {
        setIsAudioPlaying(false);
        return;
      }
      throw error;
    }
  };

  const toggleAudioPlayback = async () => {
    if (!audioUrl) {
      return;
    }
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
        headers: {
          "Content-Type": "application/json",
        },
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
      if (!cleaned) {
        throw new Error("No readable text found in the photo");
      }
      return cleaned;
    };

    try {
      try {
        return await requestOcr(imageDataUrl);
      } catch (firstAttemptError) {
        if (highQualityImageDataUrl) {
          return await requestOcr(highQualityImageDataUrl);
        }
        throw firstAttemptError;
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("Image processing took too long. Please tap Retry.");
      }
      throw error;
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
      if (prev) {
        URL.revokeObjectURL(prev);
      }
      return null;
    });

    try {
      const response = await fetch("/api/ai/reading-audio", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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
        onGameComplete(1, 1);
      }
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Could not generate audio";
      setError(message);
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
        if (prev) {
          URL.revokeObjectURL(prev);
        }
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
    if (!file) {
      return;
    }
    setLastSelectedFile(file);
    await processImage(file);
  };

  const retryProcessing = async () => {
    if (!lastSelectedFile) {
      openCamera();
      return;
    }
    await processImage(lastSelectedFile);
  };

  const handleProviderChangeRequest = (value: string) => {
    const nextProvider = value as OcrProvider;
    if (nextProvider === ocrProvider) {
      return;
    }
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
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-2xl font-bold text-indigo-700 flex items-center gap-2">
              <ScanText className="w-7 h-7" />
              Read Aloud Camera
            </CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">OCR</span>
              <select
                value={ocrProvider}
                onChange={(event) =>
                  handleProviderChangeRequest(event.target.value)
                }
                className="h-9 rounded-md border bg-white px-3 text-sm"
                disabled={isReadingImage || isGeneratingAudio}
              >
                <option value="openai-nano">GPT-4.1 Nano</option>
                <option value="nebius">Nebius</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-700">
            Take a picture of any text and Learn Buddy will read it out loud.
          </p>
          <div className="flex items-center justify-between gap-3">
            <Button
              onClick={openCamera}
              disabled={isReadingImage || isGeneratingAudio}
              size="lg"
              className="w-auto"
            >
              {isReadingImage ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <Camera className="w-5 h-5 mr-2" />
              )}
              {isReadingImage ? "Reading Text..." : "Open Camera"}
            </Button>
            {audioUrl && (
              <Button
                onClick={() => void toggleAudioPlayback()}
                disabled={isReadingImage || isGeneratingAudio}
                className="ml-auto w-auto bg-indigo-500 hover:bg-indigo-600 text-white"
              >
                {isReadingImage || isGeneratingAudio ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : isAudioPlaying ? (
                  <Pause className="w-4 h-4 mr-2" />
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                {isReadingImage || isGeneratingAudio
                  ? "Please wait..."
                  : isAudioPlaying
                    ? "Pause"
                    : "Play"}
              </Button>
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
        </CardContent>
      </Card>

      {isGeneratingAudio && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 text-indigo-700">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="font-medium">
                Generating natural voice audio...
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <p className="text-red-600 font-medium">{error}</p>
            <Button
              variant="outline"
              onClick={retryProcessing}
              disabled={isReadingImage || isGeneratingAudio}
              className="w-full sm:w-auto"
            >
              {(isReadingImage || isGeneratingAudio) && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {imagePreviewUrl && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              Captured Text Preview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative w-full h-[420px] rounded-lg border overflow-hidden bg-gray-100">
              <Image
                src={imagePreviewUrl}
                alt="Captured text"
                fill
                unoptimized
                className="object-contain"
              />
            </div>
            {extractedText && (
              <div className="space-y-2">
                <Badge variant="secondary" className="text-xs">
                  OCR Result
                </Badge>
                <p className="text-gray-800 leading-relaxed bg-gray-50 rounded-md p-3 whitespace-pre-wrap">
                  {extractedText}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog
        open={isProviderModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeProviderModal();
          } else {
            setIsProviderModalOpen(true);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              type="password"
              value={providerPassword}
              onChange={(event) => setProviderPassword(event.target.value)}
              placeholder="Password"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={closeProviderModal}>
                Cancel
              </Button>
              <Button onClick={confirmProviderChange}>Confirm</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
