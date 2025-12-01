'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { X } from 'lucide-react'

interface ProductPreviewProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: {
    name: string
    price: number
    stock: number
    imageUrl?: string | null
    companyName?: string
    description?: string
    imagePosition?: 'top' | 'center' | 'bottom'
    cardVariant?: 'classic' | 'minimal' | 'badge'
  }
}

/**
 * 商品プレビューコンポーネント
 * LP（インフルエンサー画面）での商品カードの見た目を再現
 */
export default function ProductPreview({ open, onOpenChange, product }: ProductPreviewProps) {
  const commission = Math.floor(product.price * 0.3) // 報酬額（価格の30%）
  const FALLBACK_IMAGE = 'https://via.placeholder.com/400x300?text=No+Image'

  const objectPosition =
    product.imagePosition === 'top'
      ? '50% 0%'
      : product.imagePosition === 'bottom'
        ? '50% 100%'
        : '50% 50%'

  const variant = product.cardVariant ?? 'classic'

  const renderClassic = () => (
          <article className="group flex flex-col rounded-2xl border border-white/5 bg-zinc-950/60 p-6 shadow-2xl shadow-black/30">
            <div className="relative mb-6 overflow-hidden rounded-xl bg-zinc-900">
              <img
                src={product.imageUrl || FALLBACK_IMAGE}
                alt={product.name}
                className="h-48 w-full object-cover transition duration-500 group-hover:scale-105"
          style={{ objectPosition }}
                onError={(event) => {
                  event.currentTarget.src = FALLBACK_IMAGE
                }}
              />
              {product.companyName && (
                <div className="absolute left-4 top-4 rounded-full bg-white/10 px-4 py-1 text-xs tracking-wide text-zinc-200">
                  {product.companyName}
                </div>
              )}
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-white">{product.name}</h3>
              <p className="mt-2 text-sm text-zinc-500">
                ストック {product.stock.toLocaleString()} 点
              </p>
              <p className="mt-4 text-2xl font-bold text-white">
                ¥{product.price.toLocaleString()}
              </p>
            </div>
            <div className="mt-4 space-y-2 rounded-lg bg-zinc-900/50 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-400">報酬額（30%）</span>
                <span className="font-semibold text-green-400">
                  ¥{commission.toLocaleString()}
                </span>
              </div>
              {product.companyName && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400">企業名</span>
                  <span className="text-zinc-200">{product.companyName}</span>
                </div>
              )}
            </div>
            <button
              disabled
              className="mt-6 inline-flex items-center justify-center rounded-full border border-white/20 px-5 py-2 text-sm font-medium uppercase tracking-[0.3em] text-white opacity-50 cursor-not-allowed"
            >
              参加して販売する
            </button>
          </article>
  )

  const renderMinimal = () => (
    <article className="flex flex-col rounded-3xl border border-zinc-800 bg-zinc-950/80 p-5 shadow-xl shadow-black/40">
      <div className="flex gap-4">
        <div className="relative h-28 w-28 overflow-hidden rounded-2xl bg-zinc-900">
          <img
            src={product.imageUrl || FALLBACK_IMAGE}
            alt={product.name}
            className="h-full w-full object-cover"
            style={{ objectPosition }}
            onError={(event) => {
              event.currentTarget.src = FALLBACK_IMAGE
            }}
          />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white line-clamp-2">{product.name}</h3>
          {product.companyName && (
            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-zinc-500">
              {product.companyName}
            </p>
          )}
          <p className="mt-3 text-xl font-bold text-white">
            ¥{product.price.toLocaleString()}
          </p>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between text-xs text-zinc-500">
        <span>ストック {product.stock.toLocaleString()} 点</span>
        <span>報酬: ¥{commission.toLocaleString()}</span>
      </div>
    </article>
  )

  const renderBadge = () => (
    <article className="group relative flex flex-col overflow-hidden rounded-3xl bg-gradient-to-b from-emerald-500/10 via-zinc-950 to-black border border-emerald-500/40 shadow-2xl shadow-emerald-900/40">
      <div className="relative h-40 w-full overflow-hidden bg-zinc-900">
        <img
          src={product.imageUrl || FALLBACK_IMAGE}
          alt={product.name}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          style={{ objectPosition }}
          onError={(event) => {
            event.currentTarget.src = FALLBACK_IMAGE
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <div className="absolute left-4 bottom-4 flex items-center gap-2">
          <span className="rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-black">
            高報酬
          </span>
          <span className="text-xs text-zinc-200">
            報酬 ¥{commission.toLocaleString()}
          </span>
        </div>
      </div>
      <div className="flex flex-col gap-2 p-5">
        {product.companyName && (
          <p className="text-[11px] uppercase tracking-[0.22em] text-emerald-400/80">
            {product.companyName}
          </p>
        )}
        <h3 className="text-xl font-semibold text-white line-clamp-2">{product.name}</h3>
        <div className="mt-1 flex items-center justify-between text-sm text-zinc-300">
          <span>ストック {product.stock.toLocaleString()} 点</span>
          <span className="text-lg font-bold text-white">
            ¥{product.price.toLocaleString()}
          </span>
        </div>
      </div>
    </article>
  )

  const renderVariant = () => {
    switch (variant) {
      case 'minimal':
        return renderMinimal()
      case 'badge':
        return renderBadge()
      case 'classic':
      default:
        return renderClassic()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0">
        <div className="flex items-center justify-end p-3 pb-0">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-800 hover:text-white"
            aria-label="閉じる"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <DialogHeader className="px-6 pb-4 pt-2">
          <DialogTitle>商品プレビュー</DialogTitle>
          <DialogDescription>
            インフルエンサーに表示される商品カードの見た目
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-6">
          {renderVariant()}
        </div>
      </DialogContent>
    </Dialog>
  )
}

