"use client";

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import Tesseract from "tesseract.js";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Camera, Loader2, Volume2, Sparkles, ScanText } from "lucide-react";

interface ReadingHelperGameProps {
  userId: string;
  gameId: string;
  userAge: number;
  onGameComplete: (score: number, totalQuestions: number) => void;
}

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
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState("");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isReadingImage, setIsReadingImage] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasScored, setHasScored] = useState(false);

  useEffect(() => {
    return () => {
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

  const generateAudio = async (text: string) => {
    setIsGeneratingAudio(true);
    setError(null);
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
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || "Failed to generate audio");
      }

      const audioBlob = await response.blob();
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
      const audio = new Audio(url);
      void audio.play();

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

      const result = await Tesseract.recognize(file, "eng");
      const cleaned = result.data.text.replace(/\s+/g, " ").trim();

      if (!cleaned) {
        throw new Error("No readable text found in the photo");
      }

      setExtractedText(cleaned);
      await generateAudio(cleaned);
    } catch (ocrError) {
      const message =
        ocrError instanceof Error ? ocrError.message : "OCR failed";
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
    await processImage(file);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-indigo-700 flex items-center gap-2">
            <ScanText className="w-7 h-7" />
            Read Aloud Camera
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-700">
            Take a picture of any text and Learn Buddy will read it out loud.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={openCamera}
              disabled={isReadingImage || isGeneratingAudio}
              size="lg"
              className="w-full sm:w-auto"
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
                variant="outline"
                onClick={() => {
                  const audio = new Audio(audioUrl);
                  void audio.play();
                }}
                className="w-full sm:w-auto"
              >
                <Volume2 className="w-4 h-4 mr-2" />
                Play Again
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
          <CardContent className="p-6">
            <p className="text-red-600 font-medium">{error}</p>
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
                <p className="text-gray-800 leading-relaxed bg-gray-50 rounded-md p-3">
                  {extractedText}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
