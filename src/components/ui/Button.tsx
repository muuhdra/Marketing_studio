'use client'

import { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent-outline'
type ButtonSize    = 'xs' | 'sm' | 'md' | 'lg'

const variants: Record<ButtonVariant, string> = {
  primary: `
    bg-accent text-bg-base border-2 border-accent font-bold
    shadow-neo-sm
    hover:shadow-neo hover:-translate-x-px hover:-translate-y-px
    active:shadow-none active:translate-x-px active:translate-y-px
    disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none
  `,
  secondary: `
    bg-transparent text-text-primary border-2 border-border-strong font-bold
    shadow-neo-white-sm
    hover:border-white/30 hover:shadow-neo-white hover:-translate-x-px hover:-translate-y-px
    active:shadow-none active:translate-x-px active:translate-y-px
    disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none
  `,
  ghost: `
    bg-transparent text-text-secondary border-2 border-transparent font-medium
    hover:text-text-primary hover:bg-white/[0.04] hover:border-border
    active:bg-white/[0.06]
    disabled:opacity-40 disabled:cursor-not-allowed
  `,
  danger: `
    bg-transparent text-coral border-2 border-border-coral font-bold
    shadow-neo-coral
    hover:bg-coral/10 hover:-translate-x-px hover:-translate-y-px
    active:shadow-none active:translate-x-px active:translate-y-px
    disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none
  `,
  'accent-outline': `
    bg-transparent text-accent border-2 border-accent font-bold
    shadow-neo
    hover:bg-accent/10 hover:-translate-x-px hover:-translate-y-px
    active:shadow-none active:translate-x-px active:translate-y-px
    disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none
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
          <span className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
          {children}
        </>
      ) : children}
    </button>
  )
}
