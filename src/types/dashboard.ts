/**
 * ダッシュボード関連の型定義
 */

import type { Database } from './database'

/**
 * Supabase の User 型（簡易版）
 * 実際の型は Supabase Auth から取得可能
 */
export interface User {
  id: string
  email?: string
  user_metadata?: {
    role?: 'creator' | 'influencer' | 'brand' | 'company' | 'admin'
    [key: string]: unknown
  }
  app_metadata?: {
    providers?: string[]
    [key: string]: unknown
  }
}

/**
 * 商品型（完全版）
 */
export type Product = Database['public']['Tables']['products']['Row']

/**
 * 商品型（部分版 - ダッシュボード表示用）
 */
export type ProductSummary = Pick<Product, 'id' | 'name' | 'price'>

/**
 * 注文型
 */
export type Order = Database['public']['Tables']['orders']['Row']

/**
 * 紹介リンク型
 */
export type AffiliateLink = Database['public']['Tables']['affiliate_links']['Row']

/**
 * 支払い型
 */
export type Payout = Database['public']['Tables']['payouts']['Row']

/**
 * 売上統計
 */
export interface SalesStats {
  totalSales: number
  totalRevenue: number
  estimatedCommission: number
}

/**
 * 報酬統計
 */
export interface PayoutStats {
  totalPending: number
  totalPaid: number
  pendingCount: number
  paidCount: number
}

/**
 * バトル状況
 */
export interface BattleStatus {
  id: string
  category: string
  title: string
  rank: number
  participants: number
  gmv: number
}

/**
 * 日別データポイント
 */
export interface DailyPoint {
  date: string
  gmv: number
  orders: number
}

/**
 * 注文行（ダッシュボード表示用）
 */
export interface OrderRow {
  id: string
  amount: number | null
  created_at: string | null
  status?: string | null
  product_id?: string | null
  affiliate_link_id?: string | null
}

/**
 * 紹介リンク生成リクエスト
 */
export interface CreateAffiliateLinkRequest {
  product_id: string
}

/**
 * 紹介リンク生成レスポンス
 */
export interface CreateAffiliateLinkResponse {
  success: boolean;
  affiliate_code: string;
  message?: string;
}

/**
 * Brand用の型定義
 */

/**
 * Brand KPI データ
 */
export interface BrandKPIData {
  totalGmv: number;
  totalOrders: number;
  avgOrderValue: number;
  activeProducts: number;
  previousWeekGmv?: number;
  previousWeekOrdersCount?: number;
  gmvChangePercent?: number;
}

/**
 * Brand 報酬データ
 */
export interface BrandPayoutData {
  totalBrandAmount: number;
  pendingBrandAmount: number;
  paidBrandAmount: number;
  pendingCount: number;
  paidCount: number;
}

/**
 * 商品パフォーマンス
 */
export interface ProductPerformance {
  product_id: string;
  product_name: string;
  revenue: number;
  order_count: number;
}

/**
 * クリエイターパフォーマンス
 */
export interface CreatorPerformance {
  creator_id: string;
  revenue: number;
  order_count: number;
  contribution_rate: number;
}

