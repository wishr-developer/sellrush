/**
 * Supabase データベース型定義
 * 
 * このファイルは `supabase gen types typescript` コマンドで自動生成されます。
 * 
 * 生成手順:
 * 1. Supabase CLI をインストール: `npm install -g supabase`
 * 2. Supabase プロジェクトにログイン: `supabase login`
 * 3. プロジェクトをリンク: `supabase link --project-ref <your-project-ref>`
 * 4. 型定義を生成: `supabase gen types typescript --linked > src/types/database.ts`
 * 
 * 参考: https://supabase.com/docs/reference/cli/supabase-gen-types-typescript
 * 
 * ⚠️ 注意: このファイルは手動で編集しないでください。
 * データベーススキーマが変更されたら、上記コマンドで再生成してください。
 */

/**
 * 基本的な型定義（手動作成）
 * Supabase CLI で型定義を生成するまでの暫定対応
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      orders: {
        Row: {
          id: string
          product_id: string
          product_name: string
          price: number
          amount: number
          creator_id: string | null
          affiliate_link_id: string | null
          status: string
          source: string
          payment_intent_id: string | null
          stripe_session_id: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          product_id: string
          product_name: string
          price: number
          amount: number
          creator_id?: string | null
          affiliate_link_id?: string | null
          status?: string
          source?: string
          payment_intent_id?: string | null
          stripe_session_id?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          product_id?: string
          product_name?: string
          price?: number
          amount?: number
          creator_id?: string | null
          affiliate_link_id?: string | null
          status?: string
          source?: string
          payment_intent_id?: string | null
          stripe_session_id?: string | null
          created_at?: string
          updated_at?: string | null
        }
      }
      products: {
        Row: {
          id: string
          name: string
          price: number
          company_name: string | null
          image_url: string | null
          description: string | null
          creator_share_rate: number | null
          platform_take_rate: number | null
          owner_id: string | null
          status: string
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          price: number
          company_name?: string | null
          image_url?: string | null
          description?: string | null
          creator_share_rate?: number | null
          platform_take_rate?: number | null
          owner_id?: string | null
          status?: string
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          price?: number
          company_name?: string | null
          image_url?: string | null
          description?: string | null
          creator_share_rate?: number | null
          platform_take_rate?: number | null
          owner_id?: string | null
          status?: string
          created_at?: string
          updated_at?: string | null
        }
      }
      affiliate_links: {
        Row: {
          id: string
          product_id: string
          creator_id: string
          affiliate_code: string
          status: string
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          product_id: string
          creator_id: string
          affiliate_code: string
          status?: string
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          product_id?: string
          creator_id?: string
          affiliate_code?: string
          status?: string
          created_at?: string
          updated_at?: string | null
        }
      }
      payouts: {
        Row: {
          id: string
          order_id: string
          creator_id: string | null
          brand_id: string | null
          gross_amount: number
          creator_amount: number
          platform_amount: number
          brand_amount: number
          status: string
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          order_id: string
          creator_id?: string | null
          brand_id?: string | null
          gross_amount: number
          creator_amount: number
          platform_amount: number
          brand_amount: number
          status?: string
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          order_id?: string
          creator_id?: string | null
          brand_id?: string | null
          gross_amount?: number
          creator_amount?: number
          platform_amount?: number
          brand_amount?: number
          status?: string
          created_at?: string
          updated_at?: string | null
        }
      }
      // TODO: 他のテーブルも追加
      // profiles, users, battles, etc.
    }
    Views: {
      // TODO: ビューがあれば追加
    }
    Functions: {
      // TODO: データベース関数があれば追加
    }
    Enums: {
      // TODO: 列挙型があれば追加
    }
  }
}

