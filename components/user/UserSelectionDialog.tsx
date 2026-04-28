"use client";

import { useState } from "react";
import {
  Coffee,
  Crown,
  Heart,
  Moon,
  Plus,
  Sparkles,
  Star,
  Sun,
  User as UserIcon,
  UserPlus,
  Smile,
  Zap,
} from "lucide-react";
import type { ComponentType, CSSProperties } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserCard } from "./UserCard";
import { Buddy } from "@/components/mascot/Buddy";
import { useSfx } from "@/components/sound/SoundProvider";
import { cn } from "@/lib/utils";
import type { CreateUserForm, User } from "@/types";

const AVATAR_OPTIONS: {
  name: string;
  Icon: ComponentType<{ className?: string; style?: CSSProperties }>;
  tint: string;
}[] = [
  { name: "smile",    Icon: Smile,    tint: "var(--joy-gold)" },
  { name: "heart",    Icon: Heart,    tint: "var(--cat-spatial)" },
  { name: "star",     Icon: Star,     tint: "var(--cat-math)" },
  { name: "zap",      Icon: Zap,      tint: "var(--cat-default)" },
  { name: "crown",    Icon: Crown,    tint: "var(--joy-gold)" },
  { name: "sparkles", Icon: Sparkles, tint: "var(--cat-memory)" },
  { name: "sun",      Icon: Sun,      tint: "var(--cat-reading)" },
  { name: "moon",     Icon: Moon,     tint: "var(--cat-default)" },
  { name: "coffee",   Icon: Coffee,   tint: "var(--cat-spatial)" },
  { name: "user",     Icon: UserIcon, tint: "var(--ink-soft)" },
];

interface UserSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  onSelectUser: (user: User) => void;
  onCreateUser: (userData: CreateUserForm) => void;
  className?: string;
}

const ARCADE_INPUT =
  "bg-[var(--arcade-card-soft)] border-[var(--arcade-edge)] " +
  "text-arcade-strong placeholder:text-arcade-soft " +
  "focus-visible:ring-[var(--cat-music-glow)] focus-visible:border-[var(--cat-music)] " +
  "h-12 rounded-2xl px-4 text-base";

export function UserSelectionDialog({
  isOpen,
  onClose,
  users,
  onSelectUser,
  onCreateUser,
  className,
}: UserSelectionDialogProps) {
  const { play } = useSfx();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateUserForm>({
    name: "",
    avatar: "smile",
    age: undefined,
    parentEmail: "",
  });

  const handleSelectUser = (userId: string) => {
    play("ding");
    setSelectedUserId(userId);
    const user = users.find((u) => u.id === userId);
    if (user) {
      onSelectUser(user);
      onClose();
    }
  };

  const handleCreateUser = () => {
    if (!formData.name.trim()) return;
    play("levelup");
    onCreateUser({
      ...formData,
      age: formData.age || undefined,
      parentEmail: formData.parentEmail || undefined,
    });
    setFormData({ name: "", avatar: "smile", age: undefined, parentEmail: "" });
    setShowCreateForm(false);
    onClose();
  };

  const reset = () => {
    setShowCreateForm(false);
    setSelectedUserId(null);
    setFormData({ name: "", avatar: "smile", age: undefined, parentEmail: "" });
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          reset();
          onClose();
        }
      }}
    >
      <DialogContent
        className={cn(
          "max-w-3xl max-h-[88vh] overflow-y-auto scroll-arcade",
          "bg-[var(--arcade-card)] border-[var(--arcade-edge)] rounded-3xl",
          "shadow-[0_30px_60px_-20px_oklch(0_0_0_/_0.8)]",
          "p-0",
          className,
        )}
      >
        <div className="bg-arcade rounded-3xl">
          <DialogHeader className="px-6 sm:px-8 pt-6 pb-4 border-b border-[var(--arcade-edge)] text-left">
            <DialogTitle className="flex items-center gap-3 text-arcade-strong font-display text-2xl">
              <Buddy mood="wave" size="sm" still />
              {showCreateForm ? "Create your profile" : "Choose your profile"}
            </DialogTitle>
            <DialogDescription className="text-arcade-soft">
              {showCreateForm
                ? "Tell Buddy a little about you so we can save your stars."
                : "Pick the player. Each profile keeps its own stars and trophies."}
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 sm:px-8 py-6">
            {showCreateForm ? (
              <CreateForm
                formData={formData}
                setFormData={setFormData}
                onCancel={() => setShowCreateForm(false)}
                onCreate={handleCreateUser}
                inputClass={ARCADE_INPUT}
              />
            ) : (
              <div className="space-y-6">
                {users.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    {users.map((user) => (
                      <UserCard
                        key={user.id}
                        user={user}
                        onSelect={handleSelectUser}
                        isSelected={selectedUserId === user.id}
                      />
                    ))}

                    <button
                      type="button"
                      onClick={() => {
                        play("tap");
                        setShowCreateForm(true);
                      }}
                      className={cn(
                        "surface-card cat-music min-h-[10rem]",
                        "flex flex-col items-center justify-center gap-3 text-arcade-strong",
                        "active:scale-[0.985]",
                      )}
                      aria-label="Create a new profile"
                    >
                      <span className="grid place-items-center w-14 h-14 rounded-full bg-[oklch(0.20_0.06_285_/_0.65)] border border-[var(--arcade-edge)]">
                        <UserPlus className="w-7 h-7" style={{ color: "var(--cat-music)" }} />
                      </span>
                      <span className="font-display text-lg">Add new profile</span>
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <div className="flex justify-center mb-4">
                      <Buddy mood="wave" size="lg" />
                    </div>
                    <h3 className="font-display text-2xl text-arcade-strong">
                      No profiles yet — let&apos;s make one!
                    </h3>
                    <p className="mt-2 text-arcade-mid">
                      Each player gets their own stars and trophies.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowCreateForm(true)}
                      className="mt-5 font-display text-lg px-6 py-3 rounded-full
                                 text-[var(--ink-on-color)]
                                 bg-[var(--cat-music)]
                                 hover:brightness-105 active:scale-[0.97]
                                 shadow-[0_8px_22px_-10px_var(--cat-music-glow),inset_0_1px_0_oklch(1_0_0_/_0.4)]
                                 border border-[oklch(0.45_0.10_160)]"
                    >
                      Create your profile
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  function CreateForm({
    formData,
    setFormData,
    onCancel,
    onCreate,
    inputClass,
  }: {
    formData: CreateUserForm;
    setFormData: (updater: (prev: CreateUserForm) => CreateUserForm) => void;
    onCancel: () => void;
    onCreate: () => void;
    inputClass: string;
  }) {
    return (
      <div className="grid gap-5">
        <div className="grid gap-2">
          <Label htmlFor="name" className="text-arcade-mid font-display">
            Name
          </Label>
          <Input
            id="name"
            placeholder="What's your name?"
            value={formData.name}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, name: e.target.value }))
            }
            className={inputClass}
          />
        </div>

        <div className="grid gap-2">
          <Label className="text-arcade-mid font-display">Pick your avatar</Label>
          <div className="grid grid-cols-5 gap-2">
            {AVATAR_OPTIONS.map(({ name, Icon, tint }) => {
              const selected = formData.avatar === name;
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => {
                    play("tap");
                    setFormData((prev) => ({ ...prev, avatar: name }));
                  }}
                  aria-pressed={selected}
                  aria-label={`Avatar ${name}`}
                  className={cn(
                    "aspect-square rounded-2xl grid place-items-center",
                    "bg-[var(--arcade-card-soft)] border border-[var(--arcade-edge)]",
                    "active:scale-[0.95] transition-transform",
                  )}
                  style={
                    selected
                      ? ({
                          outline: "2px solid var(--joy-gold)",
                          outlineOffset: "-2px",
                        } as CSSProperties)
                      : undefined
                  }
                >
                  <Icon className="w-6 h-6" style={{ color: tint }} />
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="age" className="text-arcade-mid font-display">
            Age <span className="text-arcade-soft text-xs">(optional)</span>
          </Label>
          <Input
            id="age"
            type="number"
            placeholder="How old are you?"
            min={3}
            max={18}
            value={formData.age ?? ""}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                age: e.target.value ? parseInt(e.target.value, 10) : undefined,
              }))
            }
            className={inputClass}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="parentEmail" className="text-arcade-mid font-display">
            Parent&apos;s email <span className="text-arcade-soft text-xs">(optional)</span>
          </Label>
          <Input
            id="parentEmail"
            type="email"
            placeholder="parent@example.com"
            value={formData.parentEmail ?? ""}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, parentEmail: e.target.value }))
            }
            className={inputClass}
          />
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 h-12 rounded-full font-display text-arcade-strong
                       bg-[var(--arcade-card-soft)]
                       border border-[var(--arcade-edge)]
                       active:scale-[0.97]"
          >
            Back
          </button>
          <button
            type="button"
            onClick={onCreate}
            disabled={!formData.name.trim()}
            className="flex-1 h-12 rounded-full font-display text-[var(--ink-on-color)]
                       bg-[var(--joy-gold)]
                       border border-[oklch(0.65_0.16_75)]
                       shadow-[0_8px_22px_-10px_var(--joy-gold-glow),inset_0_1px_0_oklch(1_0_0_/_0.4)]
                       hover:brightness-105 active:scale-[0.97]
                       disabled:opacity-60 disabled:cursor-not-allowed
                       inline-flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" aria-hidden />
            Create profile
          </button>
        </div>
      </div>
    );
  }
}
