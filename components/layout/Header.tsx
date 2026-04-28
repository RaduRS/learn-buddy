"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Menu,
  Home,
  User as UserIcon,
  Trophy,
  Coins,
  Volume2,
  VolumeX,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Buddy } from "@/components/mascot/Buddy";
import { useScore } from "@/hooks/useScore";
import { useSfx } from "@/components/sound/SoundProvider";
import type { User } from "@/types";

interface HeaderProps {
  currentUser?: User | null;
  onNavigate: (page: string) => void;
  className?: string;
}

const MENU_ITEMS = [
  { id: "home", label: "Home", icon: Home },
  { id: "profile", label: "My Profile", icon: UserIcon },
  { id: "achievements", label: "Achievements", icon: Trophy },
] as const;

/**
 * App-shell Header used by Home and Achievements.
 * Game routes use <GameShell> which carries its own header.
 *
 * Single wordmark (no duplicated title/subtitle), sticky, arcade-tinted,
 * with a mute toggle, gold score chip and a profile pill that opens the
 * profile dialog. Hamburger sheet on small screens.
 */
export function Header({ currentUser, onNavigate, className }: HeaderProps) {
  const { totalScore, scoreLoaded } = useScore();
  const { muted, toggleMute, play } = useSfx();

  const handleNav = (id: string) => {
    play("tap");
    onNavigate(id);
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-50 px-3 sm:px-6 pt-3 pb-3",
        "backdrop-blur-md bg-[oklch(0.18_0.07_285_/_0.65)]",
        "border-b border-[var(--arcade-edge)]",
        className,
      )}
    >
      <div className="max-w-6xl mx-auto flex items-center gap-3">
        {/* Wordmark */}
        <button
          type="button"
          onClick={() => handleNav("home")}
          className="flex items-center gap-2 sm:gap-3 group"
          aria-label="Go to home"
        >
          <span className="hidden sm:inline-flex">
            <Buddy mood="wave" size="sm" still />
          </span>
          <span className="sm:hidden">
            <Buddy mood="idle" size="xs" still />
          </span>
          <span className="font-display text-xl sm:text-2xl text-arcade-strong leading-none">
            Learn{" "}
            <span style={{ color: "var(--cat-music)" }}>Buddy</span>
          </span>
        </button>

        <span className="flex-1" />

        {/* Score chip */}
        {currentUser && scoreLoaded && (
          <span className="chip chip-gold" aria-label={`Total score: ${totalScore}`}>
            <Coins className="w-4 h-4" aria-hidden />
            <span className="font-display text-base leading-none">{totalScore}</span>
          </span>
        )}

        {/* Mute */}
        <button
          type="button"
          onClick={() => {
            play("tap");
            toggleMute();
          }}
          aria-pressed={muted}
          aria-label={muted ? "Unmute sound" : "Mute sound"}
          className="h-10 w-10 grid place-items-center rounded-full
                     bg-[var(--arcade-card-soft)] text-arcade-strong
                     border border-[var(--arcade-edge)]
                     shadow-[inset_0_1px_0_oklch(1_0_0_/_0.10)]
                     active:scale-[0.94]"
        >
          {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>

        {/* Profile pill (tablet+) */}
        {currentUser && (
          <button
            type="button"
            onClick={() => handleNav("profile")}
            className="hidden sm:flex items-center gap-2 chip"
            aria-label={`Switch profile, current: ${currentUser.name}`}
          >
            <span className="grid place-items-center w-7 h-7 rounded-full bg-[oklch(0.85_0.16_88_/_0.20)] border border-[oklch(0.85_0.16_88_/_0.4)]">
              <UserIcon className="w-4 h-4" style={{ color: "var(--joy-gold)" }} />
            </span>
            <span className="font-display text-sm">{currentUser.name}</span>
          </button>
        )}

        {/* Mobile menu */}
        <Sheet>
          <SheetTrigger asChild>
            <button
              type="button"
              aria-label="Open menu"
              className="lg:hidden h-10 w-10 grid place-items-center rounded-full
                         bg-[var(--arcade-card-soft)] text-arcade-strong
                         border border-[var(--arcade-edge)]
                         shadow-[inset_0_1px_0_oklch(1_0_0_/_0.10)]
                         active:scale-[0.94]"
            >
              <Menu className="w-5 h-5" />
            </button>
          </SheetTrigger>
          <SheetContent
            side="right"
            className="w-80 bg-arcade text-arcade-mid border-l border-[var(--arcade-edge)]"
          >
            <SheetHeader className="border-b border-[var(--arcade-edge)] pb-4">
              <SheetTitle className="flex items-center gap-3 text-arcade-strong font-display">
                <Buddy mood="wave" size="sm" still />
                Menu
              </SheetTitle>
              <SheetDescription className="text-arcade-soft">
                Where to next?
              </SheetDescription>
            </SheetHeader>

            <div className="mt-6 space-y-2 px-1">
              {currentUser && (
                <button
                  type="button"
                  onClick={() => handleNav("profile")}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl
                             surface-card cat-default
                             text-arcade-strong text-left"
                >
                  <span className="grid place-items-center w-9 h-9 rounded-full bg-[oklch(0.85_0.16_88_/_0.20)] border border-[oklch(0.85_0.16_88_/_0.4)]">
                    <UserIcon className="w-4 h-4" style={{ color: "var(--joy-gold)" }} />
                  </span>
                  <span className="flex-1 font-display">{currentUser.name}</span>
                  <span className="text-arcade-soft text-sm">Switch</span>
                </button>
              )}

              <nav className="space-y-2 pt-2">
                {MENU_ITEMS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleNav(item.id)}
                      className="w-full flex items-center gap-3 p-3 rounded-2xl
                                 bg-[var(--arcade-card-soft)] text-arcade-strong
                                 border border-[var(--arcade-edge)]
                                 active:scale-[0.98]"
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-display">{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </SheetContent>
        </Sheet>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-1.5">
          {MENU_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNav(item.id)}
                className="h-10 inline-flex items-center gap-2 px-3 rounded-full
                           text-arcade-mid hover:text-arcade-strong
                           hover:bg-[oklch(1_0_0_/_0.06)]"
              >
                <Icon className="w-4 h-4" />
                <span className="font-display text-sm">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
