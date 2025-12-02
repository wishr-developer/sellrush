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
 * Orders Create API Route
 * Creates a new order for the authenticated creator
 * RLS ensures only creator_id === auth.uid() can insert
 * 
 * Rate Limit: 10 requests / 1 minute per user
 * 目的: 誤操作・BOT・連打によるDB負荷・不正INSERTを防ぐ
 */
export async function POST(request: NextRequest) {
  // Rate Limit Check (処理冒頭で判定)
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0] ||
    request.headers.get("x-real-ip") ||
    "unknown";
  
  // 認証前にIPベースでチェック（認証失敗時も制限）
  const preAuthCheck = checkRateLimit(null, ip, "/api/orders/create", 10, 60 * 1000);
  if (!preAuthCheck.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  try {
    // Create server client
    const supabase = createApiSupabaseClient(request);

    // Check authentication
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate Limit Check (認証後、user.id ベースで再チェック)
    const rateLimitCheck = checkRateLimit(
      user.id,
      ip,
      "/api/orders/create",
      10, // 10 requests
      60 * 1000 // 1 minute
    );

    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { product_id, amount, affiliate_code } = body;

    // Validate required fields
    if (!product_id || !amount) {
      return NextResponse.json(
        { error: "product_id and amount are required" },
        { status: 400 }
      );
    }

    // Validate amount is a positive number
    if (typeof amount !== "number" || amount <= 0) {
      return NextResponse.json(
        { error: "amount must be a positive number" },
        { status: 400 }
      );
    }

    // affiliate_code から affiliate_link_id を取得
    let affiliateLinkId: string | null = null;
    let creatorId: string = user.id; // デフォルトはログインユーザー

    if (affiliate_code) {
      const { data: affiliateLink, error: linkError } = await supabase
        .from("affiliate_links")
        .select("id, creator_id, product_id")
        .eq("affiliate_code", affiliate_code)
        .eq("product_id", product_id)
        .single();

      if (!linkError && affiliateLink) {
        affiliateLinkId = affiliateLink.id;
        creatorId = affiliateLink.creator_id; // 紹介リンクの所有者を creator_id に設定
      }
    }

    // Insert order with creator_id and affiliate_link_id
    // RLS will ensure only creator_id === auth.uid() can insert (ただし、紹介リンク経由の場合は例外)
    const { data, error } = await supabase
      .from("orders")
      .insert({
        product_id,
        creator_id: creatorId,
        amount,
        status: "completed",
        source: "demo",
        affiliate_link_id: affiliateLinkId,
      })
      .select()
      .single();

    if (error) {
      // 本番環境では詳細なエラー情報をログに出力しない（セキュリティ）
      // ユーザーには一般化されたメッセージを返す
      if (process.env.NODE_ENV === "development") {
        console.error("Order creation error:", error);
      }
      return NextResponse.json(
        { error: "Failed to create order" },
        { status: 500 }
      );
    }

    // 不正検知を実行（非同期、エラーは無視）
    // セキュリティ: 内部呼び出しとして x-internal-call ヘッダーを付与
    if (data && data.status === "completed") {
      fetch(`${request.nextUrl.origin}/api/fraud/detect`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-call": "true", // 内部呼び出しとして識別
          Cookie: request.headers.get("cookie") || "",
        },
        body: JSON.stringify({ order_id: data.id }),
      }).catch((err) => {
        // 本番環境では詳細なエラー情報をログに出力しない（非ブロッキング処理）
        if (process.env.NODE_ENV === "development") {
          console.error("Fraud detection error (non-blocking):", err);
        }
      });
    }

    return NextResponse.json(
      {
        success: true,
        order: data,
      },
      { status: 201 }
    );
  } catch (error) {
    // 本番環境では詳細なエラー情報をログに出力しない（セキュリティ）
    if (process.env.NODE_ENV === "development") {
      console.error("Orders create API error:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

