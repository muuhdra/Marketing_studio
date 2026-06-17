'use client'

import { InputHTMLAttributes, TextareaHTMLAttributes, ReactNode, forwardRef } from 'react'
import { cn } from '@/lib/utils'

// ─── Input ───────────────────────────────────────────────────

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
  error?: string
  icon?: ReactNode
  suffix?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  hint,
  error,
  icon,
  suffix,
  className,
  id,
  ...props
}, ref) => {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="nb-label">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {icon && (
          <span className="absolute left-3 text-text-muted pointer-events-none">
            {icon}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'bg-bg-input text-text-primary placeholder:text-text-faint',
            'border rounded-neo-md font-sans text-[13.5px]',
            'px-3.5 py-2.5 w-full outline-none',
            'transition-all duration-150',
            'border-border hover:border-border-strong',
            'focus:border-accent focus:shadow-neo-sm',
            error && 'border-coral focus:border-coral',
            icon && 'pl-9',
            suffix && 'pr-10',
            className,
          )}
          {...props}
        />
        {suffix && (
          <span className="absolute right-3 text-text-muted pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
      {error && (
        <p className="font-sans text-xs text-coral">{error}</p>
      )}
      {hint && !error && (
        <p className="font-sans text-xs text-text-dim">{hint}</p>
      )}
    </div>
  )
})
Input.displayName = 'Input'

// ─── Textarea ────────────────────────────────────────────────

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  hint?: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({
  label,
  hint,
  error,
  className,
  id,
  ...props
}, ref) => {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="nb-label">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={inputId}
        className={cn(
          'bg-bg-input text-text-primary placeholder:text-text-faint',
          'border rounded-neo-md font-sans text-[13.5px]',
          'px-3.5 py-2.5 w-full outline-none resize-y leading-relaxed',
          'transition-all duration-150',
          'border-border hover:border-border-strong',
          'focus:border-accent focus:shadow-neo-sm',
          error && 'border-coral focus:border-coral',
          className,
        )}
        {...props}
      />
      {error && (
        <p className="font-sans text-xs text-coral">{error}</p>
      )}
      {hint && !error && (
        <p className="font-sans text-xs text-text-dim">{hint}</p>
      )}
    </div>
  )
})
Textarea.displayName = 'Textarea'
