'use client'

import * as React from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Dialogコンポーネント
 * モーダルダイアログ
 */
interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null

  return (
    <>
      {/* オーバーレイ */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={() => onOpenChange(false)}
      />

      {/* ダイアログ */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white border border-[#e5e5e5] rounded-lg shadow-xl w-full max-w-md">
          {children}
        </div>
      </div>
    </>
  )
}

/**
 * DialogContentコンポーネント
 */
export function DialogContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('p-6', className)}>{children}</div>
}

/**
 * DialogHeaderコンポーネント
 */
export function DialogHeader({ children }: { children: React.ReactNode }) {
  return <div className="space-y-2 mb-4">{children}</div>
}

/**
 * DialogTitleコンポーネント
 */
export function DialogTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-lg font-semibold text-[#171717]">{children}</h3>
}

/**
 * DialogDescriptionコンポーネント
 */
export function DialogDescription({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-[#737373]">{children}</p>
}

/**
 * DialogFooterコンポーネント
 */
export function DialogFooter({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center justify-end gap-3 mt-6">{children}</div>
}

/**
 * DialogCloseコンポーネント
 */
export function DialogClose({ onClose }: { onClose: () => void }) {
  return (
    <button
      onClick={onClose}
      className="absolute top-4 right-4 p-2 rounded-md hover:bg-[#f5f5f5] transition-colors"
      aria-label="閉じる"
    >
      <X className="w-5 h-5 text-[#737373]" />
    </button>
  )
}

