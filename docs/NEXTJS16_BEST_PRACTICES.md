# Next.js 16 ベストプラクティス確認

最終更新: 2025-12-02

## 概要

このドキュメントは、SELL RUSH プロジェクトが Next.js 16 のベストプラクティスに準拠しているかを確認するためのものです。

## Next.js 16 の主要な変更点

### 1. 非同期リクエスト API

Next.js 16 では、`cookies()`、`headers()`、`searchParams` が完全に非同期化されました。

#### ✅ 準拠している実装

**Server Components / Server Actions:**
```typescript
// src/lib/supabase-server.ts
export async function createServerSupabaseClient() {
  const cookieStore = await cookies(); // ✅ await を使用
  // ...
}
```

**API Routes:**
```typescript
// src/app/api/rankings/route.ts
export async function GET(request: NextRequest) {
  // API Routes では request オブジェクトから直接取得
  // ✅ NextRequest を使用しているため問題なし
}
```

#### ⚠️ 注意点

- **Middleware**: `middleware.ts` では `cookies()` は非同期ですが、`NextRequest` から直接 `cookies` プロパティにアクセスできるため、現在の実装は問題ありません。

### 2. Turbopack のデフォルト採用

Next.js 16 では、開発環境で Turbopack がデフォルトで使用されます。

#### ✅ 確認事項

- `package.json` に `next` のバージョンが 16.x であることを確認
- ビルドログで Turbopack が使用されていることを確認

### 3. Cache Components と Partial Prerendering (PPR)

Next.js 16 では、部分的プリレンダリングが強化されています。

#### 📝 推奨事項

- 動的コンテンツには `<Suspense>` を使用
- 静的コンテンツと動的コンテンツを適切に分離

#### ✅ 実装例

```typescript
// src/app/purchase/page.tsx
export default function PurchasePage() {
  return (
    <Suspense fallback={<div>Loading purchase details...</div>}>
      <PurchasePageInner />
    </Suspense>
  );
}
```

### 4. 型安全性の向上

Next.js 16 では、型安全性が向上しています。

#### ✅ 実装状況

- TypeScript を使用
- `tsconfig.json` で適切な設定
- 環境変数の型安全な管理（`src/lib/env.ts`）

### 5. App Router のベストプラクティス

#### ✅ 準拠している点

1. **ルーティング構造**
   - `src/app/` を App Router のルートとして使用
   - ルート直下の `app/` ディレクトリは存在しない（シャドウイングを回避）

2. **Server Components と Client Components**
   - `"use client"` ディレクティブを適切に使用
   - Server Components をデフォルトとして使用

3. **データフェッチング**
   - Server Components で直接データフェッチ
   - API Routes は必要最小限に使用

4. **エラーハンドリング**
   - 統一されたエラーハンドリング（`src/lib/api-error.ts`）
   - 適切な HTTP ステータスコードの使用

5. **環境変数の管理**
   - 一元管理（`src/lib/env.ts`）
   - 型安全なアクセス

### 6. セキュリティのベストプラクティス

#### ✅ 実装状況

1. **認証**
   - Supabase Auth を使用
   - RLS (Row Level Security) を活用
   - Service Role Key は慎重に使用

2. **環境変数**
   - 機密情報はサーバー側のみで使用
   - `NEXT_PUBLIC_` プレフィックスの適切な使用

3. **エラーメッセージ**
   - 本番環境では詳細なエラー情報をログに出力しない

### 7. パフォーマンス最適化

#### ✅ 実装状況

1. **画像最適化**
   - `next/image` コンポーネントを使用

2. **コード分割**
   - 動的インポートを適切に使用

3. **キャッシング**
   - Next.js のキャッシング戦略を活用

### 8. 推奨される改善点

#### 🔄 今後の改善候補

1. **Middleware の更新**
   - Next.js 16 では `middleware` が `proxy` に変更される予定
   - 警告メッセージ: `⚠ The "middleware" file convention is deprecated. Please use "proxy" instead.`
   - 将来的に `src/middleware.ts` を `src/proxy.ts` に移行することを検討

2. **エラーハンドリングの拡張**
   - `error.tsx` と `not-found.tsx` の追加を検討
   - グローバルエラーバウンダリの実装

3. **ローディング状態**
   - `loading.tsx` の追加を検討
   - Suspense の活用を拡大

4. **メタデータの最適化**
   - 動的メタデータの生成を検討
   - Open Graph と Twitter Card の最適化

## 確認チェックリスト

- [x] Next.js 16 を使用している
- [x] `cookies()` を非同期で使用している（Server Components）
- [x] `useSearchParams()` を Suspense でラップしている
- [x] App Router の構造が正しい（`src/app/` を使用）
- [x] 型安全性が確保されている
- [x] 環境変数の管理が一元化されている
- [x] エラーハンドリングが統一されている
- [x] セキュリティのベストプラクティスに準拠している
- [ ] Middleware を Proxy に移行（将来のタスク）
- [ ] `error.tsx` と `not-found.tsx` の追加（将来のタスク）

## 参考リンク

- [Next.js 16 Documentation](https://nextjs.org/docs)
- [Next.js App Router](https://nextjs.org/docs/app)
- [Next.js 16 Release Notes](https://nextjs.org/blog/next-16)

