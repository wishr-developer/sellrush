-- ============================================================================
-- SELL RUSH - Payouts テーブル作成
-- Supabase SQLエディタで実行してください
-- ============================================================================

-- payouts テーブルの作成
CREATE TABLE IF NOT EXISTS public.payouts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  creator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  brand_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  gross_amount DECIMAL(10, 2) NOT NULL,
  creator_amount DECIMAL(10, 2) NOT NULL,
  platform_amount DECIMAL(10, 2) NOT NULL,
  brand_amount DECIMAL(10, 2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- updated_at を自動更新するトリガー関数（既存の関数を再利用）
CREATE OR REPLACE FUNCTION update_payouts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- updated_at 自動更新トリガー
CREATE TRIGGER update_payouts_updated_at
  BEFORE UPDATE ON public.payouts
  FOR EACH ROW
  EXECUTE FUNCTION update_payouts_updated_at();

-- インデックスの作成（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_payouts_order_id ON public.payouts(order_id);
CREATE INDEX IF NOT EXISTS idx_payouts_creator_id ON public.payouts(creator_id);
CREATE INDEX IF NOT EXISTS idx_payouts_brand_id ON public.payouts(brand_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON public.payouts(status);
CREATE INDEX IF NOT EXISTS idx_payouts_created_at ON public.payouts(created_at DESC);

-- RLS (Row Level Security) の有効化
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

-- RLS ポリシー: Admin は全 payouts を SELECT / UPDATE 可能
CREATE POLICY "Admins can view all payouts"
  ON public.payouts
  FOR SELECT
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "Admins can update all payouts"
  ON public.payouts
  FOR UPDATE
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- RLS ポリシー: Creator は自分の creator_id の payouts のみ SELECT 可能
CREATE POLICY "Creators can view their own payouts"
  ON public.payouts
  FOR SELECT
  USING (
    creator_id = auth.uid()
    AND (auth.jwt() -> 'user_metadata' ->> 'role') IN ('creator', 'influencer')
  );

-- RLS ポリシー: Brand は自分の brand_id の payouts のみ SELECT 可能
CREATE POLICY "Brands can view their own payouts"
  ON public.payouts
  FOR SELECT
  USING (
    brand_id = auth.uid()
    AND (auth.jwt() -> 'user_metadata' ->> 'role') IN ('brand', 'company')
  );

-- コメントの追加
COMMENT ON TABLE public.payouts IS '報酬分配・支払い管理テーブル';
COMMENT ON COLUMN public.payouts.id IS 'Payout ID（UUID）';
COMMENT ON COLUMN public.payouts.order_id IS '注文ID（orders.id）';
COMMENT ON COLUMN public.payouts.creator_id IS 'Creator ID（auth.users.id）';
COMMENT ON COLUMN public.payouts.brand_id IS 'Brand ID（auth.users.id）';
COMMENT ON COLUMN public.payouts.gross_amount IS '総額（orders.amount）';
COMMENT ON COLUMN public.payouts.creator_amount IS 'Creator への分配額（30%）';
COMMENT ON COLUMN public.payouts.platform_amount IS 'Platform への分配額（30%）';
COMMENT ON COLUMN public.payouts.brand_amount IS 'Brand への分配額（40%）';
COMMENT ON COLUMN public.payouts.status IS 'ステータス（pending/approved/paid/rejected）';
COMMENT ON COLUMN public.payouts.created_at IS '作成日時';
COMMENT ON COLUMN public.payouts.updated_at IS '更新日時';

