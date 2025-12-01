import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Affiliate Links Create API Route
 * クリエイターが商品に参加する際に紹介リンクを生成
 */
export async function POST(request: NextRequest) {
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

    // Check authentication
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check role (creator or influencer only)
    const userRole = user.user_metadata?.role;
    if (userRole !== "creator" && userRole !== "influencer") {
      return NextResponse.json(
        { error: "Creator access required" },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { product_id } = body;

    if (!product_id) {
      return NextResponse.json(
        { error: "product_id is required" },
        { status: 400 }
      );
    }

    // 1. 商品が存在し、公開されているか確認
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, status")
      .eq("id", product_id)
      .eq("status", "active")
      .single();

    if (productError || !product) {
      return NextResponse.json(
        { error: "Product not found or not active" },
        { status: 404 }
      );
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
      return NextResponse.json(
        { error: "Failed to generate unique affiliate code" },
        { status: 500 }
      );
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
      // 本番環境では詳細なエラー情報をログに出力しない（セキュリティ）
      if (process.env.NODE_ENV === "development") {
        console.error("Affiliate link insert error:", insertError);
      }
      return NextResponse.json(
        { error: "Failed to create affiliate link" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        affiliate_code: insertedLink.affiliate_code,
        message: "Affiliate link created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    // 本番環境では詳細なエラー情報をログに出力しない（セキュリティ）
    if (process.env.NODE_ENV === "development") {
      console.error("Affiliate link create API error:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

