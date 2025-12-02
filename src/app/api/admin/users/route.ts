import { NextRequest, NextResponse } from "next/server";
import { validateStripeCheckoutEnv } from "@/lib/env";
import { createApiSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase-server";
import {
  configurationError,
  unauthorizedError,
  forbiddenError,
  internalServerError,
} from "@/lib/api-error";

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
      return configurationError(
        "Please configure the required environment variables.",
        envValidation.missing
      );
    }

    // Create server client to check admin role
    const supabase = createApiSupabaseClient(request);

    // Check if user is admin
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return unauthorizedError();
    }

    if (user.user_metadata?.role !== "admin") {
      return forbiddenError();
    }

    // Fetch users using Admin API (service_role key)
    // ⚠️ 重要: Admin API を使用するには Service Role Key が必須です
    const adminClient = createAdminSupabaseClient();

    const {
      data: { users },
      error: listError,
    } = await adminClient.auth.admin.listUsers();

    if (listError) {
      return internalServerError("Failed to fetch users");
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
  } catch (error: any) {
    return internalServerError(
      error.message || "Failed to fetch users"
    );
  }
}

