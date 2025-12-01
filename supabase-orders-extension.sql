-- ============================================================================
-- SELL RUSH - Orders テーブル拡張
-- Supabase SQLエディタで実行してください
-- ============================================================================

-- orders テーブルに affiliate_link_id カラムを追加
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS affiliate_link_id UUID REFERENCES public.affiliate_links(id) ON DELETE SET NULL;

-- affiliate_link_id のインデックスを作成（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_orders_affiliate_link_id ON public.orders(affiliate_link_id);

-- コメントの追加
COMMENT ON COLUMN public.orders.affiliate_link_id IS '紹介リンクID（affiliate_links.id）。紹介リンク経由の注文を追跡するため';

