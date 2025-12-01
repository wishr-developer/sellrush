'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useDropzone } from 'react-dropzone'
import Cropper, { type Area } from 'react-easy-crop'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Upload, X, AlertCircle, Package, Eye } from 'lucide-react'
import ProductPreview from '@/components/products/ProductPreview'
import { cn } from '@/lib/utils'

const CATEGORY_OPTIONS = ['アパレル', '美容', '食品', 'デジタル', 'その他'] as const
type CategoryOption = (typeof CATEGORY_OPTIONS)[number]

/**
 * 商品フォームのスキーマ
 */
const productFormSchema = z.object({
  name: z.string().min(2, '商品名は2文字以上で入力してください').max(50),
  price: z.number().min(1, '価格は1円以上で入力してください'),
  stock: z.number().min(0, '在庫数は0個以上で入力してください').int(),
  category: z.enum(CATEGORY_OPTIONS, {
    required_error: 'カテゴリは必須です',
  }),
  description: z.string().optional(),
  influencerMessage: z.string().optional(), // インフルエンサーへの伝言
})

type ProductFormData = z.infer<typeof productFormSchema>

interface Product {
  id: string
  name: string
  price: number
  stock: number
  description?: string
  image_url?: string
  status: string
  created_at: string
  updated_at?: string | null
  tags?: string[] | null
  category?: CategoryOption | null
}

/**
 * 商品イベントログを記録するヘルパー関数
 * エラーが発生してもメイン処理を止めない（ログ用途）
 */
async function logProductEvent(
  productId: string,
  eventType: 'product_created' | 'product_updated' | 'product_published' | 'product_viewed' | 'product_ordered',
  metadata?: Record<string, any>,
) {
  try {
    await supabase.from('product_events').insert({
      product_id: productId,
      event_type: eventType,
      metadata: metadata || {},
    })
  } catch (error) {
    // イベント記録の失敗はログに記録するだけで、メイン処理には影響を与えない
    console.warn('商品イベントログの記録に失敗しました:', error)
  }
}

/**
 * product_stats テーブルを初期化（商品作成時）
 * エラーが発生してもメイン処理を止めない
 */
async function initializeProductStats(productId: string) {
  try {
    await supabase.from('product_stats').upsert({
      product_id: productId,
      view_count: 0,
      order_count: 0,
      revenue_total: 0,
    })
  } catch (error) {
    console.warn('product_stats の初期化に失敗しました:', error)
  }
}

/**
 * product_viewed イベント発生時に product_stats を更新
 * エラーが発生してもメイン処理を止めない
 */
async function incrementViewCount(productId: string) {
  try {
    const { error } = await supabase.rpc('increment_product_view_count', {
      p_product_id: productId,
    })
    
    // RPCが存在しない場合は、直接updateで対応
    if (error && error.message.includes('function') && error.message.includes('does not exist')) {
      // フォールバック: 既存のstatsを取得して+1
      const { data: existing } = await supabase
        .from('product_stats')
        .select('view_count')
        .eq('product_id', productId)
        .single()
      
      if (existing) {
        await supabase
          .from('product_stats')
          .update({
            view_count: (existing.view_count || 0) + 1,
            last_viewed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('product_id', productId)
      } else {
        // statsが存在しない場合は初期化
        await supabase.from('product_stats').insert({
          product_id: productId,
          view_count: 1,
          last_viewed_at: new Date().toISOString(),
        })
      }
    }
  } catch (error) {
    console.warn('view_count の更新に失敗しました:', error)
  }
}

/**
 * product_ordered イベント発生時に product_stats を更新
 * エラーが発生してもメイン処理を止めない
 */
async function incrementOrderCount(
  productId: string,
  price: number,
  quantity: number = 1,
) {
  try {
    const revenue = price * quantity
    
    // 既存のstatsを取得
    const { data: existing } = await supabase
      .from('product_stats')
      .select('order_count, revenue_total')
      .eq('product_id', productId)
      .single()
    
    if (existing) {
      await supabase
        .from('product_stats')
        .update({
          order_count: (existing.order_count || 0) + 1,
          revenue_total: (existing.revenue_total || 0) + revenue,
          last_ordered_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('product_id', productId)
    } else {
      // statsが存在しない場合は初期化
      await supabase.from('product_stats').insert({
        product_id: productId,
        order_count: 1,
        revenue_total: revenue,
        last_ordered_at: new Date().toISOString(),
      })
    }
  } catch (error) {
    console.warn('order_count の更新に失敗しました:', error)
  }
}

/**
 * 商品管理ページ
 */
export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [companyName, setCompanyName] = useState<string>('')
  const [imageFocus, setImageFocus] = useState<'top' | 'center' | 'bottom'>('center')
  const [cardVariant, setCardVariant] = useState<'classic' | 'minimal' | 'badge'>('classic')

  // タグ（商品マスター単位）
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [allTags, setAllTags] = useState<string[]>([])
  const [selectedFilterTags, setSelectedFilterTags] = useState<string[]>([])

  // 画像トリミング用の状態
  const [isCropModalOpen, setIsCropModalOpen] = useState(false)
  const [rawImageFile, setRawImageFile] = useState<File | null>(null)
  const [rawImageUrl, setRawImageUrl] = useState<string | null>(null)
  const [crop, setCrop] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch,
  } = useForm<ProductFormData>({
    resolver: zodResolver(productFormSchema),
  })

  // フォームの値を監視（プレビュー用）
  const formValues = watch()

  // 商品一覧を取得
  useEffect(() => {
    fetchProducts()
    fetchCompanyName()
  }, [])

  // 会社名を取得
  const fetchCompanyName = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('companies')
        .select('company_name')
        .eq('owner_id', user.id)
        .single()

      if (data) {
        setCompanyName(data.company_name)
      }
    } catch (error) {
      console.error('会社名の取得に失敗:', error)
    }
  }

  const fetchProducts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      if (data) {
        setProducts(data)
        // 既存の商品からタグ候補を収集
        const tagSet = new Set<string>()
        data.forEach((p) => {
          ;(p.tags || []).forEach((t: string) => tagSet.add(t))
        })
        setAllTags(Array.from(tagSet).sort())
      }
    } catch (error) {
      console.error('商品の取得に失敗:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // 画像アップロード（トリミング前に一旦ローカルで保持）
  const onDrop = (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    const objectUrl = URL.createObjectURL(file)
    setRawImageFile(file)
    setRawImageUrl(objectUrl)
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setCroppedAreaPixels(null)
    setIsCropModalOpen(true)
  }

  const handleCropComplete = (_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels)
  }

  const createImage = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => resolve(img)
      img.onerror = (error) => reject(error)
      img.src = url
    })
  }

  const getCroppedBlob = async (imageSrc: string, cropArea: Area): Promise<Blob> => {
    const image = await createImage(imageSrc)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Canvas context not available')
    }

    canvas.width = cropArea.width
    canvas.height = cropArea.height

    ctx.drawImage(
      image,
      cropArea.x,
      cropArea.y,
      cropArea.width,
      cropArea.height,
      0,
      0,
      cropArea.width,
      cropArea.height,
    )

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('Failed to generate image blob'))
        }
      }, 'image/jpeg')
    })
  }

  const handleCropConfirm = async () => {
    if (!rawImageUrl || !croppedAreaPixels) {
      setIsCropModalOpen(false)
      return
    }

    setIsUploading(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const croppedBlob = await getCroppedBlob(rawImageUrl, croppedAreaPixels)
      const fileExt = 'jpg'
      const fileName = `${user.id}-${Date.now()}.${fileExt}`
      const filePath = `product-images/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, croppedBlob, {
          contentType: 'image/jpeg',
        })

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('product-images').getPublicUrl(filePath)

      setUploadedImageUrl(data.publicUrl)
      setImageFocus('center')
    } catch (error) {
      console.error('画像アップロードに失敗:', error)
    } finally {
      setIsUploading(false)
      setIsCropModalOpen(false)
      if (rawImageUrl) {
        URL.revokeObjectURL(rawImageUrl)
      }
      setRawImageFile(null)
      setRawImageUrl(null)
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp'],
    },
    maxFiles: 1,
  })

  // 商品登録
  const onSubmit = async (data: ProductFormData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('ログインが必要です')
        return
      }

      // 商品説明とインフルエンサーへの伝言を結合
      const fullDescription = [
        data.description,
        data.influencerMessage && `\n\n【インフルエンサーへの伝言】\n${data.influencerMessage}`,
      ]
        .filter(Boolean)
        .join('')

      const { data: insertedProduct, error } = await supabase
        .from('products')
        .insert({
        name: data.name,
        price: data.price,
        stock: data.stock,
        description: fullDescription || undefined,
        image_url: uploadedImageUrl || undefined,
        status: 'published',
        owner_id: user.id, // 自動セット
          tags,
          category: data.category,
          creator_share_rate: 0.25, // デフォルト 25%
          platform_take_rate: 0.15, // デフォルト 15%
      })
        .select('id')
        .single()

      if (error) throw error

      // 商品イベントログを記録（エラーが発生してもメイン処理は続行）
      if (insertedProduct?.id) {
        await logProductEvent(insertedProduct.id, 'product_created', {
          price: data.price,
          category: data.category,
          tags: tags,
          stock: data.stock,
        })
        
        // product_stats を初期化
        await initializeProductStats(insertedProduct.id)
      }

      alert('商品マスターを登録しました')
      setIsModalOpen(false)
      reset()
      setUploadedImageUrl(null)
      setTags([])
      setTagInput('')
      fetchProducts()
    } catch (error: any) {
      console.error('商品マスター登録に失敗:', error)
      alert(error.message || '商品マスターの登録に失敗しました')
    }
  }

  const handleAddTag = () => {
    const value = tagInput.trim()
    if (!value) return
    if (tags.includes(value)) {
      setTagInput('')
      return
    }
    setTags((prev) => [...prev, value])
    setTagInput('')
  }

  const handleRemoveTag = (tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag))
  }

  const suggestedTags = allTags
    .filter((t) => t.toLowerCase().includes(tagInput.toLowerCase()))
    .filter((t) => !tags.includes(t))
    .slice(0, 6)

  const toggleFilterTag = (tag: string) => {
    setSelectedFilterTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    )
  }

  const filteredProducts = products
    // タグ（AND）フィルタ – 将来のタグフィルタ用に土台のみ保持
    .filter((product) => {
      if (selectedFilterTags.length === 0) return true
      const ptags = product.tags || []
      return selectedFilterTags.every((tag) => ptags.includes(tag))
    })

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    const adate = new Date(a.updated_at || a.created_at).getTime()
    const bdate = new Date(b.updated_at || b.created_at).getTime()
    // 一覧デフォルト: 最終更新日の新しい順
    return bdate - adate
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">商品マスター管理</h1>
          <p className="text-sm text-[#B0B0B8]">
            自社商品マスターの登録・編集・管理を行います
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          新規商品マスター作成
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[400px] text-[#B0B0B8]">
          <p>読み込み中です…</p>
        </div>
      ) : products.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Package className="w-12 h-12 text-[#B0B0B8] mb-4" />
            <p className="text-sm text-[#B0B0B8]">
              現在、商品マスターは登録されていません。
            </p>
            <p className="mt-1 text-xs text-[#8B8B93]">
              業務を開始するには、最初の商品マスターを作成してください。
            </p>
            <Button onClick={() => setIsModalOpen(true)} className="mt-6">
              新規商品マスター作成
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            {/* 検索・フィルタエリア（タグフィルタ用） */}
            <div className="flex flex-col gap-3 px-6 py-4 border-b border-[#2A2A30]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-[#B0B0B8]">
                  商品マスター一覧
                </span>
                {/* 検索（将来実装用のプレースホルダー） */}
                <div className="flex items-center gap-2 text-xs text-[#6B7280]">
                  <span>検索:</span>
                  <input
                    type="text"
                    disabled
                    placeholder="商品名・キーワードで検索（今後追加予定）"
                    className="w-60 rounded-md border border-[#2A2A30] bg-[#17171C] px-3 py-1.5 text-xs text-[#6B7280] placeholder:text-[#4B5563] cursor-not-allowed"
                  />
                </div>
              </div>
              {/* タグフィルタ */}
              {allTags.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-[#B0B0B8]">タグで絞り込み:</span>
                  <div className="flex flex-wrap gap-2">
                    {allTags.map((tag) => {
                      const isSelected = selectedFilterTags.includes(tag)
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleFilterTag(tag)}
                          className={cn(
                            'rounded-full border px-3 py-1 text-xs transition-colors',
                            isSelected
                              ? 'border-[#2563EB] bg-[#17171C] text-[#E5E7EB] hover:border-[#3B82F6]'
                              : 'border-[#2A2A30] bg-[#17171C] text-[#B0B0B8] hover:border-[#3A3A40]',
                          )}
                        >
                          {tag}
                        </button>
                      )
                    })}
                  </div>
                  {selectedFilterTags.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedFilterTags([])}
                      className="text-xs text-[#6B7280] hover:text-[#B0B0B8] underline"
                    >
                      フィルタをクリア
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full border-t border-[#2A2A30] text-sm">
                <thead className="bg-[#0F0F12] text-[#B0B0B8]">
                  <tr>
                    <th className="px-6 py-2 text-left font-normal">商品</th>
                    <th className="px-4 py-2 text-right font-normal">価格（税込）</th>
                    <th className="px-4 py-2 text-left font-normal">ステータス</th>
                    <th className="px-4 py-2 text-left font-normal">最終更新日</th>
                    <th className="px-4 py-2 text-left font-normal">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedProducts.map((product) => {
                    const updated = product.updated_at || product.created_at
                    const updatedDate = new Date(updated)
                    const updatedLabel = updatedDate.toLocaleDateString('ja-JP', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                    })

                    const statusLabel =
                      product.status === 'draft' ? '下書き' : '公開'

                    return (
                      <tr
                        key={product.id}
                        className="border-t border-[#2A2A30] bg-[#17171C]"
                      >
                        {/* 商品サムネイル + 名称 */}
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 overflow-hidden rounded-md bg-[#0F0F12] flex items-center justify-center">
                              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.name}
                                  className="h-full w-full object-cover"
                />
                              ) : (
                                <span className="text-[11px] text-[#B0B0B8]">
                                  No Img
                                </span>
                              )}
                            </div>
                            <div>
                              {product.category && (
                                <div className="text-[11px] text-[#9CA3AF] mb-0.5">
                                  {product.category}
                                </div>
                              )}
                              <div className="font-medium text-white">
                                {product.name}
                  </div>
                              {product.tags && product.tags.length > 0 && (
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {product.tags.slice(0, 3).map((tag) => (
                                    <span
                                      key={tag}
                                      className="rounded bg-[#2A2A30] px-2 py-0.5 text-[11px] text-[#B0B0B8]"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                  {product.tags.length > 3 && (
                                    <span className="text-[11px] text-[#6B7280]">
                                      +{product.tags.length - 3}
                    </span>
                                  )}
                    </div>
                  )}
                            </div>
                          </div>
                        </td>
                        {/* 価格 */}
                        <td className="px-4 py-3 align-middle">
                          <span className="text-white block text-right">
                            ¥{product.price.toLocaleString()}
                          </span>
                        </td>
                        {/* ステータス */}
                        <td className="px-4 py-3 align-middle">
                          <span
                            className={cn(
                              'inline-flex items-center rounded-full px-3 py-1 text-xs',
                              product.status === 'draft'
                                ? 'bg-[#1F2937] text-[#E5E7EB]'
                                : 'bg-[#064E3B] text-[#6EE7B7]',
                            )}
                          >
                            {statusLabel}
                          </span>
                        </td>
                        {/* 最終更新日 */}
                        <td className="px-4 py-2 align-middle text-[#B0B0B8]">
                          {updatedLabel}
                        </td>
                        {/* 操作 */}
                        <td className="px-4 py-2 align-middle">
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="text-xs"
                              onClick={() => {
                                // 今後 /products/[id] などの編集画面に遷移させる想定
                                console.log('edit product master', product.id)
                              }}
                            >
                              編集
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
                </div>
              </CardContent>
            </Card>
      )}

      {/* 商品登録モーダル */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#17171C] border-[#2A2A30]">
            <CardHeader className="border-b border-[#2A2A30]">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">新規商品登録</CardTitle>
                <button
                  onClick={() => {
                    setIsModalOpen(false)
                    reset()
                    setUploadedImageUrl(null)
                    setTags([])
                    setTagInput('')
                  }}
                  className="text-[#B0B0B8] hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* 商品基本情報 */}
                <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium mb-2 text-white">
                    商品名 <span className="text-red-600">*</span>
                  </label>
                  <Input
                    {...register('name')}
                    placeholder="商品名を入力"
                  />
                  {errors.name && (
                      <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
                  )}
                </div>

                  <div className="grid grid-cols-3 gap-4">
                  <div>
                      <label className="block text-sm font-medium mb-2 text-white">
                      価格 <span className="text-red-600">*</span>
                    </label>
                    <Input
                      type="number"
                      {...register('price', { valueAsNumber: true })}
                      placeholder="1000"
                        className="[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                    />
                    {errors.price && (
                        <p className="text-sm text-red-500 mt-1">{errors.price.message}</p>
                    )}
                  </div>
                  <div>
                      <label className="block text-sm font-medium mb-2 text-white">
                      在庫数 <span className="text-red-600">*</span>
                    </label>
                    <Input
                      type="number"
                      {...register('stock', { valueAsNumber: true })}
                      placeholder="100"
                        className="[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                    />
                    {errors.stock && (
                        <p className="text-sm text-red-500 mt-1">{errors.stock.message}</p>
                    )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2 text-white">
                        カテゴリ（商品を大きく分類するための項目です） <span className="text-red-600">*</span>
                      </label>
                      <select
                        {...register('category')}
                        className="w-full h-10 rounded-lg border border-[#2A2A30] bg-[#17171C] px-3 py-2 text-sm text-white placeholder:text-[#6B7280] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-0"
                        defaultValue=""
                      >
                        <option value="" disabled className="bg-[#17171C] text-[#6B7280]">
                          カテゴリを選択
                        </option>
                        {CATEGORY_OPTIONS.map((opt) => (
                          <option key={opt} value={opt} className="bg-[#17171C] text-white">
                            {opt}
                          </option>
                        ))}
                      </select>
                      {errors.category && (
                        <p className="text-sm text-red-500 mt-1">{errors.category.message}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* 商品説明 */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-white">
                    商品説明
                  </label>
                  <textarea
                    {...register('description')}
                    className="w-full h-24 rounded-lg border border-[#2A2A30] bg-[#17171C] px-3 py-2 text-sm text-white placeholder:text-[#6B7280] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-0 resize-y"
                    placeholder="商品の詳細説明を入力"
                  />
                </div>

                {/* インフルエンサーへの伝言 */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-white">
                    インフルエンサーへの伝言（セールスポイント）
                  </label>
                  <textarea
                    {...register('influencerMessage')}
                    className="w-full h-24 rounded-lg border border-[#2A2A30] bg-[#17171C] px-3 py-2 text-sm text-white placeholder:text-[#6B7280] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-0 resize-y"
                    placeholder="インフルエンサーに伝えたい商品の魅力やセールスポイントを入力"
                  />
                  <p className="text-xs text-[#B0B0B8] mt-1">
                    この内容は商品説明に追加されます
                  </p>
                </div>

                {/* 商品タグ */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-white">
                    商品タグ
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 rounded bg-[#2A2A30] px-3 py-1 text-xs text-[#B0B0B8]"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="text-[10px] text-[#6B7280] hover:text-[#E5E7EB]"
                          aria-label={`${tag} を削除`}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="relative">
                    <Input
                      type="text"
                      value={tagInput}
                      onChange={(event) => setTagInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault()
                          handleAddTag()
                        }
                      }}
                      placeholder="タグを入力して Enter で追加（例：アパレル, 高単価, インフルエンサー向け, キャンペーン対象）"
                    />
                    {suggestedTags.length > 0 && (
                      <div className="absolute z-10 mt-1 w-full rounded-md border border-[#2A2A30] bg-[#17171C] shadow-lg">
                        <ul className="max-h-40 overflow-y-auto py-1 text-xs text-[#B0B0B8]">
                          {suggestedTags.map((tag) => (
                            <li key={tag}>
                              <button
                                type="button"
                                onClick={() => {
                                  setTagInput(tag)
                                  handleAddTag()
                                }}
                                className="flex w-full items-center px-3 py-1.5 text-left hover:bg-[#1F2937] text-white"
                              >
                                {tag}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-[#B0B0B8]">
                    ジャンル・用途・価格帯・販促区分などを自由に表現できます。既存タグはサジェスト表示されます。
                  </p>
                </div>

                {/* 商品画像 */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-white">
                    商品画像
                  </label>
                  <div
                    {...getRootProps()}
                    className={cn(
                      'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
                      isDragActive
                        ? 'border-[#2563EB] bg-[#17171C]'
                        : 'border-[#2A2A30] bg-[#17171C] hover:border-[#3A3A40]',
                    )}
                  >
                    <input {...getInputProps()} />
                    {uploadedImageUrl ? (
                      <div className="space-y-3">
                        <img
                          src={uploadedImageUrl}
                          alt="プレビュー"
                          className="max-h-32 mx-auto rounded object-cover"
                          style={{
                            objectPosition:
                              imageFocus === 'top'
                                ? '50% 0%'
                                : imageFocus === 'bottom'
                                  ? '50% 100%'
                                  : '50% 50%',
                          }}
                        />
                        <p className="text-sm text-[#B0B0B8]">
                          画像がアップロードされました。見せたい位置を調整できます。
                        </p>
                        <div className="flex items-center justify-center gap-2 text-xs">
                          <span className="text-[#B0B0B8]">見せたい位置:</span>
                          <button
                            type="button"
                            onClick={() => setImageFocus('top')}
                            className={cn(
                              'rounded-full px-3 py-1 border text-[11px] transition-colors',
                              imageFocus === 'top'
                                ? 'border-[#2563EB] bg-[#17171C] text-white'
                                : 'border-[#2A2A30] text-[#B0B0B8] hover:border-[#3A3A40]',
                            )}
                          >
                            上を中心に
                          </button>
                          <button
                            type="button"
                            onClick={() => setImageFocus('center')}
                            className={cn(
                              'rounded-full px-3 py-1 border text-[11px] transition-colors',
                              imageFocus === 'center'
                                ? 'border-[#2563EB] bg-[#17171C] text-white'
                                : 'border-[#2A2A30] text-[#B0B0B8] hover:border-[#3A3A40]',
                            )}
                          >
                            真ん中
                          </button>
                          <button
                            type="button"
                            onClick={() => setImageFocus('bottom')}
                            className={cn(
                              'rounded-full px-3 py-1 border text-[11px] transition-colors',
                              imageFocus === 'bottom'
                                ? 'border-[#2563EB] bg-[#17171C] text-white'
                                : 'border-[#2A2A30] text-[#B0B0B8] hover:border-[#3A3A40]',
                            )}
                          >
                            下を中心に
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Upload className="w-8 h-8 mx-auto text-[#B0B0B8]" />
                        <p className="text-sm text-[#B0B0B8]">
                          {isDragActive
                            ? 'ここにドロップしてください'
                            : '画像をドラッグ＆ドロップまたはクリック'}
                        </p>
                      </div>
                    )}
                  </div>
                  {isUploading && (
                    <p className="text-sm text-[#B0B0B8] mt-2">アップロード中...</p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-[#2A2A30]">
                  <div className="flex items-center gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsPreviewOpen(true)}
                    className="gap-2"
                    disabled={!formValues.name || !formValues.price}
                  >
                    <Eye className="w-4 h-4" />
                    プレビュー (Preview Card)
                  </Button>
                    <div className="hidden md:flex flex-col items-start text-[11px] text-[#B0B0B8]">
                      <span>カードスタイル</span>
                      <div className="mt-1 flex gap-1">
                        <button
                          type="button"
                          onClick={() => setCardVariant('classic')}
                          className={cn(
                            'rounded-full px-3 py-1 border text-[11px] transition-colors',
                            cardVariant === 'classic'
                              ? 'border-[#2563EB] bg-[#17171C] text-white'
                              : 'border-[#2A2A30] text-[#B0B0B8] hover:border-[#3A3A40]',
                          )}
                        >
                          Standard
                        </button>
                        <button
                          type="button"
                          onClick={() => setCardVariant('minimal')}
                          className={cn(
                            'rounded-full px-3 py-1 border text-[11px] transition-colors',
                            cardVariant === 'minimal'
                              ? 'border-[#2563EB] bg-[#17171C] text-white'
                              : 'border-[#2A2A30] text-[#B0B0B8] hover:border-[#3A3A40]',
                          )}
                        >
                          Minimal
                        </button>
                        <button
                          type="button"
                          onClick={() => setCardVariant('badge')}
                          className={cn(
                            'rounded-full px-3 py-1 border text-[11px] transition-colors',
                            cardVariant === 'badge'
                              ? 'border-[#2563EB] bg-[#17171C] text-white'
                              : 'border-[#2A2A30] text-[#B0B0B8] hover:border-[#3A3A40]',
                          )}
                        >
                          Badge
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3 items-center">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsModalOpen(false)
                        reset()
                        setUploadedImageUrl(null)
                        setTags([])
                        setTagInput('')
                      }}
                      className="text-[#B0B0B8] border-[#2A2A30] hover:bg-[#17171C]"
                    >
                      キャンセル
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? '登録中...' : '商品マスターを登録'}
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 画像トリミングモーダル */}
      {isCropModalOpen && rawImageUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>画像のトリミング</CardTitle>
                <button
                  type="button"
                  onClick={() => {
                    setIsCropModalOpen(false)
                    if (rawImageUrl) URL.revokeObjectURL(rawImageUrl)
                    setRawImageFile(null)
                    setRawImageUrl(null)
                  }}
                  className="text-[#737373] hover:text-[#171717]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative h-72 w-full bg-black/80 rounded-lg overflow-hidden">
                <Cropper
                  image={rawImageUrl}
                  crop={crop}
                  zoom={zoom}
                  aspect={4 / 3}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={handleCropComplete}
                />
              </div>
              <div className="mt-4 space-y-2">
                <label className="block text-xs text-[#737373]">ズーム</label>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.1}
                  value={zoom}
                  onChange={(event) => setZoom(Number(event.target.value))}
                  className="w-full"
                />
              </div>
              <div className="mt-4 flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCropModalOpen(false)
                    if (rawImageUrl) URL.revokeObjectURL(rawImageUrl)
                    setRawImageFile(null)
                    setRawImageUrl(null)
                  }}
                >
                  キャンセル
                </Button>
                <Button type="button" onClick={handleCropConfirm} disabled={isUploading}>
                  {isUploading ? '保存中...' : 'この範囲で決定'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 商品プレビュー */}
      <ProductPreview
        open={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
        product={{
          name: formValues.name || '商品名',
          price: formValues.price || 0,
          stock: formValues.stock || 0,
          imageUrl: uploadedImageUrl,
          companyName: companyName,
          description: formValues.description,
          imagePosition: imageFocus,
          cardVariant,
        }}
      />
    </div>
  )
}

