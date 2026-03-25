import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface LoadingSkeletonProps {
  message?: string;
  subMessage?: string;
  progress?: number;
  variant?: "default" | "card" | "minimal";
  className?: string;
}

export function LoadingSkeleton({
  message = "Loading...",
  subMessage,
  progress,
  variant = "default",
  className,
}: LoadingSkeletonProps) {
  if (variant === "minimal") {
    return (
      <div
        className={cn(
          "flex items-center justify-center gap-2 text-gray-500",
          className,
        )}
      >
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">{message}</span>
      </div>
    );
  }

  if (variant === "card") {
    return (
      <div className={cn("p-8 space-y-4", className)}>
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-blue-500" />
          <h3 className="mt-4 text-lg font-semibold">{message}</h3>
          {subMessage && (
            <p className="mt-2 text-sm text-gray-600">{subMessage}</p>
          )}
          {progress !== undefined && (
            <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center min-h-[400px] space-y-4",
        className,
      )}
    >
      <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      <p className="text-lg font-medium">{message}</p>
      {subMessage && <p className="text-sm text-gray-500">{subMessage}</p>}
      {progress !== undefined && (
        <div className="w-64 bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}
