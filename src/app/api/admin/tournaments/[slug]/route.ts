import { NextRequest, NextResponse } from "next/server";
import { createApiSupabaseClient } from "@/lib/supabase-server";
import {
  unauthorizedError,
  forbiddenError,
  notFoundError,
  validationError,
  internalServerError,
} from "@/lib/api-error";
import type { TournamentWithProduct } from "@/lib/arena/types";

/**
 * Admin Tournament Detail API Route
 * 
 * アクセス権限:
 * - admin ロールのみアクセス可能
 * 
 * エンドポイント:
 * - GET /api/admin/tournaments/[slug] - トーナメント詳細
 * - PATCH /api/admin/tournaments/[slug] - トーナメント更新
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

    // 認証チェック
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return unauthorizedError("Authentication required");
    }

    // ロールチェック: admin ロールのみ
    if (user.user_metadata?.role !== "admin") {
      return forbiddenError("Admin access required");
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
      console.error("Admin tournament detail API error:", error);
    }
    return internalServerError(
      error.message || "Failed to fetch tournament"
    );
  }
}

/**
 * トーナメント更新
 * 
 * リクエストボディ（すべてオプション）:
 * - title?: string
 * - description?: string | null
 * - status?: 'scheduled' | 'live' | 'finished'
 * - startAt?: string (ISO 8601)
 * - endAt?: string (ISO 8601)
 * - productId?: string | null (UUID)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const supabase = createApiSupabaseClient(request);

    // 認証チェック
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return unauthorizedError("Authentication required");
    }

    // ロールチェック: admin ロールのみ
    if (user.user_metadata?.role !== "admin") {
      return forbiddenError("Admin access required");
    }

    const { slug } = await params;

    if (!slug) {
      return notFoundError("Tournament slug is required");
    }

    // トーナメントが存在するか確認
    const { data: existingTournament, error: fetchError } = await supabase
      .from("tournaments")
      .select("id")
      .eq("slug", slug)
      .single();

    if (fetchError || !existingTournament) {
      return notFoundError("Tournament not found");
    }

    // リクエストボディを取得
    const body = await request.json();
    const { title, description, status, startAt, endAt, productId } = body;

    // 更新データを構築（undefined のフィールドは更新しない）
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) {
      if (!["scheduled", "live", "finished"].includes(status)) {
        return validationError("Invalid status value");
      }
      updateData.status = status;
    }
    if (startAt !== undefined) updateData.start_at = startAt;
    if (endAt !== undefined) updateData.end_at = endAt;
    if (productId !== undefined) updateData.product_id = productId || null;

    // 日付のバリデーション（startAt と endAt の両方が更新される場合）
    if (updateData.start_at && updateData.end_at) {
      const startDate = new Date(updateData.start_at);
      const endDate = new Date(updateData.end_at);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return validationError("Invalid date format");
      }

      if (endDate <= startDate) {
        return validationError("endAt must be after startAt");
      }
    } else if (updateData.start_at) {
      // startAt のみ更新される場合、既存の endAt と比較
      const startDate = new Date(updateData.start_at);
      const { data: currentTournament } = await supabase
        .from("tournaments")
        .select("end_at")
        .eq("slug", slug)
        .single();

      if (currentTournament?.end_at) {
        const endDate = new Date(currentTournament.end_at);
        if (endDate <= startDate) {
          return validationError("endAt must be after startAt");
        }
      }
    } else if (updateData.end_at) {
      // endAt のみ更新される場合、既存の startAt と比較
      const endDate = new Date(updateData.end_at);
      const { data: currentTournament } = await supabase
        .from("tournaments")
        .select("start_at")
        .eq("slug", slug)
        .single();

      if (currentTournament?.start_at) {
        const startDate = new Date(currentTournament.start_at);
        if (endDate <= startDate) {
          return validationError("endAt must be after startAt");
        }
      }
    }

    // トーナメントを更新
    const { data: tournament, error: updateError } = await supabase
      .from("tournaments")
      .update(updateData)
      .eq("slug", slug)
      .select()
      .single();

    if (updateError) {
      // 本番環境では詳細なエラー情報をログに出力しない（セキュリティ）
      if (process.env.NODE_ENV === "development") {
        console.error("Tournament update error:", updateError);
      }
      return internalServerError("Failed to update tournament");
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
      console.error("Admin tournament update API error:", error);
    }
    return internalServerError(
      error.message || "Failed to update tournament"
    );
  }
}

