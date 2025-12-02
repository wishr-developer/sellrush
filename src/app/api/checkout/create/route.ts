import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { validateStripeCheckoutEnv, serverEnv } from "@/lib/env";
import { createApiSupabaseClient } from "@/lib/supabase-server";
import {
  configurationError,
  validationError,
  notFoundError,
  internalServerError,
} from "@/lib/api-error";

/**
 * Stripe Checkout Session 作成 API
 * 
 * フロー:
 * 1. product_id と affiliate_code を受け取る
 * 2. Supabase で商品と紹介リンクを検証
 * 3. Stripe Checkout Session を作成
 * 4. metadata に必要な情報を埋め込む
 * 5. Checkout URL を返す
 */
export async function POST(request: NextRequest) {
  try {
    // 環境変数のバリデーション
    const envValidation = validateStripeCheckoutEnv();
    if (!envValidation.isValid) {
      return configurationError(
        "Please configure the required environment variables in Vercel settings.",
        envValidation.missing
      );
    }

    // Stripe 初期化
    const stripeSecretKey = serverEnv.stripeSecretKey!;
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2025-11-17.clover" as const,
    });

    // Supabase 初期化
    const supabase = createApiSupabaseClient(request);

    // リクエストボディを取得
    const body = await request.json();
    const { product_id, affiliate_code } = body;

    if (!product_id) {
      return validationError("product_id is required");
    }

    // 1. 商品を取得・検証
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, name, price, owner_id, creator_share_rate, platform_take_rate, status")
      .eq("id", product_id)
      .eq("status", "active")
      .single();

    if (productError || !product) {
      return notFoundError("Product not found or not active");
    }

    // 2. 紹介リンクを取得・検証（affiliate_code がある場合）
    let affiliateLinkId: string | null = null;
    let creatorId: string | null = null;

    if (affiliate_code) {
      const { data: affiliateLink, error: linkError } = await supabase
        .from("affiliate_links")
        .select("id, creator_id, product_id, status")
        .eq("affiliate_code", affiliate_code)
        .eq("product_id", product_id)
        .eq("status", "active")
        .single();

      if (linkError || !affiliateLink) {
        return validationError("Invalid affiliate link");
      }

      affiliateLinkId = affiliateLink.id;
      creatorId = affiliateLink.creator_id;
    }

    // 3. Stripe Checkout Session を作成
    const origin = request.headers.get("origin") || request.nextUrl.origin;
    const successUrl = `${origin}/purchase/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${origin}/purchase?product_id=${product_id}${affiliate_code ? `&affiliate=${affiliate_code}` : ""}`;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "jpy",
            product_data: {
              name: product.name,
            },
            unit_amount: product.price, // 金額は円単位（Stripeは最小単位で指定）
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        product_id: product.id,
        product_name: product.name,
        product_price: product.price.toString(),
        owner_id: product.owner_id || "",
        creator_share_rate: (product.creator_share_rate || 0.25).toString(),
        platform_take_rate: (product.platform_take_rate || 0.15).toString(),
        affiliate_link_id: affiliateLinkId || "",
        creator_id: creatorId || "",
      },
    });

    return NextResponse.json(
      {
        success: true,
        session_id: session.id,
        url: session.url,
      },
      { status: 200 }
    );
  } catch (error: any) {
    return internalServerError(
      error.message || "Failed to create checkout session"
    );
  }
}

