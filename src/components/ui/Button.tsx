'use client'

import { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent-outline'
type ButtonSize    = 'xs' | 'sm' | 'md' | 'lg'

const variants: Record<ButtonVariant, string> = {
  primary: `
    bg-accent text-bg-base border border-accent font-bold
    hover:bg-accent/90 hover:border-accent/90
    active:scale-[0.98]
    disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none
  `,
  secondary: `
    bg-fg/[0.04] text-text-primary border border-border-strong font-bold
    hover:bg-fg/[0.08] hover:border-fg/30
    active:scale-[0.98]
    disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none
  `,
  ghost: `
    bg-transparent text-text-secondary border border-transparent font-medium
    hover:text-text-primary hover:bg-fg/[0.05] hover:border-border
    active:bg-fg/[0.08]
    disabled:opacity-40 disabled:cursor-not-allowed
  `,
  danger: `
    bg-transparent text-coral border border-border-coral font-bold
    hover:bg-coral/10
    active:scale-[0.98]
    disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none
  `,
  'accent-outline': `
    bg-transparent text-accent border border-accent font-bold
    hover:bg-accent/10
    active:scale-[0.98]
    disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none
  `,
}

const sizes: Record<ButtonSize, string> = {
  xs: 'px-3 py-1.5 text-xs gap-1.5',
  sm: 'px-4 py-2 text-sm gap-2',
  md: 'px-5 py-2.5 text-sm gap-2',
  lg: 'px-6 py-3 text-base gap-2.5',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  children: ReactNode
  loading?: boolean
  fullWidth?: boolean
}

export default function Button({
  variant = 'primary',
  size = 'md',
  children,
  loading = false,
  fullWidth = false,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center rounded-neo-md font-sans cursor-pointer transition-all duration-100 select-none whitespace-nowrap',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {loading ? (
        <>
          <span className="w-3.5 h-3.5 rounded-full border border-current border-t-transparent animate-spin" />
          {children}
        </>
      ) : children}
    </button>
  )
}
