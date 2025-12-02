/**
 * 環境変数の一元管理とバリデーション
 * 
 * このファイルで全ての環境変数を型安全に管理し、
 * 起動時に必須環境変数の存在をチェックします。
 * 
 * 参考: Next.js 16 Environment Variables
 * https://nextjs.org/docs/app/building-your-application/configuring/environment-variables
 */

/**
 * 公開環境変数（クライアント側でも使用可能）
 * NEXT_PUBLIC_ プレフィックスが必要
 */
export const publicEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "https://sellrush.vercel.app",
  brandDashboardUrl: process.env.NEXT_PUBLIC_BRAND_DASHBOARD_URL ?? "http://localhost:3002/dashboard",
} as const;

/**
 * サーバー側のみの環境変数（クライアント側では使用不可）
 */
export const serverEnv = {
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
} as const;

/**
 * 環境変数のバリデーション結果
 */
type ValidationResult = {
  isValid: boolean;
  missing: string[];
  warnings: string[];
};

/**
 * 公開環境変数のバリデーション
 * クライアント側でも使用されるため、ビルド時にチェック
 */
export function validatePublicEnv(): ValidationResult {
  const missing: string[] = [];
  const warnings: string[] = [];

  if (!publicEnv.supabaseUrl) {
    missing.push("NEXT_PUBLIC_SUPABASE_URL");
  }

  if (!publicEnv.supabaseAnonKey) {
    missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  if (!publicEnv.siteUrl || publicEnv.siteUrl === "https://example.com") {
    warnings.push("NEXT_PUBLIC_SITE_URL is not set or using default value");
  }

  return {
    isValid: missing.length === 0,
    missing,
    warnings,
  };
}

/**
 * サーバー側環境変数のバリデーション
 * API Route や Server Components で使用
 */
export function validateServerEnv(): ValidationResult {
  const missing: string[] = [];
  const warnings: string[] = [];

  // Service Role Key は Webhook などで必須
  // ただし、全ての API Route で必要というわけではないため、
  // 使用する箇所で個別にチェックする
  if (!serverEnv.supabaseServiceRoleKey) {
    warnings.push("SUPABASE_SERVICE_ROLE_KEY is not set (required for webhook processing)");
  }

  if (!serverEnv.stripeSecretKey) {
    warnings.push("STRIPE_SECRET_KEY is not set (required for Stripe integration)");
  }

  if (!serverEnv.stripeWebhookSecret) {
    warnings.push("STRIPE_WEBHOOK_SECRET is not set (required for Stripe webhook verification)");
  }

  return {
    isValid: true, // サーバー側は警告のみ（必須ではない場合もある）
    missing: [],
    warnings,
  };
}

/**
 * Webhook 処理に必要な環境変数のバリデーション
 * Stripe Webhook では Service Role Key が必須
 */
export function validateWebhookEnv(): ValidationResult {
  const missing: string[] = [];

  if (!publicEnv.supabaseUrl) {
    missing.push("NEXT_PUBLIC_SUPABASE_URL");
  }

  if (!serverEnv.supabaseServiceRoleKey) {
    missing.push("SUPABASE_SERVICE_ROLE_KEY");
  }

  if (!serverEnv.stripeSecretKey) {
    missing.push("STRIPE_SECRET_KEY");
  }

  if (!serverEnv.stripeWebhookSecret) {
    missing.push("STRIPE_WEBHOOK_SECRET");
  }

  return {
    isValid: missing.length === 0,
    missing,
    warnings: [],
  };
}

/**
 * Stripe Checkout に必要な環境変数のバリデーション
 */
export function validateStripeCheckoutEnv(): ValidationResult {
  const missing: string[] = [];

  if (!publicEnv.supabaseUrl) {
    missing.push("NEXT_PUBLIC_SUPABASE_URL");
  }

  if (!publicEnv.supabaseAnonKey) {
    missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  if (!serverEnv.stripeSecretKey) {
    missing.push("STRIPE_SECRET_KEY");
  }

  return {
    isValid: missing.length === 0,
    missing,
    warnings: [],
  };
}

/**
 * 開発環境でのみ環境変数の状態をログ出力
 */
if (process.env.NODE_ENV === "development") {
  const publicResult = validatePublicEnv();
  const serverResult = validateServerEnv();

  if (!publicResult.isValid) {
    console.error("❌ Missing required public environment variables:", publicResult.missing);
  }

  if (serverResult.warnings.length > 0) {
    console.warn("⚠️  Server environment variable warnings:", serverResult.warnings);
  }

  if (publicResult.warnings.length > 0) {
    console.warn("⚠️  Public environment variable warnings:", publicResult.warnings);
  }
}

