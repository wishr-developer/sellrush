# 商品イベントログ基盤 セットアップ

## 概要

商品関連の操作・出来事を記録するためのイベントログ基盤です。
売れ行き分析・通知・ダッシュボード拡張の基盤として使用します。

## Supabase テーブル作成

Supabase の SQL Editor で以下の SQL を実行してください。

```sql
create table if not exists product_events (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null,
  event_type text not null,
  metadata jsonb default '{}',
  created_at timestamp with time zone default now()
);

-- インデックスを追加（パフォーマンス向上のため）
create index if not exists idx_product_events_product_id on product_events(product_id);
create index if not exists idx_product_events_event_type on product_events(event_type);
create index if not exists idx_product_events_created_at on product_events(created_at);
```

## product_stats テーブル作成

分析用の集計テーブルを作成します。

```sql
create table if not exists product_stats (
  product_id uuid primary key,
  view_count integer default 0,
  order_count integer default 0,
  revenue_total integer default 0,
  last_viewed_at timestamp with time zone,
  last_ordered_at timestamp with time zone,
  updated_at timestamp with time zone default now()
);

-- インデックスを追加（パフォーマンス向上のため）
create index if not exists idx_product_stats_product_id on product_stats(product_id);
create index if not exists idx_product_stats_order_count on product_stats(order_count);
create index if not exists idx_product_stats_view_count on product_stats(view_count);
```

## RPC関数（オプション）

`view_count`を高速に更新するためのRPC関数（オプション）。存在しない場合はフォールバック処理が動作します。

```sql
-- view_count をインクリメントするRPC関数
create or replace function increment_product_view_count(p_product_id uuid)
returns void
language plpgsql
as $$
begin
  update product_stats
  set
    view_count = view_count + 1,
    last_viewed_at = now(),
    updated_at = now()
  where product_id = p_product_id;
  
  -- レコードが存在しない場合は作成
  if not found then
    insert into product_stats (product_id, view_count, last_viewed_at)
    values (p_product_id, 1, now());
  end if;
end;
$$;
```

## イベントタイプ

現在実装されているイベントタイプ：

- `product_created`: 商品マスター新規作成時
- `product_updated`: 商品マスター編集時（将来実装予定）
- `product_published`: 商品公開時（将来実装予定）
- `product_viewed`: 商品閲覧時（将来実装予定）
- `product_ordered`: 商品注文時（将来実装予定）

## 実装箇所

- **イベント記録関数**: `src/app/products/page.tsx` の `logProductEvent` 関数
- **商品作成時の記録**: `onSubmit` 関数内で商品作成成功後に自動記録
- **product_stats 初期化**: `initializeProductStats` 関数（商品作成時）
- **view_count 更新**: `incrementViewCount` 関数（`product_viewed` イベント時）
- **order_count 更新**: `incrementOrderCount` 関数（`product_ordered` イベント時）

## product_stats の動作

- **商品作成時**: `product_stats` 行が自動的に作成されます（初期値は0）
- **商品閲覧時**: `view_count` が +1、`last_viewed_at` が更新されます
- **商品注文時**: `order_count` が +1、`revenue_total` が増加、`last_ordered_at` が更新されます
- **ダッシュボード**: `product_stats` から集計データを取得して表示します

## 注意事項

- イベント記録に失敗しても、メイン処理（商品作成・更新）は継続されます
- エラーはコンソールに警告として記録されます
- `metadata` フィールドには、分析に有用な情報（価格、カテゴリ、タグなど）が保存されます

## 将来の拡張

### 商品編集時のイベント記録

商品編集処理が実装された際は、以下のようにイベントを記録してください：

```typescript
// 商品更新成功後
await logProductEvent(productId, 'product_updated', {
  price: updatedPrice,
  category: updatedCategory,
  tags: updatedTags,
})
```

### 商品閲覧時のイベント記録

商品詳細ページなどで閲覧イベントを記録する場合：

```typescript
// 商品閲覧時
await logProductEvent(productId, 'product_viewed')
await incrementViewCount(productId)
```

### 商品注文時のイベント記録

注文処理が実装された際は、以下のようにイベントとstatsを更新してください：

```typescript
// 注文成功後
await logProductEvent(productId, 'product_ordered', {
  price: orderPrice,
  quantity: orderQuantity,
})
await incrementOrderCount(productId, orderPrice, orderQuantity)
```

