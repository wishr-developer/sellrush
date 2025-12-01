import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Payouts Generate API Route
 * Admin のみ実行可能
 * order.status === 'completed' の orders に対して payouts を生成
 */
export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: "Missing Supabase configuration" },
        { status: 500 }
      );
    }

    // Create server client
    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set() {
            // Not needed for POST requests
          },
          remove() {
            // Not needed for POST requests
          },
        },
      }
    );

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

    // Parse request body (optional: order_id を指定して特定の order のみ生成)
    const body = await request.json().catch(() => ({}));
    const { order_id } = body;

    // 1. 対象となる orders を取得
    // order.status === 'completed' かつ、まだ payouts が生成されていない orders
    let ordersQuery = supabase
      .from("orders")
      .select("id, product_id, creator_id, amount, status")
      .eq("status", "completed");

    if (order_id) {
      ordersQuery = ordersQuery.eq("id", order_id);
    }

    const { data: orders, error: ordersError } = await ordersQuery;

    if (ordersError) {
      console.error("Orders fetch error:", ordersError);
      return NextResponse.json(
        { error: "Failed to fetch orders" },
        { status: 500 }
      );
    }

    if (!orders || orders.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No orders to process",
        generated: 0,
      });
    }

    // 2. 既存の payouts を確認（重複生成を防ぐ）
    const orderIds = orders.map((o) => o.id);
    const { data: existingPayouts } = await supabase
      .from("payouts")
      .select("order_id")
      .in("order_id", orderIds);

    const existingOrderIds = new Set(
      existingPayouts?.map((p) => p.order_id) || []
    );

    // 3. まだ payouts が生成されていない orders をフィルタ
    const ordersToProcess = orders.filter(
      (o) => !existingOrderIds.has(o.id)
    );

    if (ordersToProcess.length === 0) {
      return NextResponse.json({
        success: true,
        message: "All orders already have payouts",
        generated: 0,
      });
    }

    // 4. products テーブルから owner_id と分配率を取得
    const productIds = [
      ...new Set(ordersToProcess.map((o) => o.product_id).filter(Boolean)),
    ];

    const { data: products } = await supabase
      .from("products")
      .select("id, owner_id, creator_share_rate, platform_take_rate")
      .in("id", productIds);

    const productMap = new Map(
      (products || []).map((p) => [
        p.id,
        {
          owner_id: p.owner_id,
          creator_share_rate: p.creator_share_rate || 0.25, // デフォルト 25%
          platform_take_rate: p.platform_take_rate || 0.15, // デフォルト 15%
        },
      ])
    );

    // 5. payouts を生成（商品ごとの分配率を使用）
    const payoutsToInsert = ordersToProcess.map((order) => {
      const grossAmount = order.amount || 0;
      const product = productMap.get(order.product_id);
      
      // 商品ごとの分配率を使用（デフォルト値あり）
      const creatorShareRate = product?.creator_share_rate || 0.25;
      const platformTakeRate = product?.platform_take_rate || 0.15;
      
      // 分配額を計算
      const creatorAmount = Math.floor(grossAmount * creatorShareRate);
      const platformAmount = Math.floor(grossAmount * platformTakeRate);
      const brandAmount = grossAmount - creatorAmount - platformAmount; // 端数調整

      return {
        order_id: order.id,
        creator_id: order.creator_id,
        brand_id: product?.owner_id || null,
        gross_amount: grossAmount,
        creator_amount: creatorAmount,
        platform_amount: platformAmount,
        brand_amount: brandAmount,
        status: "pending",
      };
    });

    // 6. payouts を一括 INSERT
    const { data: insertedPayouts, error: insertError } = await supabase
      .from("payouts")
      .insert(payoutsToInsert)
      .select();

    if (insertError) {
      // 本番環境では詳細なエラー情報をログに出力しない（セキュリティ）
      if (process.env.NODE_ENV === "development") {
        console.error("Payouts insert error:", insertError);
      }
      return NextResponse.json(
        { error: "Failed to create payouts" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: `Generated ${insertedPayouts?.length || 0} payouts`,
        generated: insertedPayouts?.length || 0,
        payouts: insertedPayouts,
      },
      { status: 201 }
    );
  } catch (error) {
    // 本番環境では詳細なエラー情報をログに出力しない（セキュリティ）
    if (process.env.NODE_ENV === "development") {
      console.error("Payouts generate API error:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

