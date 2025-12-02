import { NextRequest, NextResponse } from "next/server";
import { createApiSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase-server";
import { unauthorizedError, internalServerError } from "@/lib/api-error";

/**
 * Rankings API Route
 * Returns top creators ranked by total sales
 * Requires authentication (any logged-in user can view rankings)
 * Uses Service Role Key to bypass RLS and get all orders for ranking
 */
export async function GET(request: NextRequest) {
  try {
    // 認証チェック用のクライアント
    const supabase = createApiSupabaseClient(request);

    // Check if user is authenticated
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return unauthorizedError();
    }

    // Service Role Keyを使用して全注文を取得（RLSをバイパス）
    const supabaseAdmin = createAdminSupabaseClient();

    // 完了済み注文を取得
    const { data: orders, error: ordersError } = await supabaseAdmin
      .from("orders")
      .select("id, amount, creator_id, affiliate_link_id, created_at")
      .eq("status", "completed")
      .order("created_at", { ascending: false });

    if (ordersError) {
      console.error("Orders fetch error:", ordersError);
      return internalServerError("Failed to fetch orders");
    }

    if (!orders || orders.length === 0) {
      return NextResponse.json({
        rankings: [],
        myRank: null,
      });
    }

    // 紹介リンクからcreator_idを取得
    const affiliateLinkIds = [
      ...new Set(orders.map((o) => o.affiliate_link_id).filter(Boolean)),
    ];

    const { data: affiliateLinks } = await supabaseAdmin
      .from("affiliate_links")
      .select("id, creator_id")
      .in("id", affiliateLinkIds);

    // affiliate_link_id -> creator_id のマップを作成
    const linkToCreatorMap = new Map<string, string>();
    affiliateLinks?.forEach((link) => {
      linkToCreatorMap.set(link.id, link.creator_id);
    });

    // creator_idごとに売上を集計
    const creatorStats = new Map<
      string,
      { totalSales: number; orderCount: number }
    >();

    orders.forEach((order) => {
      if (!order.affiliate_link_id) return;

      const creatorId = linkToCreatorMap.get(order.affiliate_link_id);
      if (!creatorId) return;

      const current = creatorStats.get(creatorId) || {
        totalSales: 0,
        orderCount: 0,
      };

      current.totalSales += order.amount || 0;
      current.orderCount += 1;
      creatorStats.set(creatorId, current);
    });

    // ランキングに変換（売上順）
    const rankings = Array.from(creatorStats.entries())
      .map(([creatorId, stats]) => ({
        creatorId,
        totalSales: stats.totalSales,
        orderCount: stats.orderCount,
        estimatedCommission: Math.floor(stats.totalSales * 0.3), // 30%の報酬率を仮定
      }))
      .sort((a, b) => b.totalSales - a.totalSales)
      .slice(0, 20) // 上位20名
      .map((item, index) => ({
        ...item,
        rank: index + 1,
      }));

    // 現在のユーザーの順位を取得
    const myRankIndex = rankings.findIndex(
      (r) => r.creatorId === user.id
    );
    const myRank = myRankIndex >= 0 ? myRankIndex + 1 : null;

    return NextResponse.json({
      rankings: rankings.map((r) => ({
        creatorId: r.creatorId,
        referrer: r.creatorId, // 後方互換性のため
        totalSales: r.totalSales,
        estimatedCommission: r.estimatedCommission,
        rank: r.rank,
      })),
      myRank,
    });
  } catch (error: any) {
    return internalServerError(
      error.message || "Failed to fetch rankings"
    );
  }
}

