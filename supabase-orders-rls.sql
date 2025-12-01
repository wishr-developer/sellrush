-- ============================================================================
-- SELL RUSH - Orders テーブル RLS ポリシー設定
-- Supabase SQLエディタで実行してください
-- ============================================================================

-- orders テーブルが存在しない場合は作成
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'cancelled', 'refunded')),
  source VARCHAR(20) NOT NULL DEFAULT 'demo' CHECK (source IN ('demo', 'production')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックスの作成（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_orders_creator_id ON public.orders(creator_id);
CREATE INDEX IF NOT EXISTS idx_orders_product_id ON public.orders(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);

-- RLS (Row Level Security) の有効化
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- 既存のポリシーを削除（存在する場合）
DROP POLICY IF EXISTS "Creators can view their own orders" ON public.orders;
DROP POLICY IF EXISTS "Creators can insert their own orders" ON public.orders;

-- RLS ポリシー: Creator は自分の orders のみ SELECT 可能
CREATE POLICY "Creators can view their own orders"
  ON public.orders
  FOR SELECT
  USING (creator_id = auth.uid());

-- RLS ポリシー: Creator は自分の creator_id で INSERT 可能
-- 注意: creator_id は必ず auth.uid() と一致する必要がある
CREATE POLICY "Creators can insert their own orders"
  ON public.orders
  FOR INSERT
  WITH CHECK (creator_id = auth.uid());

-- コメントの追加
COMMENT ON TABLE public.orders IS '売上（注文）テーブル';
COMMENT ON COLUMN public.orders.id IS '注文ID（UUID）';
COMMENT ON COLUMN public.orders.product_id IS '商品ID';
COMMENT ON COLUMN public.orders.creator_id IS 'Creator ID（auth.users.id）';
COMMENT ON COLUMN public.orders.amount IS '売上金額';
COMMENT ON COLUMN public.orders.status IS 'ステータス（completed/pending/cancelled/refunded）';
COMMENT ON COLUMN public.orders.source IS 'ソース（demo/production）';
COMMENT ON COLUMN public.orders.created_at IS '作成日時';

