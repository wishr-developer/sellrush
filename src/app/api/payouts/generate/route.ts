import { NextRequest, NextResponse } from "next/server";
import { createApiSupabaseClient } from "@/lib/supabase-server";
import {
  unauthorizedError,
  forbiddenError,
  internalServerError,
} from "@/lib/api-error";
import { calculateRevenueShareFromProduct } from "@/lib/revenue-share";

/**
 * Payouts Generate API Route
 * Admin のみ実行可能
 * order.status === 'completed' の orders に対して payouts を生成
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
      return unauthorizedError();
    }

    const userRole = user.user_metadata?.role;
    if (userRole !== "admin") {
      return forbiddenError("Admin access required");
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
      return internalServerError("Failed to fetch orders");
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
    // Revenue Share 計算ロジックを統一関数を使用
    const payoutsToInsert = ordersToProcess.map((order) => {
      const grossAmount = order.amount || 0;
      const product = productMap.get(order.product_id);
      
      // 商品ごとの分配率を使用（デフォルト値あり）
      const creatorShareRate = product?.creator_share_rate || 0.25;
      const platformTakeRate = product?.platform_take_rate || 0.15;
      
      // 統一関数で分配額を計算
      const revenueShare = calculateRevenueShareFromProduct(
        grossAmount,
        creatorShareRate,
        platformTakeRate
      );

      return {
        order_id: order.id,
        creator_id: order.creator_id,
        brand_id: product?.owner_id || null,
        gross_amount: grossAmount,
        creator_amount: revenueShare.creatorAmount,
        platform_amount: revenueShare.platformAmount,
        brand_amount: revenueShare.brandAmount,
        status: "pending",
      };
    });

    // 6. payouts を一括 INSERT
    const { data: insertedPayouts, error: insertError } = await supabase
      .from("payouts")
      .insert(payoutsToInsert)
      .select();

    if (insertError) {
      return internalServerError("Failed to create payouts");
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
  } catch (error: any) {
    return internalServerError(
      error.message || "Failed to generate payouts"
    );
  }
}

