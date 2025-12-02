import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { validateStripeCheckoutEnv, publicEnv, serverEnv } from "@/lib/env";

/**
 * Admin Users API Route
 * Fetches all users from Supabase Auth using Admin API
 * Requires admin role
 * 
 * ⚠️ 注意: Service Role Key が必要です（Admin API を使用するため）
 */
export async function GET(request: NextRequest) {
  try {
    // 環境変数のバリデーション
    const envValidation = validateStripeCheckoutEnv();
    if (!envValidation.isValid) {
      return NextResponse.json(
        { 
          error: "Configuration error",
          missing: envValidation.missing,
        },
        { status: 500 }
      );
    }

    const supabaseUrl = publicEnv.supabaseUrl!;
    const supabaseAnonKey = publicEnv.supabaseAnonKey!;
    const supabaseServiceRoleKey = serverEnv.supabaseServiceRoleKey;

    // Create server client to check admin role
    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            // Not needed for GET requests
          },
          remove(name: string, options: any) {
            // Not needed for GET requests
          },
        },
      }
    );

    // Check if user is admin
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.user_metadata?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch users using Admin API (service_role key)
    // ⚠️ 重要: Admin API を使用するには Service Role Key が必須です
    if (!supabaseServiceRoleKey) {
      // 本番環境では警告をログに出力しない（セキュリティ）
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "SUPABASE_SERVICE_ROLE_KEY not set. Cannot fetch user list."
        );
      }
      return NextResponse.json(
        { 
          error: "Service role key not configured",
          message: "SUPABASE_SERVICE_ROLE_KEY is required for admin operations. Please configure it in Vercel settings."
        },
        { status: 500 }
      );
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const {
      data: { users },
      error: listError,
    } = await adminClient.auth.admin.listUsers();

    if (listError) {
      // 本番環境では詳細なエラー情報をログに出力しない（セキュリティ）
      if (process.env.NODE_ENV === "development") {
        console.error("Admin listUsers error:", listError);
      }
      return NextResponse.json(
        { error: "Failed to fetch users" },
        { status: 500 }
      );
    }

    // Format users for display
    const formattedUsers = users.map((u) => ({
      id: u.id,
      email: u.email || "N/A",
      role: u.user_metadata?.role || "N/A",
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
    }));

    return NextResponse.json({ users: formattedUsers });
  } catch (error) {
    // 本番環境では詳細なエラー情報をログに出力しない（セキュリティ）
    if (process.env.NODE_ENV === "development") {
      console.error("Admin users API error:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

