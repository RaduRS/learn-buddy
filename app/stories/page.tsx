"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Mic } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { LoadingScreen } from "@/components/game/LoadingScreen";
import { Buddy } from "@/components/mascot/Buddy";
import { findTheme } from "@/lib/games/storyThemes";
import { useSfx } from "@/components/sound/SoundProvider";
import type { User } from "@/types";

interface StorySummary {
  id: string;
  title: string;
  theme: string;
  status: "in_progress" | "complete";
  createdAt: string;
  updatedAt: string;
  _count: { beats: number };
}

export default function StoriesPage() {
  const router = useRouter();
  const { play } = useSfx();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [stories, setStories] = useState<StorySummary[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const savedUserId = localStorage.getItem("selectedUserId");
      if (!savedUserId) {
        router.push("/");
        return;
      }

      const usersRes = await fetch("/api/users");
      const users = (await usersRes.json()) as User[];
      const user = users.find((u) => u.id === savedUserId);
      if (!user) {
        router.push("/");
        return;
      }
      setCurrentUser(user);

      const res = await fetch(`/api/stories?userId=${savedUserId}`);
      const data = (await res.json()) as StorySummary[];
      setStories(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load stories:", error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleNavigate = (page: string) => {
    if (page === "home") router.push("/");
    else if (page === "achievements") router.push("/achievements");
    else if (page === "stories") void load();
    else if (page === "profile") router.push("/");
  };

  const openStory = (id: string) => {
    play("whoosh");
    router.push(`/stories/${id}`);
  };

  if (loading) {
    return (
      <LoadingScreen
        tone="loading"
        message="Opening your story shelf…"
        subMessage="Buddy is dusting off the books."
        fullscreen
      />
    );
  }

  return (
    <div className="bg-arcade min-h-screen">
      <Header currentUser={currentUser} onNavigate={handleNavigate} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 pb-12">
        <div className="flex items-center gap-3 mb-6">
          <BookOpen className="w-6 h-6" style={{ color: "var(--cat-creative)" }} aria-hidden />
          <h1 className="font-display text-2xl sm:text-3xl text-arcade-strong">
            My Stories
          </h1>
        </div>

        {stories.length === 0 ? (
          <EmptyState onHome={() => router.push("/")} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {stories.map((story) => {
              const theme = findTheme(story.theme);
              const { Icon } = theme;
              const status =
                story.status === "complete" ? "The end" : "Still going";
              return (
                <button
                  key={story.id}
                  type="button"
                  onClick={() => openStory(story.id)}
                  className="surface-card cat-creative text-left p-5 sm:p-6 active:scale-[0.985]"
                >
                  <div className="flex items-start gap-4">
                    <span
                      aria-hidden
                      className="grid place-items-center shrink-0 w-14 h-14 rounded-2xl
                                 bg-[oklch(0.20_0.06_285_/_0.6)]
                                 border border-[var(--arcade-edge)]"
                      style={{ boxShadow: `0 8px 26px -14px var(${theme.token})` }}
                    >
                      <Icon className="w-7 h-7" strokeWidth={1.6} style={{ color: `var(${theme.token})` }} />
                    </span>
                    <div className="min-w-0">
                      <h2 className="font-display text-xl text-arcade-strong leading-tight line-clamp-2">
                        {story.title}
                      </h2>
                      <p className="mt-1 text-sm text-arcade-mid">
                        {theme.label} · {story._count.beats}{" "}
                        {story._count.beats === 1 ? "page" : "pages"}
                      </p>
                      <p className="mt-1 text-xs text-arcade-soft">
                        {status} · {formatDate(story.updatedAt)}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

function EmptyState({ onHome }: { onHome: () => void }) {
  return (
    <div className="surface-card cat-creative max-w-lg mx-auto px-6 py-10 text-center">
      <div className="flex justify-center mb-3">
        <Buddy mood="wave" size="lg" />
      </div>
      <h2 className="font-display text-2xl text-arcade-strong">
        No stories yet
      </h2>
      <p className="mt-2 text-arcade-mid">
        Play Build a Story and Buddy will keep every tale you make right here.
      </p>
      <button
        type="button"
        onClick={onHome}
        className="mt-6 inline-flex items-center gap-2 font-display text-lg px-7 py-3 rounded-full
                   text-[var(--ink-on-color)] bg-[var(--joy-gold)] hover:brightness-105 active:scale-[0.97]
                   shadow-[0_8px_22px_-10px_var(--joy-gold-glow),inset_0_1px_0_oklch(1_0_0_/_0.4)]
                   border border-[oklch(0.65_0.16_75)]"
      >
        <Mic className="w-5 h-5" aria-hidden />
        Make a story
      </button>
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
}
