# Admin Alerts 基盤 セットアップガイド

管理画面全体で使用するアラート基盤のセットアップ手順です。

## 1. データベーステーブルの作成

### 手順

1. Supabase Dashboard にログイン
2. SQL Editor を開く
3. `supabase-admin-alerts.sql` の内容をコピー＆ペースト
4. "Run" ボタンをクリック

これで `admin_alerts` テーブルが作成されます。

## 2. Edge Function のデプロイ

### 前提条件

- Supabase CLI がインストールされていること
- Supabase プロジェクトにログインしていること

### デプロイ手順

```bash
# プロジェクトディレクトリに移動
cd sell-rush-admin

# Edge Function をデプロイ
supabase functions deploy admin-alerts-eval
```

### 環境変数の設定

Supabase Dashboard で以下の環境変数を設定してください：

1. Dashboard → Edge Functions → admin-alerts-eval → Settings
2. 以下の環境変数を追加：
   - `SUPABASE_URL`: プロジェクトの URL（例: `https://xxxxx.supabase.co`）
   - `SUPABASE_SERVICE_ROLE_KEY`: サービスロールキー（Settings → API → service_role key）

## 3. Cron での定期実行設定（オプション）

### 手順

1. Supabase Dashboard → Edge Functions → Scheduled Functions
2. "Create Scheduled Function" をクリック
3. 以下の設定を入力：
   - **Function**: `admin-alerts-eval`
   - **Schedule**: `0 9 * * *` (毎日 9:00 UTC)
   - **HTTP Method**: `POST`
   - **Headers**: 
     ```
     Authorization: Bearer <service-role-key>
     Content-Type: application/json
     ```

### 手動実行

HTTP リクエストで手動実行することもできます：

```bash
curl -X POST \
  https://<project-ref>.supabase.co/functions/v1/admin-alerts-eval \
  -H "Authorization: Bearer <service-role-key>" \
  -H "Content-Type: application/json"
```

## 4. アラートの確認

`/admin` ページにアクセスすると、未解決のアラートが一覧表示されます。

- **info**: 青（情報）
- **warning**: 黄（警告）
- **critical**: 赤（緊急）

## 実装されているルール

### 1. 完了率低下 (`orders_completion_rate_low`)
- 直近7日の完了率 < 70% → warning
- 直近7日の完了率 < 50% → critical

### 2. キャンセル・保留の異常増加 (`orders_abnormal_pending_cancel`)
- 直近7日の cancel + pending 比率 > 20% → warning
- 30% 以上 → critical

### 3. 高リスク Fraud の未レビュー (`fraud_unreviewed_high`)
- severity = 'high' AND reviewed = false が 1-2件 → warning
- 3件以上 → critical

### 4. プラットフォーム取り分の低下 (`payouts_platform_margin_low`)
- 直近30日の platform_amount / gross_amount < 0.2 → warning
- < 0.15 → critical

## アラートの upsert ロジック

- 同じ `code` かつ `resolved = false` のアラートが既に存在する場合、新規作成せずに更新します
- `severity` や `message` に変化がある場合のみ更新します
- これにより、同じ日の同じアラートが無限に増えることを防ぎます

## トラブルシューティング

### アラートが表示されない

1. `admin_alerts` テーブルが作成されているか確認
2. Edge Function が正常にデプロイされているか確認
3. Edge Function が正常に実行されているか確認（ログを確認）
4. ブラウザのコンソールでエラーがないか確認

### Edge Function のエラー

1. Supabase Dashboard → Edge Functions → admin-alerts-eval → Logs でログを確認
2. 環境変数が正しく設定されているか確認
3. サービスロールキーに適切な権限があるか確認

## 今後の拡張

- メール通知
- Slack 通知
- アラート解決機能（手動マーク）
- アラート履歴の表示

