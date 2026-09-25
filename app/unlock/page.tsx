"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { Lock } from "lucide-react";
import { Buddy, type BuddyMood } from "@/components/mascot/Buddy";
import { Input } from "@/components/ui/input";

export default function UnlockPage() {
  return (
    <Suspense fallback={<div className="bg-arcade min-h-screen" />}>
      <UnlockForm />
    </Suspense>
  );
}

// Only allow same-origin relative paths so ?next= can't bounce elsewhere.
function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}

function UnlockForm() {
  const searchParams = useSearchParams();
  const [passcode, setPasscode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mood: BuddyMood = error ? "sad" : submitting ? "think" : "wave";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!passcode.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode }),
      });
      if (!res.ok) {
        setError(res.status === 401 ? "That's not it. Try again!" : "Something went wrong.");
        setPasscode("");
        return;
      }
      // Full navigation so the new cookie is sent with every request.
      window.location.replace(safeNext(searchParams.get("next")));
    } catch {
      setError("Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="bg-arcade min-h-screen flex items-center justify-center px-4 py-10">
      <form
        onSubmit={handleSubmit}
        className="surface-card w-full max-w-sm p-6 sm:p-8 flex flex-col items-center gap-5 text-center"
      >
        <Buddy mood={mood} size="lg" />
        <div className="space-y-1">
          <h1 className="font-display text-2xl sm:text-3xl text-arcade-strong">
            Hi there!
          </h1>
          <p className="text-base text-arcade-soft">
            Ask a grown-up to type the family passcode.
          </p>
        </div>

        <label htmlFor="passcode" className="sr-only">
          Family passcode
        </label>
        <Input
          id="passcode"
          type="password"
          autoComplete="current-password"
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          placeholder="Passcode"
          aria-invalid={!!error}
          aria-describedby={error ? "passcode-error" : undefined}
          className="bg-[var(--arcade-card-soft)] border-[var(--arcade-edge)]
                     text-arcade-strong placeholder:text-arcade-soft
                     focus-visible:ring-[var(--cat-music-glow)] focus-visible:border-[var(--cat-music)]
                     h-12 rounded-2xl px-4 text-base text-center"
        />

        {error && (
          <p id="passcode-error" role="alert" className="text-sm text-[var(--joy-gold)] -mt-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={!passcode.trim() || submitting}
          className="w-full h-12 rounded-full font-display text-[var(--ink-on-color)]
                     bg-[var(--joy-gold)]
                     border border-[oklch(0.65_0.16_75)]
                     shadow-[0_8px_22px_-10px_var(--joy-gold-glow),inset_0_1px_0_oklch(1_0_0_/_0.4)]
                     hover:brightness-105 active:scale-[0.97]
                     disabled:opacity-60 disabled:cursor-not-allowed
                     inline-flex items-center justify-center gap-2"
        >
          <Lock className="w-4 h-4" aria-hidden />
          {submitting ? "Checking…" : "Let's play"}
        </button>
      </form>
    </main>
  );
}
