-- ============================================================================
-- SELL RUSH - Admin Orders RLS ポリシー設定
-- Supabase SQLエディタで実行してください
-- ============================================================================

-- 既存の orders テーブルの RLS ポリシーを確認・更新
-- Admin のみ全 orders を SELECT 可能にする

-- 既存のポリシーを削除（存在する場合）
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;

-- RLS ポリシー: Admin は全 orders を SELECT 可能
-- 判定: (auth.jwt() -> 'user_metadata' ->> 'role') === 'admin'
CREATE POLICY "Admins can view all orders"
  ON public.orders
  FOR SELECT
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- 注意: 既存の Creator と Brand の RLS ポリシーは維持されます
-- - Creator は creator_id === auth.uid() の orders のみ SELECT 可能
-- - Brand は自分の商品に紐づく orders のみ SELECT 可能
-- - Admin は全 orders を SELECT 可能

-- コメントの追加
COMMENT ON POLICY "Admins can view all orders" ON public.orders IS 
  'Admin users can view all orders. Role must be "admin" in user_metadata.';

