/**
 * 商品データの型定義
 */
export interface Product {
  id: string
  name: string
  price: number
  stock: number
  image_url: string | null
  company_name: string
  status: string
  category?: string
  brand_name?: string
  influencer_commission_rate?: number
  created_at?: string
}

