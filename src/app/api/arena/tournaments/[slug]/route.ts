import { NextRequest, NextResponse } from "next/server";
import { createApiSupabaseClient } from "@/lib/supabase-server";
import {
  unauthorizedError,
  notFoundError,
  internalServerError,
} from "@/lib/api-error";
import type { TournamentWithProduct } from "@/lib/arena/types";

/**
 * Arena Tournament Detail API Route
 * 
 * アクセス権限:
 * - 認証済みユーザー: 全トーナメントを閲覧可能
 * - 未認証ユーザー: アクセス不可（将来は公開APIに変更可能）
 * 
 * パスパラメータ:
 * - slug: トーナメントの slug
 * 
 * RLS前提:
 * - tournaments テーブルは MVP では RLS を無効化（API Route 側でロールチェック）
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const supabase = createApiSupabaseClient(request);

    // 認証チェック（MVPでは認証必須）
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return unauthorizedError("Authentication required to view tournament");
    }

    const { slug } = await params;

    if (!slug) {
      return notFoundError("Tournament slug is required");
    }

    // トーナメントを取得
    const { data: tournament, error: tournamentError } = await supabase
      .from("tournaments")
      .select("*")
      .eq("slug", slug)
      .single();

    if (tournamentError || !tournament) {
      return notFoundError("Tournament not found");
    }

    // 商品情報を取得（product_id がある場合）
    let product = null;
    if (tournament.product_id) {
      const { data: productData } = await supabase
        .from("products")
        .select("id, name, price, image_url")
        .eq("id", tournament.product_id)
        .single();

      if (productData) {
        product = {
          id: productData.id,
          name: productData.name,
          price: productData.price,
          imageUrl: productData.image_url,
        };
      }
    }

    // 型変換
    const formattedTournament: TournamentWithProduct = {
      id: tournament.id,
      slug: tournament.slug,
      title: tournament.title,
      description: tournament.description,
      status: tournament.status as TournamentWithProduct["status"],
      startAt: tournament.start_at,
      endAt: tournament.end_at,
      productId: tournament.product_id,
      createdBy: tournament.created_by,
      createdAt: tournament.created_at,
      updatedAt: tournament.updated_at,
      product,
    };

    return NextResponse.json({ tournament: formattedTournament });
  } catch (error: any) {
    // 本番環境では詳細なエラー情報をログに出力しない（セキュリティ）
    if (process.env.NODE_ENV === "development") {
      console.error("Tournament detail API error:", error);
    }
    return internalServerError(
      error.message || "Failed to fetch tournament"
    );
  }
}

