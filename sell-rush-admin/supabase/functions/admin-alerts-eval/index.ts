// Supabase Edge Function: Admin Alerts Evaluation
// 
// この関数は、管理画面の各種指標を評価し、アラートを生成します。
// 
// 実行方法:
// 1. Supabase CLI でデプロイ: `supabase functions deploy admin-alerts-eval`
// 2. HTTP リクエストで実行: `POST https://<project-ref>.supabase.co/functions/v1/admin-alerts-eval`
// 3. Cron で定期実行する場合は、Supabase Dashboard の "Scheduled Functions" で設定
//
// Cron 設定例:
// - スケジュール: "0 9 * * *" (毎日 9:00 UTC)
// - HTTP メソッド: POST
// - URL: https://<project-ref>.supabase.co/functions/v1/admin-alerts-eval

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface AlertRule {
  code: string;
  title: string;
  message: string;
  severity: "info" | "warning" | "critical";
  entityType?: string | null;
  entityId?: string | null;
}

/**
 * ルール1: 完了率低下（Ordersページの指標）
 */
async function evaluateCompletionRate(
  supabase: any
): Promise<AlertRule | null> {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // 直近7日の注文を取得
  const { data: orders, error } = await supabase
    .from("orders")
    .select("status, created_at")
    .gte("created_at", sevenDaysAgo.toISOString());

  if (error || !orders || orders.length === 0) {
    return null;
  }

  const total = orders.length;
  const completed = orders.filter((o: any) => o.status === "completed").length;
  const completionRate = total > 0 ? (completed / total) * 100 : 0;

  if (completionRate < 50) {
    return {
      code: "orders_completion_rate_low",
      title: "完了率が極めて低い",
      message: `直近7日の完了率が ${completionRate.toFixed(1)}% です。通常の運営に支障が出る可能性があります。`,
      severity: "critical",
    };
  } else if (completionRate < 70) {
    return {
      code: "orders_completion_rate_low",
      title: "完了率が低下しています",
      message: `直近7日の完了率が ${completionRate.toFixed(1)}% です。注文処理の遅延やキャンセル増加の可能性があります。`,
      severity: "warning",
    };
  }

  return null;
}

/**
 * ルール2: キャンセル・保留の異常増加
 */
async function evaluateAbnormalPendingCancel(
  supabase: any
): Promise<AlertRule | null> {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const { data: orders, error } = await supabase
    .from("orders")
    .select("status, created_at")
    .gte("created_at", sevenDaysAgo.toISOString());

  if (error || !orders || orders.length === 0) {
    return null;
  }

  const total = orders.length;
  const cancelled = orders.filter((o: any) => o.status === "cancelled").length;
  const pending = orders.filter((o: any) => o.status === "pending").length;
  const abnormalRate = total > 0 ? ((cancelled + pending) / total) * 100 : 0;

  if (abnormalRate >= 30) {
    return {
      code: "orders_abnormal_pending_cancel",
      title: "キャンセル・保留率が異常に高い",
      message: `直近7日のキャンセル・保留率が ${abnormalRate.toFixed(1)}% です。システムや運営に問題が発生している可能性があります。`,
      severity: "critical",
    };
  } else if (abnormalRate > 20) {
    return {
      code: "orders_abnormal_pending_cancel",
      title: "キャンセル・保留が増加しています",
      message: `直近7日のキャンセル・保留率が ${abnormalRate.toFixed(1)}% です。注文処理の確認が必要です。`,
      severity: "warning",
    };
  }

  return null;
}

/**
 * ルール3: 高リスク Fraud の未レビュー
 */
async function evaluateUnreviewedFraud(
  supabase: any
): Promise<AlertRule | null> {
  const { data: fraudFlags, error } = await supabase
    .from("fraud_flags")
    .select("id, severity, reviewed")
    .eq("severity", "high")
    .eq("reviewed", false);

  if (error || !fraudFlags) {
    return null;
  }

  const count = fraudFlags.length;

  if (count >= 3) {
    return {
      code: "fraud_unreviewed_high",
      title: "高リスク不正検知が未レビューで蓄積",
      message: `高リスク（severity: high）の不正検知フラグが ${count} 件未レビューです。緊急に確認してください。`,
      severity: "critical",
    };
  } else if (count >= 1) {
    return {
      code: "fraud_unreviewed_high",
      title: "高リスク不正検知が未レビュー",
      message: `高リスク（severity: high）の不正検知フラグが ${count} 件未レビューです。確認をお願いします。`,
      severity: "warning",
    };
  }

  return null;
}

/**
 * ルール4: プラットフォーム取り分の低下（Payoutsページ）
 */
async function evaluatePlatformMargin(
  supabase: any
): Promise<AlertRule | null> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const { data: payouts, error } = await supabase
    .from("payouts")
    .select("gross_amount, platform_amount")
    .gte("created_at", thirtyDaysAgo.toISOString());

  if (error || !payouts || payouts.length === 0) {
    return null;
  }

  const totalGross = payouts.reduce(
    (sum: number, p: any) => sum + (Number(p.gross_amount) || 0),
    0
  );
  const totalPlatform = payouts.reduce(
    (sum: number, p: any) => sum + (Number(p.platform_amount) || 0),
    0
  );

  if (totalGross === 0) {
    return null;
  }

  const marginRatio = totalPlatform / totalGross;

  if (marginRatio < 0.15) {
    return {
      code: "payouts_platform_margin_low",
      title: "プラットフォーム取り分が極めて低い",
      message: `直近30日のプラットフォーム取り分率が ${(marginRatio * 100).toFixed(1)}% です。収益性に問題があります。`,
      severity: "critical",
    };
  } else if (marginRatio < 0.2) {
    return {
      code: "payouts_platform_margin_low",
      title: "プラットフォーム取り分が低下しています",
      message: `直近30日のプラットフォーム取り分率が ${(marginRatio * 100).toFixed(1)}% です。収益構造の見直しが必要です。`,
      severity: "warning",
    };
  }

  return null;
}

/**
 * アラートを upsert する（同じ code かつ未解決のレコードがあれば更新、なければ新規作成）
 */
async function upsertAlert(
  supabase: any,
  rule: AlertRule
): Promise<void> {
  // 既存の未解決アラートを検索
  const { data: existing, error: searchError } = await supabase
    .from("admin_alerts")
    .select("id, severity, message")
    .eq("code", rule.code)
    .eq("resolved", false)
    .limit(1)
    .single();

  if (searchError && searchError.code !== "PGRST116") {
    // PGRST116 は "not found" エラーなので無視
    console.error("Error searching for existing alert:", searchError);
    return;
  }

  if (existing) {
    // 既存レコードがある場合、severity や message に変化があれば更新
    if (
      existing.severity !== rule.severity ||
      existing.message !== rule.message
    ) {
      const { error: updateError } = await supabase
        .from("admin_alerts")
        .update({
          title: rule.title,
          message: rule.message,
          severity: rule.severity,
          entity_type: rule.entityType,
          entity_id: rule.entityId,
          detected_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (updateError) {
        console.error("Error updating alert:", updateError);
      }
    }
  } else {
    // 新規作成
    const { error: insertError } = await supabase.from("admin_alerts").insert({
      code: rule.code,
      title: rule.title,
      message: rule.message,
      severity: rule.severity,
      entity_type: rule.entityType,
      entity_id: rule.entityId,
      detected_at: new Date().toISOString(),
      resolved: false,
    });

    if (insertError) {
      console.error("Error inserting alert:", insertError);
    }
  }
}

serve(async (req) => {
  // CORS プリフライトリクエストの処理
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Supabase クライアントの初期化（サービスロールキーを使用）
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // 各ルールを評価
    const rules: (AlertRule | null)[] = await Promise.all([
      evaluateCompletionRate(supabase),
      evaluateAbnormalPendingCancel(supabase),
      evaluateUnreviewedFraud(supabase),
      evaluatePlatformMargin(supabase),
    ]);

    // アラートを upsert
    const alerts = rules.filter((r): r is AlertRule => r !== null);
    await Promise.all(alerts.map((rule) => upsertAlert(supabase, rule)));

    return new Response(
      JSON.stringify({
        success: true,
        evaluated: rules.length,
        alertsCreated: alerts.length,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in admin-alerts-eval:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

