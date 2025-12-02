import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { validateWebhookEnv } from "@/lib/env";
import { createAdminSupabaseClient } from "@/lib/supabase-server";
import {
  configurationError,
  validationError,
  internalServerError,
} from "@/lib/api-error";
import { calculateRevenueShareFromProduct } from "@/lib/revenue-share";

/**
 * Stripe Webhook Handler
 * 
 * 処理内容:
 * 1. Stripe の署名検証
 * 2. checkout.session.completed イベントを受け取る
 * 3. metadata から情報を取得
 * 4. orders テーブルにレコードを作成
 * 5. payouts を自動生成
 * 
 * TODO: 将来的に payment_logs テーブルを作成して、失敗時のログも記録する
 */
/**
 * Next.js App Router では、route handler で body を読み取る際に
 * request.body が既に消費されている可能性があるため、
 * このエンドポイントは middleware で body をバイパスする必要がある。
 * 
 * 注意: Next.js の route handler では、body を一度しか読み取れないため、
 * Webhook の署名検証のために body を text() で取得する必要がある。
 */
export async function POST(request: NextRequest) {
  try {
    // 環境変数のバリデーション
    const envValidation = validateWebhookEnv();
    if (!envValidation.isValid) {
      return configurationError(
        "Please configure the required environment variables in Vercel settings.",
        envValidation.missing
      );
    }

    // Stripe 初期化
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY!;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2025-11-17.clover" as const,
    });

    // リクエストボディを取得（署名検証用）
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return validationError("Missing stripe-signature header");
    }

    // 署名検証
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      return validationError(
        `Webhook signature verification failed: ${err.message}`
      );
    }

    // Supabase 初期化（Service Role Key を使用して RLS をバイパス）
    // ⚠️ 重要: Webhook では Service Role Key が必須です
    // Service Role Key を使用することで、RLS (Row Level Security) をバイパスし、
    // 任意のテーブルにアクセスできます。Anon Key では RLS の制約により
    // Webhook 処理に必要な操作ができない可能性があります。
    const supabase = createAdminSupabaseClient();

    // checkout.session.completed イベントを処理
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      // metadata から情報を取得
      const metadata = session.metadata;
      if (!metadata) {
        return validationError("Missing metadata in checkout session");
      }

      const productId = metadata.product_id;
      const productName = metadata.product_name || "Unknown Product";
      const productPrice = parseInt(metadata.product_price || "0", 10);
      const ownerId = metadata.owner_id || null;
      const creatorShareRate = parseFloat(metadata.creator_share_rate || "0.25");
      const platformTakeRate = parseFloat(metadata.platform_take_rate || "0.15");
      const affiliateLinkId = metadata.affiliate_link_id || null;
      const creatorId = metadata.creator_id || null;

      if (!productId || !session.amount_total) {
        return validationError("Missing required fields in metadata");
      }

      // 注文金額（Stripe は最小単位で返すので、JPY の場合はそのまま使用）
      const amount = session.amount_total;

      // 冪等性の確保: stripe_session_id で既存の注文をチェック
      // Webhook の再送信時に重複して注文を作成しないようにする
      const { data: existingOrder } = await supabase
        .from("orders")
        .select("id, status")
        .eq("stripe_session_id", session.id)
        .single();

      let order: any = null;

      if (existingOrder) {
        // 既存の注文がある場合は、その注文を使用（冪等性の確保）
        order = existingOrder;
        // 本番環境ではログを出力しない（開発環境のみ）
        if (process.env.NODE_ENV === "development") {
          console.log(`Order already exists for session ${session.id}, skipping creation`);
        }
      } else {
        // 1. orders テーブルにレコードを作成
        const { data: newOrder, error: orderError } = await supabase
          .from("orders")
          .insert({
            product_id: productId,
            product_name: productName,
            price: productPrice,
            amount: amount,
            creator_id: creatorId,
            affiliate_link_id: affiliateLinkId,
            status: "completed",
            source: "stripe",
            payment_intent_id: session.payment_intent as string | null,
            stripe_session_id: session.id,
          })
          .select()
          .single();

        if (orderError) {
          // TODO: payment_logs テーブルを作成して、失敗時のログを記録する
          // 本番環境では詳細なエラー情報をログに出力しない（セキュリティ）
          if (process.env.NODE_ENV === "development") {
            console.error("Order creation error:", orderError);
          }
          return internalServerError("Failed to create order");
        }

        order = newOrder;
      }

      // 2. payouts を自動生成
      // Revenue Share 計算ロジックを統一関数を使用
      // 冪等性の確保: order_id で既存の payout をチェック
      if (order) {
        // 既存の payout をチェック（重複生成を防ぐ）
        const { data: existingPayout } = await supabase
          .from("payouts")
          .select("id")
          .eq("order_id", order.id)
          .single();

        if (existingPayout) {
          // 既存の payout がある場合はスキップ（冪等性の確保）
          // 本番環境ではログを出力しない（開発環境のみ）
          if (process.env.NODE_ENV === "development") {
            console.log(`Payout already exists for order ${order.id}, skipping creation`);
          }
        } else {
          // 新しい payout を作成
          const grossAmount = amount;
          const revenueShare = calculateRevenueShareFromProduct(
            grossAmount,
            creatorShareRate,
            platformTakeRate
          );

          const { error: payoutError } = await supabase
            .from("payouts")
            .insert({
              order_id: order.id,
              creator_id: creatorId,
              brand_id: ownerId,
              gross_amount: grossAmount,
              creator_amount: revenueShare.creatorAmount,
              platform_amount: revenueShare.platformAmount,
              brand_amount: revenueShare.brandAmount,
              status: "pending",
            });

          if (payoutError) {
            // 本番環境では詳細なエラー情報をログに出力しない（セキュリティ）
            if (process.env.NODE_ENV === "development") {
              console.error("Payout creation error:", payoutError);
            }
            // 注文は作成済みなので、エラーをログに記録するだけ
            // TODO: payment_logs テーブルに記録
          }
        }
      }

      return NextResponse.json(
        { success: true, order_id: order?.id },
        { status: 200 }
      );
    }

    // その他のイベントタイプは無視（ログのみ）
    // 将来の実装予定:
    // - payment_intent.succeeded: 現在は checkout.session.completed で十分
    // - payment_intent.payment_failed: orders.status = 'failed' に更新
    // - charge.refunded: orders.status = 'refunded' に更新、payouts の調整
    if (process.env.NODE_ENV === "development") {
      console.log(`Unhandled event type: ${event.type}`);
    }
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error: any) {
    return internalServerError(
      error.message || "Webhook processing failed"
    );
  }
}

