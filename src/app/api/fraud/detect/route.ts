import { NextRequest, NextResponse } from "next/server";
import { createApiSupabaseClient } from "@/lib/supabase-server";

/**
 * Rate Limit Store (In-Memory)
 * Abuse / Rate ガード: 誤操作・BOT・連打から system を守る
 * key: `${userId}:${ip}:${endpoint}`
 * value: { count, firstRequestAt }
 */
const rateLimitStore = new Map<
  string,
  { count: number; firstRequestAt: number }
>();

/**
 * Rate Limit Check
 * 処理冒頭で判定し、無駄なDB処理を防ぐ
 */
function checkRateLimit(
  userId: string | null,
  ip: string,
  endpoint: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining?: number } {
  const key = `${userId || "anonymous"}:${ip}:${endpoint}`;
  const now = Date.now();
  const record = rateLimitStore.get(key);

  // 初回リクエスト or ウィンドウ超過
  if (!record || now - record.firstRequestAt >= windowMs) {
    rateLimitStore.set(key, { count: 1, firstRequestAt: now });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  // ウィンドウ内で制限超過
  if (record.count >= maxRequests) {
    // 開発環境でのみ警告を出力（本番では静かに制限）
    if (process.env.NODE_ENV === "development") {
      console.warn(`Rate limit hit: ${key}`);
    }
    return { allowed: false };
  }

  // ウィンドウ内でカウント増加
  record.count++;
  rateLimitStore.set(key, record);
  return { allowed: true, remaining: maxRequests - record.count };
}

/**
 * Fraud Detection API Route
 * orders INSERT 後に呼び出される
 * 不正検知ルールを実行し、fraud_flags に INSERT
 * 
 * Rate Limit: 20 requests / 5 minutes per user
 * 目的: 誤操作・BOT・連打によるDB負荷・fraud誤検知を防ぐ
 */
export async function POST(request: NextRequest) {
  // Rate Limit Check (処理冒頭で判定)
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0] ||
    request.headers.get("x-real-ip") ||
    "unknown";

  // 認証前にIPベースでチェック（認証失敗時も制限）
  const preAuthCheck = checkRateLimit(null, ip, "/api/fraud/detect", 20, 5 * 60 * 1000);
  if (!preAuthCheck.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: "Missing Supabase configuration" },
        { status: 500 }
      );
    }

    // Create server client
    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set() {
            // Not needed for POST requests
          },
          remove() {
            // Not needed for POST requests
          },
        },
      }
    );

    // user.id を取得（認証されていない場合は null）
    // セキュリティ要件: user.id が取れない場合は IP のみで制御
    let userId: string | null = null;
    let user: any = null;
    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      user = authUser;
      userId = authUser?.id || null;
    } catch {
      // 認証エラーでも処理を続行（IP のみで制御）
    }

    // 内部呼び出しチェック: fraud/detect は内部API
    // セキュリティ: 外部からの直接呼び出しを防ぐ（内部呼び出し or admin のみ許可）
    const internalCall =
      request.headers.get("x-internal-call") === "true";

    // 内部呼び出し or admin のみ許可
    if (!internalCall && user?.user_metadata?.role !== "admin") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Rate Limit Check (user.id ベース、取れない場合は IP のみ)
    const rateLimitCheck = checkRateLimit(
      userId,
      ip,
      "/api/fraud/detect",
      20, // 20 requests
      5 * 60 * 1000 // 5 minutes
    );

    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { order_id } = body;

    if (!order_id) {
      return NextResponse.json(
        { error: "order_id is required" },
        { status: 400 }
      );
    }

    // 1. order を取得
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, product_id, creator_id, amount, created_at, status")
      .eq("id", order_id)
      .single();

    if (orderError || !order) {
      // 本番環境では詳細なエラー情報をログに出力しない（セキュリティ）
      if (process.env.NODE_ENV === "development") {
        console.error("Order fetch error:", orderError);
      }
      return NextResponse.json(
        { error: "Failed to fetch order" },
        { status: 500 }
      );
    }

    // status が 'completed' でない場合はスキップ
    if (order.status !== "completed") {
      return NextResponse.json({
        success: true,
        message: "Order status is not completed, skipping fraud detection",
        flags: [],
      });
    }

    // 2. product から brand_id を取得
    const { data: product } = await supabase
      .from("products")
      .select("id, brand_id")
      .eq("id", order.product_id)
      .single();

    const brandId = product?.brand_id || null;

    // 3. 不正検知ルールを実行
    const flags: any[] = [];

    // A) 自己購入検知: creator_id === brand_id
    if (order.creator_id && brandId && order.creator_id === brandId) {
      flags.push({
        order_id: order.id,
        creator_id: order.creator_id,
        brand_id: brandId,
        reason: "Self-purchase detected (creator_id === brand_id)",
        severity: "high",
      });
    }

    // B) Burst orders 検知: 同一 creator が 5分以内に 5件以上
    if (order.creator_id) {
      const fiveMinutesAgo = new Date(
        new Date(order.created_at).getTime() - 5 * 60 * 1000
      ).toISOString();

      const { data: recentOrders } = await supabase
        .from("orders")
        .select("id")
        .eq("creator_id", order.creator_id)
        .eq("status", "completed")
        .gte("created_at", fiveMinutesAgo)
        .lte("created_at", order.created_at);

      if (recentOrders && recentOrders.length >= 5) {
        flags.push({
          order_id: order.id,
          creator_id: order.creator_id,
          brand_id: brandId,
          reason: `Burst orders detected (${recentOrders.length} orders in 5 minutes)`,
          severity: "medium",
        });
      }
    }

    // C) Amount anomaly 検知: 平均注文額から大幅乖離
    if (order.amount) {
      // 全 orders の平均額を計算
      const { data: allOrders } = await supabase
        .from("orders")
        .select("amount")
        .eq("status", "completed");

      if (allOrders && allOrders.length > 0) {
        const totalAmount = allOrders.reduce(
          (sum, o) => sum + (o.amount || 0),
          0
        );
        const avgAmount = totalAmount / allOrders.length;
        const threshold = avgAmount * 3; // 平均の3倍以上

        if (order.amount > threshold) {
          flags.push({
            order_id: order.id,
            creator_id: order.creator_id,
            brand_id: brandId,
            reason: `Amount anomaly detected (¥${order.amount.toLocaleString()} vs avg ¥${Math.floor(avgAmount).toLocaleString()})`,
            severity: "low",
          });
        }
      }
    }

    // 4. fraud_flags に INSERT
    if (flags.length > 0) {
      const { data: insertedFlags, error: insertError } = await supabase
        .from("fraud_flags")
        .insert(flags)
        .select();

      if (insertError) {
        // 本番環境では詳細なエラー情報をログに出力しない（セキュリティ）
        if (process.env.NODE_ENV === "development") {
          console.error("Fraud flags insert error:", insertError);
        }
        return NextResponse.json(
          {
            success: true,
            message: "Fraud detection completed but failed to save flags",
            flags: [],
            // 本番環境ではエラーメッセージを一般化
            error: process.env.NODE_ENV === "development" ? insertError.message : "Database error",
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `Detected ${flags.length} fraud flag(s)`,
        flags: insertedFlags || [],
      });
    }

    return NextResponse.json({
      success: true,
      message: "No fraud detected",
      flags: [],
    });
  } catch (error) {
    // 本番環境では詳細なエラー情報をログに出力しない（セキュリティ）
    if (process.env.NODE_ENV === "development") {
      console.error("Fraud detection API error:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

