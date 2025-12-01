-- ============================================================================
-- SELL RUSH Admin ダミーデータ投入用スクリプト
-- ============================================================================
-- 
-- 破壊的な操作は一切行わず、既存データがあっても問題ないように設計しています。
-- 実行は Supabase ダッシュボードの SQL Editor から行ってください。
-- 
-- 対象テーブル:
--   - products (3商品)
--   - orders (過去30日間にまたがる 25件)
--   - payouts (8件)
--   - fraud_flags (10件)
-- 
-- 注意:
--   - すべて INSERT のみで、DELETE / DROP / TRUNCATE は含まれていません
--   - ON CONFLICT (id) DO NOTHING で既存データとの衝突を回避
--   - 何度実行しても安全です
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. products テーブル（3商品）
-- ============================================================================
-- テーブル構造: id, name, price, stock, status, image_url, company_name, 
--              cost, category, created_at, updated_at
INSERT INTO public.products (
  id, 
  name, 
  price, 
  stock, 
  status, 
  image_url, 
  company_name, 
  cost, 
  category, 
  created_at, 
  updated_at
)
VALUES
  (
    gen_random_uuid(),
    'エナジードリンクA',
    2980,
    100,
    'published',
    'https://via.placeholder.com/400x400?text=Energy+Drink+A',
    'ブランドA',
    1500,
    'ドリンク',
    NOW() - INTERVAL '10 days',
    NOW() - INTERVAL '10 days'
  ),
  (
    gen_random_uuid(),
    '美容サプリB',
    4980,
    50,
    'published',
    'https://via.placeholder.com/400x400?text=Beauty+Supplement+B',
    'ブランドB',
    2500,
    'サプリメント',
    NOW() - INTERVAL '8 days',
    NOW() - INTERVAL '8 days'
  ),
  (
    gen_random_uuid(),
    'ガジェットC',
    12800,
    30,
    'published',
    'https://via.placeholder.com/400x400?text=Gadget+C',
    'ブランドC',
    8000,
    'ガジェット',
    NOW() - INTERVAL '5 days',
    NOW() - INTERVAL '5 days'
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 2. orders テーブル（過去30日間にまたがる 25件のダミー注文）
-- ============================================================================
-- テーブル構造: id, product_id, creator_id, amount, status, source, created_at
-- 注意: brand_id カラムは存在しないため使用しません
DO $$
DECLARE
  product1_id UUID;
  product2_id UUID;
  product3_id UUID;
  creator_ids UUID[] := ARRAY[
    gen_random_uuid(),
    gen_random_uuid(),
    gen_random_uuid(),
    gen_random_uuid(),
    gen_random_uuid()
  ];
  i INTEGER;
  order_date TIMESTAMP WITH TIME ZONE;
  statuses TEXT[] := ARRAY['completed', 'completed', 'completed', 'pending', 'cancelled'];
  amounts NUMERIC[] := ARRAY[2980, 4980, 12800, 2980, 4980];
  product_ids UUID[];
  selected_product_id UUID;
  selected_amount NUMERIC;
  selected_status TEXT;
  selected_creator_id UUID;
BEGIN
  -- products の ID を取得
  SELECT id INTO product1_id
  FROM public.products WHERE name = 'エナジードリンクA' LIMIT 1;
  
  SELECT id INTO product2_id
  FROM public.products WHERE name = '美容サプリB' LIMIT 1;
  
  SELECT id INTO product3_id
  FROM public.products WHERE name = 'ガジェットC' LIMIT 1;
  
  product_ids := ARRAY[product1_id, product2_id, product3_id];
  
  -- 25件の注文を生成（過去30日間に分散）
  FOR i IN 1..25 LOOP
    -- 過去30日間のランダムな日時
    order_date := NOW() - (RANDOM() * 30 || ' days')::INTERVAL - (RANDOM() * 24 || ' hours')::INTERVAL;
    
    -- ランダムに商品・金額・ステータス・Creator を選択
    selected_product_id := product_ids[1 + floor(random() * array_length(product_ids, 1))::INTEGER];
    selected_amount := amounts[1 + floor(random() * array_length(amounts, 1))::INTEGER];
    selected_status := statuses[1 + floor(random() * array_length(statuses, 1))::INTEGER];
    selected_creator_id := creator_ids[1 + floor(random() * array_length(creator_ids, 1))::INTEGER];
    
    INSERT INTO public.orders (
      id,
      product_id,
      creator_id,
      amount,
      status,
      source,
      created_at
    )
    VALUES (
      gen_random_uuid(),
      selected_product_id,
      selected_creator_id,
      selected_amount,
      selected_status,
      'demo',
      order_date
    )
    ON CONFLICT (id) DO NOTHING;
  END LOOP;
END $$;

-- ============================================================================
-- 3. payouts テーブル（8件程度）
-- ============================================================================
-- テーブル構造: id, order_id, creator_id, brand_id, gross_amount, 
--              creator_amount, platform_amount, brand_amount, status, 
--              created_at, updated_at
-- 注意: scheduled_at, paid_at カラムは存在しないため使用しません
DO $$
DECLARE
  order_ids UUID[];
  creator_ids UUID[];
  brand_ids UUID[];
  i INTEGER;
  selected_order_id UUID;
  selected_creator_id UUID;
  selected_brand_id UUID;
  order_amount NUMERIC;
  gross_amount NUMERIC;
  creator_amount NUMERIC;
  platform_amount NUMERIC;
  brand_amount NUMERIC;
  payout_status TEXT;
  statuses TEXT[] := ARRAY['pending', 'pending', 'approved', 'approved', 'paid', 'paid'];
BEGIN
  -- 最近の completed 注文の ID, creator_id を取得
  -- brand_id はランダムに生成（実際のテーブルでは auth.users を参照）
  SELECT 
    ARRAY_AGG(id), 
    ARRAY_AGG(creator_id)
  INTO order_ids, creator_ids
  FROM public.orders
  WHERE status = 'completed'
  ORDER BY created_at DESC
  LIMIT 8;
  
  -- brand_ids を生成（実際の環境では auth.users から取得）
  brand_ids := ARRAY[
    gen_random_uuid(),
    gen_random_uuid(),
    gen_random_uuid()
  ];
  
  -- 8件の payout を生成
  FOR i IN 1..LEAST(8, array_length(order_ids, 1)) LOOP
    selected_order_id := order_ids[i];
    selected_creator_id := creator_ids[i];
    selected_brand_id := brand_ids[1 + floor(random() * array_length(brand_ids, 1))::INTEGER];
    
    -- 注文金額を取得
    SELECT amount INTO order_amount
    FROM public.orders
    WHERE id = selected_order_id;
    
    -- 分配計算（簡易版）
    -- gross_amount = 注文金額
    -- creator_amount = 30%
    -- platform_amount = 30%
    -- brand_amount = 40%
    gross_amount := COALESCE(order_amount, 10000);
    creator_amount := gross_amount * 0.3;
    platform_amount := gross_amount * 0.3;
    brand_amount := gross_amount * 0.4;
    
    payout_status := statuses[1 + floor(random() * array_length(statuses, 1))::INTEGER];
    
    INSERT INTO public.payouts (
      id,
      order_id,
      creator_id,
      brand_id,
      gross_amount,
      creator_amount,
      platform_amount,
      brand_amount,
      status,
      created_at,
      updated_at
    )
    VALUES (
      gen_random_uuid(),
      selected_order_id,
      selected_creator_id,
      selected_brand_id,
      gross_amount,
      creator_amount,
      platform_amount,
      brand_amount,
      payout_status,
      NOW() - (RANDOM() * 10 || ' days')::INTERVAL,
      NOW() - (RANDOM() * 10 || ' days')::INTERVAL
    )
    ON CONFLICT (id) DO NOTHING;
  END LOOP;
END $$;

-- ============================================================================
-- 4. fraud_flags テーブル（10件程度）
-- ============================================================================
-- テーブル構造: id, order_id, creator_id, brand_id, reason, severity,
--              detected_at, reviewed, reviewed_by, reviewed_at, note,
--              created_at, updated_at
DO $$
DECLARE
  order_ids UUID[];
  creator_ids UUID[];
  brand_ids UUID[];
  i INTEGER;
  selected_order_id UUID;
  selected_creator_id UUID;
  selected_brand_id UUID;
  severity_level TEXT;
  is_reviewed BOOLEAN;
  reasons TEXT[] := ARRAY[
    '同一IPからの短時間での複数注文',
    '異常に高い金額の注文',
    '過去にキャンセル履歴あり',
    '決済カード情報の不一致',
    '配送先住所の不自然な変更'
  ];
  severities TEXT[] := ARRAY['low', 'low', 'medium', 'medium', 'high', 'high', 'high'];
  flag_date TIMESTAMP WITH TIME ZONE;
BEGIN
  -- 最近の注文の ID, creator_id を取得
  SELECT 
    ARRAY_AGG(id),
    ARRAY_AGG(creator_id)
  INTO order_ids, creator_ids
  FROM public.orders
  ORDER BY created_at DESC
  LIMIT 10;
  
  -- brand_ids を生成（実際の環境では auth.users から取得）
  brand_ids := ARRAY[
    gen_random_uuid(),
    gen_random_uuid(),
    gen_random_uuid()
  ];
  
  -- 10件の fraud_flag を生成
  FOR i IN 1..LEAST(10, array_length(order_ids, 1)) LOOP
    selected_order_id := order_ids[i];
    selected_creator_id := creator_ids[i];
    selected_brand_id := brand_ids[1 + floor(random() * array_length(brand_ids, 1))::INTEGER];
    
    severity_level := severities[1 + floor(random() * array_length(severities, 1))::INTEGER];
    is_reviewed := (RANDOM() > 0.5);
    
    -- 直近7〜14日のランダムな日時
    flag_date := NOW() - (7 + RANDOM() * 7 || ' days')::INTERVAL - (RANDOM() * 24 || ' hours')::INTERVAL;
    
    INSERT INTO public.fraud_flags (
      id,
      order_id,
      creator_id,
      brand_id,
      reason,
      severity,
      detected_at,
      reviewed,
      reviewed_at,
      created_at,
      updated_at
    )
    VALUES (
      gen_random_uuid(),
      selected_order_id,
      selected_creator_id,
      selected_brand_id,
      reasons[1 + floor(random() * array_length(reasons, 1))::INTEGER],
      severity_level,
      flag_date,
      is_reviewed,
      CASE WHEN is_reviewed THEN flag_date + (RANDOM() * 2 || ' days')::INTERVAL ELSE NULL END,
      flag_date,
      flag_date
    )
    ON CONFLICT (id) DO NOTHING;
  END LOOP;
END $$;

COMMIT;

-- ============================================================================
-- 確認用クエリ（実行後、データが入っているか確認できます）
-- ============================================================================
-- 以下のクエリを実行して、データが正しく投入されたか確認してください:
--
-- SELECT COUNT(*) as products_count FROM public.products;
-- SELECT COUNT(*) as orders_count FROM public.orders;
-- SELECT COUNT(*) as payouts_count FROM public.payouts;
-- SELECT COUNT(*) as fraud_flags_count FROM public.fraud_flags;
-- 
-- SELECT status, COUNT(*) FROM public.orders GROUP BY status;
-- SELECT severity, COUNT(*) FROM public.fraud_flags GROUP BY severity;
-- SELECT status, COUNT(*) FROM public.payouts GROUP BY status;
