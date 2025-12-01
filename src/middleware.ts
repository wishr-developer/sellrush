import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Middleware: 認証制御（未ログインのみブロック）
 * - PUBLIC_PATHS は完全公開
 * - それ以外のパスは「ログイン必須」だが、role 判定は行わない
 */
// 完全公開パス（認証チェックなしで常に通す）
const PUBLIC_PATHS = [
  "/",
  "/en",
  "/login",
  "/activate",
  "/robots.txt",
  "/sitemap.xml",
];

// 完全公開プレフィックス
// /dashboard, /brand/dashboard は middleware では保護せず、
// Client Component 側（DashboardClient / BrandDashboardClient）でのみ認証・role チェックを行う。
const PUBLIC_PREFIXES = ["/dashboard", "/brand/dashboard"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 公開パス / 公開プレフィックスはそのまま通す（LP やログイン画面、/dashboard 系など）
  if (
    PUBLIC_PATHS.includes(pathname) ||
    PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))
  ) {
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });

  // Supabase クライアントを作成（cookie を連携して Edge 側でもセッションを判定する）
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          req.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: req.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: any) {
          req.cookies.set({
            name,
            value: "",
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: req.headers,
            },
          });
          response.cookies.set({
            name,
            value: "",
            ...options,
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (process.env.NODE_ENV === "development") {
    // 開発環境のみ、どのパスで誰が通過しているかを確認するためのログ
    // 本番ではログを残さない
    // eslint-disable-next-line no-console
    console.log("[middleware] user", {
      path: pathname,
      hasUser: !!user,
      role: user?.user_metadata?.role,
    });
  }

  // 未ログインのみ /login にリダイレクト（role 判定は各ページ側に任せる）
  if (!user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

