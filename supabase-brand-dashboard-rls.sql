-- ============================================================================
-- SELL RUSH - Brand Dashboard RLS ポリシー設定
-- Supabase SQLエディタで実行してください
-- ============================================================================

-- products テーブルに brand_id カラムを追加（存在しない場合）
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'products' 
    AND column_name = 'brand_id'
  ) THEN
    ALTER TABLE public.products 
    ADD COLUMN brand_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    
    -- 既存データがある場合、company_name から推測するか、NULL のまま
    -- 必要に応じて既存データを更新してください
  END IF;
END $$;

-- brand_id にインデックスを追加（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_products_brand_id ON public.products(brand_id);

-- 既存の RLS ポリシーを確認・更新
-- products テーブルの RLS ポリシー: Brand は自分の商品のみ SELECT 可能
DROP POLICY IF EXISTS "Brands can view their own products" ON public.products;

CREATE POLICY "Brands can view their own products"
  ON public.products
  FOR SELECT
  USING (
    -- 全ユーザーが公開商品を閲覧可能（既存のポリシー）
    status = 'published'
    OR
    -- Brand は自分の商品を閲覧可能
    (brand_id = auth.uid() AND auth.jwt() ->> 'user_metadata' ->> 'role' IN ('brand', 'company'))
  );

-- orders テーブルの RLS ポリシー: Brand は自分の商品に紐づく orders のみ SELECT 可能
DROP POLICY IF EXISTS "Brands can view orders for their products" ON public.orders;

CREATE POLICY "Brands can view orders for their products"
  ON public.orders
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.products
      WHERE products.id = orders.product_id
      AND products.brand_id = auth.uid()
      AND auth.jwt() ->> 'user_metadata' ->> 'role' IN ('brand', 'company')
    )
  );

-- コメントの追加
COMMENT ON COLUMN public.products.brand_id IS 'Brand ID（auth.users.id）';

-- ============================================================================
-- 既存データの更新（オプション）
-- company_name が既にある場合、brand_id を設定する必要があります
-- 以下のクエリは、既存の products データに対して brand_id を設定する例です
-- 実際のデータに合わせて調整してください
-- ============================================================================

-- 例: company_name が "Example Company" の商品を特定の brand_id に紐付ける
-- UPDATE public.products
-- SET brand_id = 'YOUR_BRAND_USER_ID_HERE'
-- WHERE company_name = 'Example Company'
-- AND brand_id IS NULL;

