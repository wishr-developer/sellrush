# SELL RUSH - マルチポータル構成

SELL RUSHは「公式サイト + 3種の管理画面」に明確に分離されたマルチポータル構成です。

## ポート・役割定義

| ポート | 役割 | URL |
|--------|------|-----|
| **3000** | 公式サイト（総合エントランス） | http://localhost:3000 |
| **3001** | インフルエンサー向け管理画面 | http://localhost:3001 |
| **3002** | 企業向け管理画面 | http://localhost:3002 |
| **3003** | 運営管理者向け管理画面 | http://localhost:3003 |

## プロジェクト構造

```
sell-rush-lp/
├── src/                    # 公式サイト (localhost:3000)
│   ├── app/
│   │   ├── page.tsx       # トップページ（アリーナ型）
│   │   └── login/         # ログイン・会員登録
│   └── middleware.ts      # 認証制御（role別リダイレクト）
│
├── sell-rush-influencer/  # インフルエンサー管理画面 (localhost:3001)
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx   # ダッシュボード（司令室）
│   │   │   └── products/  # 商品一覧
│   │   └── middleware.ts  # role=influencer制御
│
├── sell-rush-company/     # 企業管理画面 (localhost:3002)
│   ├── src/
│   │   ├── app/
│   │   │   ├── dashboard/ # ダッシュボード
│   │   │   └── products/  # 商品管理
│   │   └── middleware.ts  # role=company制御
│
└── sell-rush-admin/       # 運営管理画面 (localhost:3003)
    ├── src/
    │   ├── app/
    │   │   ├── login/     # ログイン（MFA必須）
    │   │   ├── mfa-setup/ # MFAセットアップ
    │   │   └── page.tsx   # 管理ダッシュボード
    │   └── middleware.ts  # role=admin + MFA制御
```

## 起動方法

**重要**: 各プロジェクトは**別々のターミナルウィンドウ**で起動してください。

### 1. 公式サイト (localhost:3000)

ターミナル1で実行:

```bash
cd sell-rush-lp
npm install
npm run dev
```

### 2. インフルエンサー管理画面 (localhost:3001)

ターミナル2で実行:

```bash
cd sell-rush-lp/sell-rush-influencer
npm install
npm run dev
```

### 3. 企業管理画面 (localhost:3002)

ターミナル3で実行:

```bash
cd sell-rush-lp/sell-rush-company
npm install
npm run dev
```

### 4. 運営管理画面 (localhost:3003)

ターミナル4で実行:

```bash
cd sell-rush-lp/sell-rush-admin
npm install
npm run dev
```

## 認証・認可フロー

### ログイン・会員登録

1. **公式サイト (localhost:3000)** でログイン・会員登録
2. ログイン成功後、**ユーザーのroleに応じて自動リダイレクト**:
   - `influencer` → http://localhost:3001
   - `company` → http://localhost:3002
   - `admin` → http://localhost:3003

### 各管理画面の認可

- **インフルエンサー管理画面**: `role = influencer` のみアクセス可能
- **企業管理画面**: `role = company` のみアクセス可能
- **運営管理画面**: `role = admin` かつ **MFA（多要素認証）必須**

## 運営管理者ログイン情報（初期）

- **メールアドレス**: info@xiora-official.com
- **パスワード**: Xiora123!
- **認証方式**: Supabase Auth + Google Authenticator（TOTP）

## 環境変数

各プロジェクトで以下の環境変数を設定してください：

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 技術スタック

- **Next.js 16** (App Router)
- **TypeScript**
- **Supabase** (Auth, DB, Storage)
- **Tailwind CSS**
- **Lucide React** (アイコン)

## セキュリティ

- Middlewareによる認証・認可制御
- ロールベースアクセス制御（RBAC）
- 運営管理画面はMFA（多要素認証）必須
- 各ポートで共通のSupabase DB・Authを使用

## Vercel デプロイ設定

### 重要な構成要件

**⚠️ このプロジェクトはルート直下を Next.js プロジェクトとして使用しています。**

- **App Router の場所**: `src/app/` が唯一の App Router ディレクトリです
- **Vercel Root Directory**: **未設定（空）** にしてください
  - Vercel ダッシュボード → Settings → General → Build and Development Settings
  - Root Directory フィールドは空のままにしてください
- **ルート直下の `app/` ディレクトリ**: **絶対に作成しないでください**
  - ルート直下に `app/` を作成すると、`src/app/` をシャドウしてしまい、404エラーが発生します
  - Next.js は `app/` と `src/app/` の両方が存在する場合、`app/` を優先します

### デプロイ確認

デプロイ後、以下のURLが正常に表示されることを確認してください：

- `https://sellrush.vercel.app/` → トップページ（LP）
- `https://sellrush.vercel.app/login` → ログインページ
- `https://sellrush.vercel.app/dashboard` → ダッシュボード

### 開発時の注意事項

- **`useSearchParams()` を使用する場合**: 必ず `Suspense` boundary でラップしてください
  - 例: `/purchase`, `/purchase/success` を参照
  - ラップしないとビルド時にエラーが発生し、ルーティングが正しく生成されません
- **ルート直下に `app/` を作成しない**: 誤って作成した場合は削除してください
