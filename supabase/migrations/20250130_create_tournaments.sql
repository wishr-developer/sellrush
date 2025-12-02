-- tournaments: 販売バトル / トーナメントの定義
-- Phase 8-A: Arena / Tournament MVP 実装

create table if not exists public.tournaments (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null, -- UIで使うID (例: "night-tournament-2025-01-30")
  title text not null,
  description text,
  status text not null default 'scheduled', -- 'scheduled' | 'live' | 'finished'
  start_at timestamptz not null,
  end_at timestamptz not null,
  -- 対象商品（MVPでは1商品）
  product_id uuid references public.products(id),
  -- 作成者（brand / admin）
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- インデックス
create index if not exists tournaments_status_idx on public.tournaments(status);
create index if not exists tournaments_product_id_idx on public.tournaments(product_id);
create index if not exists tournaments_start_at_idx on public.tournaments(start_at);
create index if not exists tournaments_end_at_idx on public.tournaments(end_at);
create index if not exists tournaments_slug_idx on public.tournaments(slug);

-- コメント
comment on table public.tournaments is '販売バトル / トーナメントの定義';
comment on column public.tournaments.slug is 'UIで使うID（URLなどで使用、例: "night-tournament-2025-01-30"）';
comment on column public.tournaments.status is 'トーナメントステータス: scheduled（予定）, live（開催中）, finished（終了）';
comment on column public.tournaments.product_id is '対象商品（MVPでは1商品のみ、将来は複数商品対応）';
comment on column public.tournaments.created_by is '作成者（brand / admin のユーザーID）';

-- 制約: 終了時刻は開始時刻より後である必要がある
alter table public.tournaments
  add constraint tournaments_end_after_start
  check (end_at > start_at);

-- 制約: status は 'scheduled', 'live', 'finished' のいずれか
alter table public.tournaments
  add constraint tournaments_status_check
  check (status IN ('scheduled', 'live', 'finished'));

-- RLS ポリシー（将来実装）
-- 注意: MVP では RLS ポリシーは実装せず、API Route 側でロールチェックを行う
-- 将来的には以下のようなポリシーを追加予定:
--
-- -- Brand / Company は自分の商品のトーナメントのみ作成可能
-- create policy "Brands can create tournaments for their products"
--   on public.tournaments for insert
--   with check (
--     (auth.jwt() -> 'user_metadata' ->> 'role') IN ('brand', 'company')
--     AND EXISTS (
--       SELECT 1 FROM public.products
--       WHERE products.id = tournaments.product_id
--       AND products.owner_id = auth.uid()
--     )
--   );
--
-- -- Admin は全トーナメントを作成可能
-- create policy "Admins can create all tournaments"
--   on public.tournaments for insert
--   with check (
--     (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
--   );
--
-- -- 全ロールが全トーナメントを閲覧可能
-- create policy "All authenticated users can view tournaments"
--   on public.tournaments for select
--   using (auth.role() = 'authenticated');

