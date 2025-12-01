-- ============================================================================
-- SELL RUSH - Affiliate Links テーブル作成
-- Supabase SQLエディタで実行してください
-- ============================================================================

-- affiliate_links テーブルの作成
CREATE TABLE IF NOT EXISTS public.affiliate_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  affiliate_code VARCHAR(50) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックスの作成（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_affiliate_links_product_id ON public.affiliate_links(product_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_links_creator_id ON public.affiliate_links(creator_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_links_affiliate_code ON public.affiliate_links(affiliate_code);
CREATE INDEX IF NOT EXISTS idx_affiliate_links_product_creator ON public.affiliate_links(product_id, creator_id);

-- ユニーク制約: 同じ商品×クリエイターの組み合わせは1つのみ
CREATE UNIQUE INDEX IF NOT EXISTS idx_affiliate_links_unique_product_creator 
  ON public.affiliate_links(product_id, creator_id);

-- RLS (Row Level Security) の有効化
ALTER TABLE public.affiliate_links ENABLE ROW LEVEL SECURITY;

-- RLS ポリシー: 全員が公開商品の affiliate_links を閲覧可能（紹介リンク生成用）
CREATE POLICY "Anyone can view affiliate links for published products"
  ON public.affiliate_links
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.products
      WHERE products.id = affiliate_links.product_id
      AND products.status = 'published'
    )
  );

-- RLS ポリシー: クリエイターは自分の affiliate_links のみ作成可能
CREATE POLICY "Creators can insert their own affiliate links"
  ON public.affiliate_links
  FOR INSERT
  WITH CHECK (
    creator_id = auth.uid()
    AND (auth.jwt() -> 'user_metadata' ->> 'role') IN ('creator', 'influencer')
  );

-- RLS ポリシー: クリエイターは自分の affiliate_links のみ閲覧可能（詳細情報）
CREATE POLICY "Creators can view their own affiliate links"
  ON public.affiliate_links
  FOR SELECT
  USING (
    creator_id = auth.uid()
    AND (auth.jwt() -> 'user_metadata' ->> 'role') IN ('creator', 'influencer')
  );

-- RLS ポリシー: ブランドは自分の商品の affiliate_links を閲覧可能
CREATE POLICY "Brands can view affiliate links for their products"
  ON public.affiliate_links
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.products
      WHERE products.id = affiliate_links.product_id
      AND products.owner_id = auth.uid()
      AND (auth.jwt() -> 'user_metadata' ->> 'role') IN ('brand', 'company')
    )
  );

-- コメントの追加
COMMENT ON TABLE public.affiliate_links IS '紹介リンク管理テーブル（商品×クリエイター）';
COMMENT ON COLUMN public.affiliate_links.id IS '紹介リンクID（UUID）';
COMMENT ON COLUMN public.affiliate_links.product_id IS '商品ID';
COMMENT ON COLUMN public.affiliate_links.creator_id IS 'クリエイターID（auth.users.id）';
COMMENT ON COLUMN public.affiliate_links.affiliate_code IS '紹介コード（URLパラメータ用）';
COMMENT ON COLUMN public.affiliate_links.created_at IS '作成日時';

