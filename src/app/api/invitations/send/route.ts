import { NextRequest, NextResponse } from "next/server";
import { createApiSupabaseClient } from "@/lib/supabase-server";

/**
 * Invitation Send API Route
 * Admin のみ実行可能
 * 招待メールを送信する
 */
export async function POST(request: NextRequest) {
  try {
    // Create server client
    const supabase = createApiSupabaseClient(request);

    // Check authentication and admin role
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = user.user_metadata?.role;
    if (userRole !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { email, role } = body;

    if (!email || !role) {
      return NextResponse.json(
        { error: "email and role are required" },
        { status: 400 }
      );
    }

    // ログインURLを生成
    // 注意: 本番環境では環境変数または適切なドメインを使用すること（現状は開発環境用の localhost）
    const origin =
      request.headers.get("origin") ||
      request.nextUrl.origin ||
      "http://localhost:3000";
    const loginUrl = `${origin}/login`;

    // Supabase の Email テンプレートを使用してメールを送信
    // 注意: Supabase Dashboard で Email テンプレートを設定する必要があります
    // または、外部のメール送信サービス（SendGrid, Resend など）を使用

    // ここでは、Supabase の signInWithOtp を使用して Magic Link を送信
    // これにより、招待メールとして機能します
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${origin}/activate`,
        // カスタムメールテンプレートを使用する場合は、Supabase Dashboard で設定
        // data: {
        //   login_url: loginUrl,
        //   role: role,
        // }
      },
    });

    if (otpError) {
      // 本番環境では詳細なエラー情報をログに出力しない（セキュリティ）
      if (process.env.NODE_ENV === "development") {
        console.error("Invitation email send error:", otpError);
      }
      return NextResponse.json(
        { error: "Failed to send invitation email" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Invitation email sent",
      email,
      loginUrl,
    });
  } catch (error) {
    // 本番環境では詳細なエラー情報をログに出力しない（セキュリティ）
    if (process.env.NODE_ENV === "development") {
      console.error("Invitation send API error:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

