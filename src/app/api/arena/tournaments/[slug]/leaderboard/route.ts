import { NextRequest, NextResponse } from "next/server";
import { createApiSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase-server";
import {
  notFoundError,
  internalServerError,
} from "@/lib/api-error";
import { buildTournamentRankingFromOrders, getUserRankInTournament } from "@/lib/arena/ranking";
import type { Tournament, TournamentLeaderboardResponse } from "@/lib/arena/types";
import type { OrderRow } from "@/types/dashboard";

/**
 * Arena Tournament Leaderboard API Route
 * 
 * アクセス権限:
 * - 認証済みユーザー: ランキング + 自分の順位を閲覧可能
 * - 未認証ユーザー: ランキングのみ閲覧可能（自分の順位は null）
 * 
 * パスパラメータ:
 * - slug: トーナメントの slug
 * 
 * クエリパラメータ:
 * - limit (任意): 取得件数（デフォルト: 20）
 * 
 * RLS前提:
 * - tournaments テーブルは MVP では RLS を無効化
 * - orders テーブルは Service Role Key を使用して全件取得（RLSをバイパス）
 *   理由: トーナメントランキングは全参加者のデータが必要なため
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const supabase = createApiSupabaseClient(request);

    // 認証チェック（未認証でもアクセス可能）
    let userId: string | null = null;
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      userId = user?.id || null;
    } catch {
      // 認証エラーは無視（未認証でもアクセス可能）
    }

    const { slug } = await params;

    if (!slug) {
      return notFoundError("Tournament slug is required");
    }

    // クエリパラメータを取得
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    // トーナメントを取得
    const { data: tournament, error: tournamentError } = await supabase
      .from("tournaments")
      .select("*")
      .eq("slug", slug)
      .single();

    if (tournamentError || !tournament) {
      return notFoundError("Tournament not found");
    }

    // 型変換
    const formattedTournament: Tournament = {
      id: tournament.id,
      slug: tournament.slug,
      title: tournament.title,
      description: tournament.description,
      status: tournament.status as Tournament["status"],
      startAt: tournament.start_at,
      endAt: tournament.end_at,
      productId: tournament.product_id,
      createdBy: tournament.created_by,
      createdAt: tournament.created_at,
      updatedAt: tournament.updated_at,
    };

    // トーナメント期間中の注文を取得
    // Service Role Key を使用して RLS をバイパス（全参加者のデータが必要なため）
    const adminSupabase = createAdminSupabaseClient();

    const startAt = new Date(tournament.start_at);
    const endAt = new Date(tournament.end_at);

    let ordersQuery = adminSupabase
      .from("orders")
      .select("id, product_id, creator_id, amount, created_at, status")
      .eq("status", "completed")
      .gte("created_at", startAt.toISOString())
      .lte("created_at", endAt.toISOString());

    // 対象商品でフィルタ（product_id がある場合）
    if (tournament.product_id) {
      ordersQuery = ordersQuery.eq("product_id", tournament.product_id);
    }

    const { data: orders, error: ordersError } = await ordersQuery;

    if (ordersError) {
      // 本番環境では詳細なエラー情報をログに出力しない（セキュリティ）
      if (process.env.NODE_ENV === "development") {
        console.error("Orders fetch error:", ordersError);
      }
      return internalServerError("Failed to fetch orders");
    }

    // ランキングを構築
    const rankings = buildTournamentRankingFromOrders(
      (orders || []) as OrderRow[],
      formattedTournament
    );

    // 取得件数で制限
    const limitedRankings = rankings.slice(0, limit);

    // ユーザーの順位を取得（認証済みの場合）
    const myRank = userId
      ? getUserRankInTournament(rankings, userId)
      : null;

    const response: TournamentLeaderboardResponse = {
      tournament: formattedTournament,
      rankings: limitedRankings,
      myRank,
    };

    return NextResponse.json(response);
  } catch (error: any) {
    // 本番環境では詳細なエラー情報をログに出力しない（セキュリティ）
    if (process.env.NODE_ENV === "development") {
      console.error("Tournament leaderboard API error:", error);
    }
    return internalServerError(
      error.message || "Failed to fetch tournament leaderboard"
    );
  }
}

