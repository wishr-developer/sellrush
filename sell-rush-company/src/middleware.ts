import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Middleware（暫定版）
 *
 * 元々は Supabase セッションと user_metadata.role === 'company' を検証し、
 * 未ログイン/権限なしユーザーを LP 側にリダイレクトしていたが、
 * ローカル開発環境でのポート/クッキー/role 設定の差異により
 * ログイン後もダッシュボードへ到達できないケースが発生していた。
 *
 * いったん認証チェックは全て無効化し、すべてのリクエストをそのまま
 * アプリに通す。将来的に role 設定が固まった段階で、再度
 * Supabase ベースの保護ロジックを追加する想定。
 */
export async function middleware(_req: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

