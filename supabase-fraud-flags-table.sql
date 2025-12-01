-- ============================================================================
-- SELL RUSH - Fraud Flags テーブル作成
-- Supabase SQLエディタで実行してください
-- ============================================================================

-- fraud_flags テーブルの作成
CREATE TABLE IF NOT EXISTS public.fraud_flags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  creator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  brand_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reason VARCHAR(255) NOT NULL,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed BOOLEAN NOT NULL DEFAULT false,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- updated_at を自動更新するトリガー関数
CREATE OR REPLACE FUNCTION update_fraud_flags_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- updated_at 自動更新トリガー
CREATE TRIGGER update_fraud_flags_updated_at
  BEFORE UPDATE ON public.fraud_flags
  FOR EACH ROW
  EXECUTE FUNCTION update_fraud_flags_updated_at();

-- reviewed_at を自動更新するトリガー関数
CREATE OR REPLACE FUNCTION update_fraud_flags_reviewed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.reviewed = true AND OLD.reviewed = false THEN
    NEW.reviewed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- reviewed_at 自動更新トリガー
CREATE TRIGGER update_fraud_flags_reviewed_at
  BEFORE UPDATE ON public.fraud_flags
  FOR EACH ROW
  EXECUTE FUNCTION update_fraud_flags_reviewed_at();

-- インデックスの作成（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_fraud_flags_order_id ON public.fraud_flags(order_id);
CREATE INDEX IF NOT EXISTS idx_fraud_flags_creator_id ON public.fraud_flags(creator_id);
CREATE INDEX IF NOT EXISTS idx_fraud_flags_brand_id ON public.fraud_flags(brand_id);
CREATE INDEX IF NOT EXISTS idx_fraud_flags_severity ON public.fraud_flags(severity);
CREATE INDEX IF NOT EXISTS idx_fraud_flags_reviewed ON public.fraud_flags(reviewed);
CREATE INDEX IF NOT EXISTS idx_fraud_flags_detected_at ON public.fraud_flags(detected_at DESC);

-- RLS (Row Level Security) の有効化
ALTER TABLE public.fraud_flags ENABLE ROW LEVEL SECURITY;

-- RLS ポリシー: Admin は全 fraud_flags を SELECT / UPDATE 可能
CREATE POLICY "Admins can view all fraud flags"
  ON public.fraud_flags
  FOR SELECT
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "Admins can update all fraud flags"
  ON public.fraud_flags
  FOR UPDATE
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- コメントの追加
COMMENT ON TABLE public.fraud_flags IS '不正検知フラグテーブル';
COMMENT ON COLUMN public.fraud_flags.id IS 'Fraud Flag ID（UUID）';
COMMENT ON COLUMN public.fraud_flags.order_id IS '注文ID（orders.id）';
COMMENT ON COLUMN public.fraud_flags.creator_id IS 'Creator ID（auth.users.id）';
COMMENT ON COLUMN public.fraud_flags.brand_id IS 'Brand ID（auth.users.id）';
COMMENT ON COLUMN public.fraud_flags.reason IS '検知理由';
COMMENT ON COLUMN public.fraud_flags.severity IS '重要度（low/medium/high）';
COMMENT ON COLUMN public.fraud_flags.detected_at IS '検知日時';
COMMENT ON COLUMN public.fraud_flags.reviewed IS 'レビュー済みフラグ';
COMMENT ON COLUMN public.fraud_flags.reviewed_by IS 'レビュー担当者ID';
COMMENT ON COLUMN public.fraud_flags.reviewed_at IS 'レビュー日時';
COMMENT ON COLUMN public.fraud_flags.note IS 'メモ';

