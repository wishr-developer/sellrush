# Admin Alerts Evaluation Function

管理画面の各種指標を評価し、アラートを生成する Supabase Edge Function です。

## 機能

以下の4つのルールを評価します：

1. **完了率低下** (`orders_completion_rate_low`)
   - 直近7日の完了率が 70% 未満 → warning
   - 50% 未満 → critical

2. **キャンセル・保留の異常増加** (`orders_abnormal_pending_cancel`)
   - 直近7日の cancel + pending 比率 > 20% → warning
   - 30% 以上 → critical

3. **高リスク Fraud の未レビュー** (`fraud_unreviewed_high`)
   - severity = 'high' AND reviewed = false が 1-2件 → warning
   - 3件以上 → critical

4. **プラットフォーム取り分の低下** (`payouts_platform_margin_low`)
   - 直近30日の platform_amount / gross_amount < 0.2 → warning
   - < 0.15 → critical

## デプロイ方法

```bash
# Supabase CLI でデプロイ
supabase functions deploy admin-alerts-eval
```

## 実行方法

### HTTP リクエストで実行

```bash
curl -X POST \
  https://<project-ref>.supabase.co/functions/v1/admin-alerts-eval \
  -H "Authorization: Bearer <service-role-key>"
```

### Cron で定期実行

Supabase Dashboard の "Scheduled Functions" で設定：

1. Dashboard → Edge Functions → Scheduled Functions
2. "Create Scheduled Function" をクリック
3. 以下の設定を入力：
   - **Function**: `admin-alerts-eval`
   - **Schedule**: `0 9 * * *` (毎日 9:00 UTC)
   - **HTTP Method**: `POST`
   - **Headers**: `Authorization: Bearer <service-role-key>`

## 環境変数

以下の環境変数が Supabase プロジェクトに設定されている必要があります：

- `SUPABASE_URL`: Supabase プロジェクトの URL
- `SUPABASE_SERVICE_ROLE_KEY`: サービスロールキー（テーブルへの書き込み権限が必要）

## アラートの upsert ロジック

- 同じ `code` かつ `resolved = false` のアラートが既に存在する場合、新規作成せずに更新します
- `severity` や `message` に変化がある場合のみ更新します
- これにより、同じ日の同じアラートが無限に増えることを防ぎます

