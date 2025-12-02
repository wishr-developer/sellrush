import { NextRequest, NextResponse } from "next/server";
import { validateStripeCheckoutEnv } from "@/lib/env";
import { createApiSupabaseClient } from "@/lib/supabase-server";
import {
  configurationError,
  unauthorizedError,
  forbiddenError,
  validationError,
  notFoundError,
  internalServerError,
} from "@/lib/api-error";

/**
 * Affiliate Links Create API Route
 * クリエイターが商品に参加する際に紹介リンクを生成
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

    // Create server client
    const supabase = createApiSupabaseClient(request);

    // Check authentication
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return unauthorizedError();
    }

    // Check role (creator or influencer only)
    const userRole = user.user_metadata?.role;
    if (userRole !== "creator" && userRole !== "influencer") {
      return forbiddenError("Creator access required");
    }

    // Parse request body
    const body = await request.json();
    const { product_id } = body;

    if (!product_id) {
      return validationError("product_id is required");
    }

    // 1. 商品が存在し、公開されているか確認
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, status")
      .eq("id", product_id)
      .eq("status", "active")
      .single();

    if (productError || !product) {
      return notFoundError("Product not found or not active");
    }

    // 2. 既存の紹介リンクを確認（重複防止）- status = 'active' のみ
    const { data: existingLink } = await supabase
      .from("affiliate_links")
      .select("id, affiliate_code")
      .eq("product_id", product_id)
      .eq("creator_id", user.id)
      .eq("status", "active")
      .single();

    if (existingLink) {
      // 既に存在する場合は既存のコードを返す
      return NextResponse.json(
        {
          success: true,
          affiliate_code: existingLink.affiliate_code,
          message: "Affiliate link already exists",
        },
        { status: 200 }
      );
    }

    // 3. 紹介コードを生成（UUIDの短縮版またはランダム文字列）
    const generateAffiliateCode = (): string => {
      // 8文字のランダム文字列を生成
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      let code = "";
      for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return code;
    };

    let affiliateCode = generateAffiliateCode();
    let attempts = 0;
    const maxAttempts = 10;

    // ユニークなコードを生成（重複チェック）
    while (attempts < maxAttempts) {
      const { data: existing } = await supabase
        .from("affiliate_links")
        .select("id")
        .eq("affiliate_code", affiliateCode)
        .single();

      if (!existing) {
        break; // ユニークなコードが見つかった
      }

      affiliateCode = generateAffiliateCode();
      attempts++;
    }

    if (attempts >= maxAttempts) {
      return internalServerError("Failed to generate unique affiliate code");
    }

    // 4. affiliate_links テーブルに挿入
    const { data: insertedLink, error: insertError } = await supabase
      .from("affiliate_links")
      .insert({
        product_id,
        creator_id: user.id,
        affiliate_code: affiliateCode,
        status: "active",
      })
      .select("id, affiliate_code")
      .single();

    if (insertError) {
      return internalServerError("Failed to create affiliate link");
    }

    return NextResponse.json(
      {
        success: true,
        affiliate_code: insertedLink.affiliate_code,
        message: "Affiliate link created successfully",
      },
      { status: 201 }
    );
  } catch (error: any) {
    return internalServerError(
      error.message || "Failed to create affiliate link"
    );
  }
}

