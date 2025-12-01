import * as React from 'react'
import { cn } from '@/lib/utils'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', ...props }, ref) => {
    return (
      <button
        className={cn(
          'inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-0 disabled:pointer-events-none disabled:opacity-50',
          // Primary: アクセントブルー
          variant === 'default' &&
            'bg-[#2563EB] text-white hover:bg-[#1D4ED8]',
          // Secondary: ダーク背景上のアウトライン
          variant === 'outline' &&
            'border border-[#2A2A30] bg-transparent text-[#E5E7EB] hover:bg-[#17171C]',
          // Ghost: 控えめなテキストボタン
          variant === 'ghost' &&
            'text-[#B0B0B8] hover:bg-[#17171C]',
          size === 'sm' && 'h-8 px-3 text-sm',
          size === 'md' && 'h-10 px-4 text-sm',
          size === 'lg' && 'h-12 px-6 text-base',
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

