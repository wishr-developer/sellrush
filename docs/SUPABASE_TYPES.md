# Supabase 型定義の生成手順

## 概要

Supabase の型定義を自動生成することで、TypeScript の型安全性を向上させ、開発効率を高めます。

## 前提条件

- Supabase CLI がインストールされていること
- Supabase プロジェクトへのアクセス権があること

## インストール手順

### 1. Supabase CLI のインストール

```bash
# npm でインストール
npm install -g supabase

# または Homebrew (macOS)
brew install supabase/tap/supabase
```

### 2. Supabase にログイン

```bash
supabase login
```

ブラウザが開き、Supabase アカウントでログインします。

### 3. プロジェクトをリンク

```bash
# プロジェクト参照IDを取得
# Supabase Dashboard → Settings → General → Reference ID

# プロジェクトをリンク
supabase link --project-ref <your-project-ref>
```

### 4. 型定義を生成

```bash
# 型定義を生成してファイルに保存
supabase gen types typescript --linked > src/types/database.ts
```

## 使用方法

型定義を生成したら、Supabase クライアントで型を指定できます：

```typescript
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// 型安全なクエリ
const { data } = await supabase
  .from('orders')
  .select('*')
  // data の型が自動的に推論される
```

## 注意事項

- **手動編集禁止**: `src/types/database.ts` は自動生成されるため、手動で編集しないでください
- **再生成**: データベーススキーマが変更されたら、必ず型定義を再生成してください
- **Git管理**: 型定義ファイルは Git で管理します（チーム全体で同じ型定義を使用するため）

## トラブルシューティング

### CLI が見つからない

```bash
# パスを確認
which supabase

# 再インストール
npm install -g supabase
```

### プロジェクトのリンクに失敗する

```bash
# リンクを解除して再試行
supabase unlink
supabase link --project-ref <your-project-ref>
```

### 型定義が古い

```bash
# 最新のスキーマから再生成
supabase gen types typescript --linked > src/types/database.ts
```

## 参考リンク

- [Supabase CLI Documentation](https://supabase.com/docs/reference/cli/introduction)
- [TypeScript Type Generation](https://supabase.com/docs/reference/cli/supabase-gen-types-typescript)

