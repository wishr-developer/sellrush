import { NextRequest, NextResponse } from "next/server";
import { createApiSupabaseClient } from "@/lib/supabase-server";
import {
  unauthorizedError,
  forbiddenError,
  validationError,
  internalServerError,
} from "@/lib/api-error";
import type { Tournament } from "@/lib/arena/types";

/**
 * Admin Tournaments API Route
 * 
 * アクセス権限:
 * - admin ロールのみアクセス可能
 * 
 * エンドポイント:
 * - GET /api/admin/tournaments - トーナメント一覧（Admin view 用）
 * - POST /api/admin/tournaments - 新規トーナメント作成
 * 
 * RLS前提:
 * - tournaments テーブルは MVP では RLS を無効化（API Route 側でロールチェック）
 */
export async function GET(request: NextRequest) {
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
      console.error("Admin tournaments API error:", error);
    }
    return internalServerError(
      error.message || "Failed to fetch tournaments"
    );
  }
}

/**
 * 新規トーナメント作成
 * 
 * リクエストボディ:
 * - title: string (必須)
 * - slug: string (必須、ユニーク)
 * - description?: string
 * - status?: 'scheduled' | 'live' | 'finished' (デフォルト: 'scheduled')
 * - startAt: string (ISO 8601, 必須)
 * - endAt: string (ISO 8601, 必須)
 * - productId?: string (UUID)
 */
export async function POST(request: NextRequest) {
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

    // リクエストボディを取得
    const body = await request.json();
    const { title, slug, description, status, startAt, endAt, productId } = body;

    // バリデーション
    if (!title || !slug) {
      return validationError("title and slug are required");
    }

    if (!startAt || !endAt) {
      return validationError("startAt and endAt are required");
    }

    // 日付のバリデーション
    const startDate = new Date(startAt);
    const endDate = new Date(endAt);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return validationError("Invalid date format");
    }

    if (endDate <= startDate) {
      return validationError("endAt must be after startAt");
    }

    // slug の重複チェック
    const { data: existingTournament } = await supabase
      .from("tournaments")
      .select("id")
      .eq("slug", slug)
      .single();

    if (existingTournament) {
      return validationError("Tournament with this slug already exists");
    }

    // トーナメントを作成
    const { data: tournament, error: insertError } = await supabase
      .from("tournaments")
      .insert({
        title,
        slug,
        description: description || null,
        status: status || "scheduled",
        start_at: startAt,
        end_at: endAt,
        product_id: productId || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (insertError) {
      // 本番環境では詳細なエラー情報をログに出力しない（セキュリティ）
      if (process.env.NODE_ENV === "development") {
        console.error("Tournament creation error:", insertError);
      }
      return internalServerError("Failed to create tournament");
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

    return NextResponse.json(
      { tournament: formattedTournament },
      { status: 201 }
    );
  } catch (error: any) {
    // 本番環境では詳細なエラー情報をログに出力しない（セキュリティ）
    if (process.env.NODE_ENV === "development") {
      console.error("Admin tournament creation API error:", error);
    }
    return internalServerError(
      error.message || "Failed to create tournament"
    );
  }
}

