import Image from 'next/image'
import { cn } from '@/lib/utils'

interface LogoProps {
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const sizeMap = {
  sm: 24,
  md: 32, 
  lg: 48,
  xl: 64
}

export function Logo({ className, size = 'md' }: LogoProps) {
  const sizeValue = sizeMap[size]
  
  return (
    <Image 
      src="/icon-512.png" 
      alt="Learn Buddy Logo" 
      width={sizeValue}
      height={sizeValue}
      className={cn(className)}
    />
  )
}