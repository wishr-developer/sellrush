-- ============================================================================
-- SELL RUSH - Products テーブル拡張
-- Supabase SQLエディタで実行してください
-- ============================================================================

-- products テーブルにカラムを追加
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS creator_share_rate DECIMAL(5, 4) NOT NULL DEFAULT 0.25,
  ADD COLUMN IF NOT EXISTS platform_take_rate DECIMAL(5, 4) NOT NULL DEFAULT 0.15,
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- owner_id のインデックスを作成（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_products_owner_id ON public.products(owner_id);

-- コメントの追加
COMMENT ON COLUMN public.products.creator_share_rate IS 'クリエイターへの分配率（デフォルト: 0.25 = 25%）';
COMMENT ON COLUMN public.products.platform_take_rate IS 'プラットフォームへの分配率（デフォルト: 0.15 = 15%）';
COMMENT ON COLUMN public.products.owner_id IS '商品所有者（companies.owner_id に対応する auth.users.id）';

-- RLS ポリシーの更新（owner_id ベースのアクセス制御）
-- 既存のポリシーを削除（必要に応じて）
-- DROP POLICY IF EXISTS "Brands can view their own products" ON public.products;
-- DROP POLICY IF EXISTS "Brands can insert their own products" ON public.products;
-- DROP POLICY IF EXISTS "Brands can update their own products" ON public.products;

-- ブランドは自分の商品のみ閲覧可能
CREATE POLICY IF NOT EXISTS "Brands can view their own products"
  ON public.products
  FOR SELECT
  USING (
    owner_id = auth.uid()
    AND (auth.jwt() -> 'user_metadata' ->> 'role') IN ('brand', 'company')
  );

-- ブランドは自分の商品のみ作成可能
CREATE POLICY IF NOT EXISTS "Brands can insert their own products"
  ON public.products
  FOR INSERT
  WITH CHECK (
    owner_id = auth.uid()
    AND (auth.jwt() -> 'user_metadata' ->> 'role') IN ('brand', 'company')
  );

-- ブランドは自分の商品のみ更新可能
CREATE POLICY IF NOT EXISTS "Brands can update their own products"
  ON public.products
  FOR UPDATE
  USING (
    owner_id = auth.uid()
    AND (auth.jwt() -> 'user_metadata' ->> 'role') IN ('brand', 'company')
  );

