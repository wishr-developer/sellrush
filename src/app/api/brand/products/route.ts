/**
 * Brand Products API Route
 * 
 * ロールチェック: brand または company のみアクセス可能
 * RLS前提: products テーブルは owner_id = auth.uid() で保護されている
 * 
 * エンドポイント:
 * - POST /api/brand/products - 商品を作成
 * - GET /api/brand/products - 商品一覧を取得（自分の商品のみ）
 */

import { NextRequest, NextResponse } from "next/server";
import { validateStripeCheckoutEnv } from "@/lib/env";
import { createApiSupabaseClient } from "@/lib/supabase-server";
import {
  configurationError,
  unauthorizedError,
  forbiddenError,
  validationError,
  internalServerError,
} from "@/lib/api-error";

/**
 * 商品を作成
 * RLS前提: owner_id = auth.uid() で自動設定される
 */
export async function POST(request: NextRequest) {
  try {
    // 環境変数のバリデーション
    const envValidation = validateStripeCheckoutEnv();
    if (!envValidation.isValid) {
      return configurationError(
        "Please configure the required environment variables.",
        envValidation.missing
      );
    }

    // Supabase クライアント作成
    const supabase = createApiSupabaseClient(request);

    // 認証チェック
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return unauthorizedError("Unauthorized");
    }

    // ロールチェック: brand または company のみ
    const userRole = user.user_metadata?.role;
    if (userRole !== "brand" && userRole !== "company") {
      return forbiddenError("Brand access required");
    }

    // リクエストボディを取得
    const body = await request.json();
    const {
      name,
      price,
      stock,
      status,
      company_name,
      image_url,
      description,
      creator_share_rate,
      platform_take_rate,
    } = body;

    // バリデーション
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return validationError("商品名は必須です");
    }

    if (name.length > 100) {
      return validationError("商品名は100文字以内で入力してください");
    }

    if (!price || typeof price !== "number" || price <= 0) {
      return validationError("価格は1円以上で入力してください");
    }

    if (price > 10000000) {
      return validationError("価格は10,000,000円以下で入力してください");
    }

    if (stock !== undefined && stock !== null) {
      if (typeof stock !== "number" || stock < 0) {
        return validationError("在庫数は0以上で入力してください");
      }
    }

    if (status && status !== "active" && status !== "inactive") {
      return validationError("ステータスは 'active' または 'inactive' である必要があります");
    }

    if (company_name && company_name.length > 100) {
      return validationError("企業名は100文字以内で入力してください");
    }

    if (description && description.length > 1000) {
      return validationError("説明は1000文字以内で入力してください");
    }

    if (image_url && typeof image_url === "string" && image_url.length > 0) {
      try {
        new URL(image_url);
      } catch {
        return validationError("有効なURLを入力してください");
      }
    }

    // 分配率のバリデーション
    const creatorRate = creator_share_rate !== undefined && creator_share_rate !== null
      ? Number(creator_share_rate)
      : 0.25;
    const platformRate = platform_take_rate !== undefined && platform_take_rate !== null
      ? Number(platform_take_rate)
      : 0.15;

    if (creatorRate < 0 || creatorRate > 1) {
      return validationError("クリエイター分配率は0〜1の間で入力してください");
    }

    if (platformRate < 0 || platformRate > 1) {
      return validationError("プラットフォーム分配率は0〜1の間で入力してください");
    }

    const totalRate = creatorRate + platformRate;
    if (totalRate > 1) {
      return validationError(
        "クリエイター分配率とプラットフォーム分配率の合計は1以下である必要があります"
      );
    }

    // 商品を作成
    // RLS前提: owner_id は自動的に auth.uid() が設定される
    const { data: product, error: insertError } = await supabase
      .from("products")
      .insert({
        name: name.trim(),
        price: Math.floor(price), // 整数に変換
        stock: stock !== undefined && stock !== null ? Math.floor(stock) : null,
        status: status || "active",
        company_name: company_name?.trim() || null,
        image_url: image_url?.trim() || null,
        description: description?.trim() || null,
        creator_share_rate: creatorRate,
        platform_take_rate: platformRate,
        owner_id: user.id, // RLS前提だが、明示的に設定
      })
      .select()
      .single();

    if (insertError) {
      console.error("Product creation error:", insertError);
      return internalServerError("商品の作成に失敗しました");
    }

    return NextResponse.json(
      {
        success: true,
        product,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Brand products API error:", error);
    return internalServerError(error.message || "Internal server error");
  }
}

/**
 * 商品一覧を取得
 * RLS前提: owner_id = auth.uid() の商品のみ取得可能
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

    // Supabase クライアント作成
    const supabase = createApiSupabaseClient(request);

    // 認証チェック
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return unauthorizedError("Unauthorized");
    }

    // ロールチェック: brand または company のみ
    const userRole = user.user_metadata?.role;
    if (userRole !== "brand" && userRole !== "company") {
      return forbiddenError("Brand access required");
    }

    // 商品一覧を取得
    // RLS前提: owner_id = auth.uid() の商品のみ取得可能
    const { data: products, error: fetchError } = await supabase
      .from("products")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });

    if (fetchError) {
      console.error("Products fetch error:", fetchError);
      return internalServerError("商品一覧の取得に失敗しました");
    }

    return NextResponse.json(
      {
        success: true,
        products: products || [],
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Brand products API error:", error);
    return internalServerError(error.message || "Internal server error");
  }
}

