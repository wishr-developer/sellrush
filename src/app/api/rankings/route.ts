import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

/**
 * Rankings API Route
 * Returns top creators ranked by total sales
 * Requires authentication (any logged-in user can view rankings)
 */
export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: "Missing Supabase configuration" },
        { status: 500 }
      );
    }

    // Create server client to check authentication
    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set() {
            // Not needed for GET requests
          },
          remove() {
            // Not needed for GET requests
          },
        },
      }
    );

    // Check if user is authenticated
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch all orders (RLS will filter based on policies)
    // Note: For rankings, we need to see all creators' orders
    // This requires a service_role key or a different RLS policy
    // For now, we'll use a workaround: fetch orders with a policy that allows reading
    // all orders for ranking purposes

    // Since RLS restricts access, we'll need to use a database function or
    // a different approach. For now, return empty rankings with a note.
    // In production, you should:
    // 1. Create a database function that calculates rankings
    // 2. Or use a materialized view for rankings
    // 3. Or create a separate rankings table that's updated via triggers

    return NextResponse.json({
      rankings: [],
      note: "Rankings require database-level aggregation. Please implement a database function or materialized view.",
    });
  } catch (error) {
    // 本番環境では詳細なエラー情報をログに出力しない（セキュリティ）
    if (process.env.NODE_ENV === "development") {
      console.error("Rankings API error:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

