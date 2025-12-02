/**
 * Supabase クライアント（クライアント側用）
 * 
 * 注意: このクライアントはブラウザ側で使用されます。
 * RLS (Row Level Security) の制約が適用されるため、
 * サーバー側で RLS をバイパスする必要がある場合は
 * `createServerClient` を使用してください。
 * 
 * 参考: @supabase/ssr
 * https://supabase.com/docs/guides/auth/server-side/creating-a-client
 */
import { createClient } from '@supabase/supabase-js'
import { validatePublicEnv, publicEnv } from './env'

// 環境変数のバリデーション
const envValidation = validatePublicEnv()
if (!envValidation.isValid) {
  // ビルド時にエラーを発生させて、環境変数の不足を早期発見
  throw new Error(
    `Missing Supabase environment variables: ${envValidation.missing.join(', ')}`
  )
}

export const supabase = createClient(
  publicEnv.supabaseUrl!,
  publicEnv.supabaseAnonKey!
)


