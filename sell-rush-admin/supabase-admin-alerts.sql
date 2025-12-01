-- ============================================
-- Admin Alerts テーブル作成
-- ============================================
-- 
-- この SQL は Supabase SQL Editor で実行してください。
-- 
-- 実行方法:
-- 1. Supabase Dashboard にログイン
-- 2. SQL Editor を開く
-- 3. このファイルの内容をコピー＆ペースト
-- 4. "Run" ボタンをクリック
--
-- ============================================

-- admin_alerts テーブルの作成
create table if not exists public.admin_alerts (
  id uuid primary key default gen_random_uuid(),
  
  -- "orders_completion_rate_low" などの機械可読なコード
  code text not null,
  
  -- 簡単なタイトル
  title text not null,
  
  -- 日本語での説明（経営者・運営向け）
  message text not null,
  
  -- severity: info / warning / critical
  severity text not null check (severity in ('info', 'warning', 'critical')),
  
  -- 関連するエンティティ（order / creator / product など）がある場合
  entity_type text null,
  entity_id text null,
  
  -- いつ検出したか
  detected_at timestamptz not null default now(),
  
  -- 解消されたかどうか（手動管理 or 自動）
  resolved boolean not null default false,
  resolved_at timestamptz null
);

-- インデックスの作成
create index if not exists admin_alerts_detected_at_idx
  on public.admin_alerts (detected_at desc);

create index if not exists admin_alerts_resolved_idx
  on public.admin_alerts (resolved)
  where resolved = false;

-- code と resolved の複合インデックス（upsert 時の検索を高速化）
create index if not exists admin_alerts_code_resolved_idx
  on public.admin_alerts (code, resolved)
  where resolved = false;

-- コメント追加
comment on table public.admin_alerts is '管理画面用のアラート一覧。ルール評価エンジンが自動生成する。';
comment on column public.admin_alerts.code is '機械可読なアラートコード（例: orders_completion_rate_low）';
comment on column public.admin_alerts.severity is '重要度: info（情報）/ warning（警告）/ critical（緊急）';
comment on column public.admin_alerts.resolved is '解消済みフラグ。true になると一覧から非表示になる。';

