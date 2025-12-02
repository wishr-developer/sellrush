import { NextRequest, NextResponse } from "next/server";
import { createApiSupabaseClient } from "@/lib/supabase-server";
import {
  unauthorizedError,
  internalServerError,
} from "@/lib/api-error";
import type { Tournament } from "@/lib/arena/types";

/**
 * Arena Tournaments API Route
 * 
 * アクセス権限:
 * - 認証済みユーザー: 全トーナメントを閲覧可能
 * - 未認証ユーザー: アクセス不可（将来は公開APIに変更可能）
 * 
 * クエリパラメータ:
 * - status (任意): 'live' | 'scheduled' | 'finished'
 * - product_id (任意): 特定商品のトーナメントをフィルタ
 * 
 * RLS前提:
 * - tournaments テーブルは MVP では RLS を無効化（API Route 側でロールチェック）
 * - 将来的には RLS ポリシーを追加予定
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createApiSupabaseClient(request);

    // 認証チェック（MVPでは認証必須）
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return unauthorizedError("Authentication required to view tournaments");
    }

    // クエリパラメータを取得
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const productId = searchParams.get("product_id");

    // トーナメント一覧を取得
    let query = supabase
      .from("tournaments")
      .select("*")
      .order("start_at", { ascending: false });

    // status でフィルタ
    if (status && ["scheduled", "live", "finished"].includes(status)) {
      query = query.eq("status", status);
    }

    // product_id でフィルタ
    if (productId) {
      query = query.eq("product_id", productId);
    }

    const { data: tournaments, error: tournamentsError } = await query;

    if (tournamentsError) {
      // 本番環境では詳細なエラー情報をログに出力しない（セキュリティ）
      if (process.env.NODE_ENV === "development") {
        console.error("Tournaments fetch error:", tournamentsError);
      }
      return internalServerError("Failed to fetch tournaments");
    }

    // 型変換（Supabase の snake_case を camelCase に変換）
    const formattedTournaments: Tournament[] = (tournaments || []).map((t) => ({
      id: t.id,
      slug: t.slug,
      title: t.title,
      description: t.description,
      status: t.status as Tournament["status"],
      startAt: t.start_at,
      endAt: t.end_at,
      productId: t.product_id,
      createdBy: t.created_by,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
    }));

    return NextResponse.json({ tournaments: formattedTournaments });
  } catch (error: any) {
    // 本番環境では詳細なエラー情報をログに出力しない（セキュリティ）
    if (process.env.NODE_ENV === "development") {
      console.error("Tournaments API error:", error);
    }
    return internalServerError(
      error.message || "Failed to fetch tournaments"
    );
  }
}

