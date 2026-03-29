"use client";

import { Button } from "@/components/ui/button";
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
  Settings,
  Coins,
  Crown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/logo";
import { useScore } from "@/hooks/useScore";
import type { User } from "@/types";

interface HeaderProps {
  currentUser?: User | null;
  onNavigate: (page: string) => void;
  className?: string;
}

export function Header({ currentUser, onNavigate, className }: HeaderProps) {
  const { totalScore, scoreLoaded } = useScore();

  const menuItems = [
    { id: "home", label: "Home", icon: Home },
    { id: "profile", label: "My Profile", icon: UserIcon },
    { id: "achievements", label: "Achievements", icon: Trophy },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <header
      className={cn(
        "bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-50",
        "backdrop-blur-sm bg-white/95",
        className,
      )}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo and Title */}
        <div className="flex items-center gap-3">
          <Logo size="md" className="text-blue-600" />
          <div>
            <h1 className="text-xl font-bold text-gray-800">Learn Buddy</h1>
            <p className="text-xs text-gray-500 hidden sm:block">
              Fun Learning Games for Kids
            </p>
          </div>
        </div>

        {/* Total Score Display — hidden until loaded to avoid flashing 0 */}
        {currentUser && scoreLoaded && (
          <div className="flex items-center gap-2 bg-gradient-to-r from-yellow-100 to-amber-100 px-3 py-2 rounded-full border border-yellow-200">
            <Coins className="w-5 h-5 text-yellow-600" />
            <span className="font-bold text-yellow-800">{totalScore}</span>
          </div>
        )}

        {/* User Info and Menu */}
        <div className="flex items-center gap-3">
          {currentUser && (
            <div className="hidden sm:flex items-center gap-2">
              <div className="text-sm">
                <div className="font-medium text-gray-800">
                  {currentUser.name}
                </div>
              </div>
              <div className="w-7 h-7 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center">
                <Crown className="w-4 h-4 text-amber-600" />
              </div>
            </div>
          )}

          {/* Mobile/Tablet Menu — visible on anything below lg breakpoint */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="lg:hidden">
                <Menu className="w-4 h-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Logo size="sm" className="text-blue-600" />
                  Learn Buddy
                </SheetTitle>
                <SheetDescription>Fun Learning Games for Kids</SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-4">
                {currentUser && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium text-gray-800">
                        {currentUser.name}
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center">
                      <Crown className="w-4 h-4 text-amber-600" />
                    </div>
                  </div>
                )}

                <nav className="space-y-2">
                  {menuItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Button
                        key={item.id}
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => onNavigate(item.id)}
                      >
                        <Icon className="w-4 h-4 mr-3" />
                        {item.label}
                      </Button>
                    );
                  })}
                </nav>
              </div>
            </SheetContent>
          </Sheet>

          {/* Desktop Menu — visible from lg breakpoint and up */}
          <nav className="hidden lg:flex items-center gap-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <Button
                  key={item.id}
                  variant="ghost"
                  size="sm"
                  onClick={() => onNavigate(item.id)}
                  className="flex items-center gap-2"
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Button>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
