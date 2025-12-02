/**
 * Supabase サーバー側クライアント生成ユーティリティ
 * 
 * Next.js App Router の Server Components や API Routes で使用
 * 
 * 参考:
 * - @supabase/ssr: https://supabase.com/docs/guides/auth/server-side/creating-a-client
 * - Next.js App Router: https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations
 */

import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { publicEnv, serverEnv } from "./env";

/**
 * Server Component または Server Action で使用する Supabase クライアントを生成
 * 
 * クッキーを使用して認証状態を管理します。
 * RLS (Row Level Security) が適用されます。
 * 
 * 注意: Server Components では通常、クライアント側の Supabase クライアントを使用します。
 * この関数は Server Actions や API Routes で使用することを想定しています。
 * 
 * @example
 * ```ts
 * import { createServerSupabaseClient } from '@/lib/supabase-server'
 * 
 * export async function ServerAction() {
 *   const supabase = await createServerSupabaseClient()
 *   const { data } = await supabase.from('products').select('*')
 *   return data
 * }
 * ```
 */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(
    publicEnv.supabaseUrl!,
    publicEnv.supabaseAnonKey!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options?: any) {
          try {
            cookieStore.set(name, value, options);
          } catch (error) {
            // Server Component では set が失敗する場合がある
            // これは正常な動作です
          }
        },
        remove(name: string, options?: any) {
          try {
            cookieStore.set(name, "", { ...options, maxAge: 0 });
          } catch (error) {
            // Server Component では remove が失敗する場合がある
            // これは正常な動作です
          }
        },
      },
    }
  );
}

/**
 * API Route で使用する Supabase クライアントを生成
 * 
 * NextRequest からクッキーを取得して認証状態を管理します。
 * RLS (Row Level Security) が適用されます。
 * 
 * @example
 * ```ts
 * import { createApiSupabaseClient } from '@/lib/supabase-server'
 * 
 * export async function GET(request: NextRequest) {
 *   const supabase = createApiSupabaseClient(request)
 *   const { data } = await supabase.from('products').select('*')
 *   return NextResponse.json(data)
 * }
 * ```
 */
export function createApiSupabaseClient(request: NextRequest) {
  return createServerClient(
    publicEnv.supabaseUrl!,
    publicEnv.supabaseAnonKey!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options?: any) {
          // API Route では set は通常使用しない
          // 必要に応じて NextResponse の cookies を使用
        },
        remove(name: string, options?: any) {
          // API Route では remove は通常使用しない
          // 必要に応じて NextResponse の cookies を使用
        },
      },
    }
  );
}

/**
 * 管理者権限で Supabase クライアントを生成（Service Role Key 使用）
 * 
 * RLS をバイパスして全データにアクセスできます。
 * 注意: このクライアントは慎重に使用してください。
 * 
 * 使用例:
 * - Webhook 処理
 * - ランキング計算
 * - 管理者向けAPI
 * 
 * @example
 * ```ts
 * import { createAdminSupabaseClient } from '@/lib/supabase-server'
 * 
 * export async function POST(request: NextRequest) {
 *   const supabase = createAdminSupabaseClient()
 *   // RLS をバイパスして全データにアクセス可能
 *   const { data } = await supabase.from('orders').select('*')
 * }
 * ```
 */
export function createAdminSupabaseClient() {
  if (!serverEnv.supabaseServiceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is required for admin operations"
    );
  }

  return createClient(
    publicEnv.supabaseUrl!,
    serverEnv.supabaseServiceRoleKey!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

