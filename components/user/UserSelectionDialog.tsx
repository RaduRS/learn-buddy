'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { UserCard } from './UserCard'
import { Plus, UserPlus, User as UserIcon, Smile, Heart, Star, Zap, Crown, Sparkles, Sun, Moon, Coffee } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { User, CreateUserForm } from '@/types'

interface UserSelectionDialogProps {
  isOpen: boolean
  onClose: () => void
  users: User[]
  onSelectUser: (user: User) => void
  onCreateUser: (userData: CreateUserForm) => void
  className?: string
}

const AVATAR_ICONS = [
  { name: 'smile', icon: Smile, color: 'text-yellow-500' },
  { name: 'heart', icon: Heart, color: 'text-red-500' },
  { name: 'star', icon: Star, color: 'text-blue-500' },
  { name: 'zap', icon: Zap, color: 'text-purple-500' },
  { name: 'crown', icon: Crown, color: 'text-amber-500' },
  { name: 'sparkles', icon: Sparkles, color: 'text-pink-500' },
  { name: 'sun', icon: Sun, color: 'text-orange-500' },
  { name: 'moon', icon: Moon, color: 'text-indigo-500' },
  { name: 'coffee', icon: Coffee, color: 'text-brown-500' },
  { name: 'user', icon: UserIcon, color: 'text-gray-500' },
]

export function UserSelectionDialog({
  isOpen,
  onClose,
  users,
  onSelectUser,
  onCreateUser,
  className
}: UserSelectionDialogProps) {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [selectedUser, setSelectedUser] = useState<string | null>(null)
  const [formData, setFormData] = useState<CreateUserForm>({
    name: '',
    avatar: 'smile',
    age: undefined,
    parentEmail: '',
  })

  const handleSelectUser = (userId: string) => {
    setSelectedUser(userId)
    const user = users.find(u => u.id === userId)
    if (user) {
      onSelectUser(user)
      onClose()
    }
  }

  const handleCreateUser = () => {
    if (formData.name.trim()) {
      onCreateUser({
        ...formData,
        age: formData.age || undefined,
        parentEmail: formData.parentEmail || undefined,
      })
      setFormData({ name: '', avatar: '😊', age: undefined, parentEmail: '' })
      setShowCreateForm(false)
      onClose()
    }
  }

  const resetForm = () => {
    setShowCreateForm(false)
    setSelectedUser(null)
    setFormData({ name: '', avatar: 'smile', age: undefined, parentEmail: '' })
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        resetForm()
        onClose()
      }
    }}>
      <DialogContent className={cn('max-w-4xl max-h-[80vh] overflow-y-auto', className)}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="text-2xl">👋</div>
            {showCreateForm ? 'Create New Profile' : 'Choose Your Profile'}
          </DialogTitle>
          <DialogDescription>
            {showCreateForm 
              ? 'Create a new profile to start playing games and tracking progress.'
              : 'Select your profile to continue playing games and see your progress.'
            }
          </DialogDescription>
        </DialogHeader>

        {!showCreateForm ? (
          <div className="space-y-6">
            {/* Existing Users */}
            {users.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Existing Profiles</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {users.map((user) => (
                    <UserCard
                      key={user.id}
                      user={user}
                      onSelect={handleSelectUser}
                      isSelected={selectedUser === user.id}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Create New User Button */}
            <div className="border-t pt-6">
              <Button
                onClick={() => setShowCreateForm(true)}
                className="w-full sm:w-auto"
                size="lg"
              >
                <UserPlus className="w-5 h-5 mr-2" />
                Create New Profile
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Create User Form */}
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  placeholder="Enter your name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="text-lg"
                />
              </div>

              <div className="grid gap-2">
                <Label>Choose Your Avatar</Label>
                <div className="grid grid-cols-5 gap-2">
                  {AVATAR_ICONS.map((avatarIcon) => {
                    const IconComponent = avatarIcon.icon
                    return (
                      <Button
                        key={avatarIcon.name}
                        variant={formData.avatar === avatarIcon.name ? 'default' : 'outline'}
                        className="aspect-square p-2"
                        onClick={() => setFormData(prev => ({ ...prev, avatar: avatarIcon.name }))}
                      >
                        <IconComponent className={`h-6 w-6 ${avatarIcon.color}`} />
                      </Button>
                    )
                  })}
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="age">Age (optional)</Label>
                <Input
                  id="age"
                  type="number"
                  placeholder="How old are you?"
                  min="3"
                  max="18"
                  value={formData.age || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    age: e.target.value ? parseInt(e.target.value) : undefined 
                  }))}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="parentEmail">Parent&apos;s Email (optional)</Label>
                <Input
                  id="parentEmail"
                  type="email"
                  placeholder="parent@example.com"
                  value={formData.parentEmail}
                  onChange={(e) => setFormData(prev => ({ ...prev, parentEmail: e.target.value }))}
                />
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowCreateForm(false)}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleCreateUser}
                disabled={!formData.name.trim()}
                className="flex-1"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Profile
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}