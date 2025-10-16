import { cn } from '@/lib/utils'

interface LogoProps {
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const sizeClasses = {
  sm: 'h-6 w-6',
  md: 'h-8 w-8', 
  lg: 'h-12 w-12',
  xl: 'h-16 w-16'
}

export function Logo({ className, size = 'md' }: LogoProps) {
  return (
    <img 
      src="/icon-512.png" 
      alt="Learn Buddy Logo" 
      className={cn(sizeClasses[size], className)}
    />
  )
}