"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  Area,
  Bar,
  BarChart,
  ComposedChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type AuthState = "loading" | "authorized" | "unauthorized";

type KpiStats = {
  todayOrders: number;
  todayGmv: number;
  todayCompletionRate: number;
  pendingPayouts: number;
  unresolvedFraud: number;
  activeCreators30d: number;
};

type KpiErrors = {
  today?: boolean;
  payouts?: boolean;
  fraud?: boolean;
  activeCreators?: boolean;
};

type GuidanceLevel = "normal" | "warning" | "critical";

type AdminAlert = {
  id: string;
  code: string;
  title: string;
  message: string;
  severity: "info" | "warning" | "critical";
  entity_type: string | null;
  entity_id: string | null;
  detected_at: string;
  resolved: boolean;
  resolved_at: string | null;
};

// 30日トレンド用の型定義
type DailySeriesPoint = {
  date: string;
  gmv: number;
  orders: number;
};

type DailyPayoutPoint = {
  date: string;
  paid: number;
  pending: number;
};

type DailyFraudPoint = {
  date: string;
  high: number;
  medium: number;
  low: number;
};

// 健康度インジケータ用の型定義
type HealthStatus = "healthy" | "warning" | "critical";

/**
 * Admin ダッシュボード
 * - middleware では「未ログインブロック」のみ行い、
 *   role=admin のチェックと KPI 集計はこのコンポーネント側で行う。
 */
export default function AdminDashboardPage() {
  const router = useRouter();
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [kpi, setKpi] = useState<KpiStats>({
    todayOrders: 0,
    todayGmv: 0,
    todayCompletionRate: 0,
    pendingPayouts: 0,
    unresolvedFraud: 0,
    activeCreators30d: 0,
  });
  const [kpiErrors, setKpiErrors] = useState<KpiErrors>({});
  const [kpiLoading, setKpiLoading] = useState(true);
  const [guidanceLevel, setGuidanceLevel] =
    useState<GuidanceLevel>("normal");
  const [alerts, setAlerts] = useState<AdminAlert[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(true);

  // 30日トレンドデータ
  const [dailySeries, setDailySeries] = useState<DailySeriesPoint[]>([]);
  const [dailyPayouts, setDailyPayouts] = useState<DailyPayoutPoint[]>([]);
  const [dailyFraud, setDailyFraud] = useState<DailyFraudPoint[]>([]);
  const [trendLoading, setTrendLoading] = useState(true);

  // ヘッドライン用データ
  const [headline, setHeadline] = useState<string | null>(null);

  // 健康度インジケータ用データ
  const [healthData, setHealthData] = useState({
    sales: { completionRate: 0, gmvGrowth7d: 0, status: "healthy" as HealthStatus },
    payouts: { pendingAmount: 0, avgDelayDays: 0, status: "healthy" as HealthStatus },
    fraud: { unreviewedHigh: 0, count7d: 0, status: "healthy" as HealthStatus },
    creators: { active30d: 0, top3GmvPercent: 0, status: "healthy" as HealthStatus },
  });

  // 認証 + role=admin チェック（未ログインや一般ユーザーは /login に戻す）
  useEffect(() => {
    let mounted = true;

    const run = async () => {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (process.env.NODE_ENV === "development") {
          // 開発時のみ、admin 判定のログを出す（本番では出さない）
          // eslint-disable-next-line no-console
          console.log("🛠 admin page getUser", {
            hasUser: !!user,
            role: user?.user_metadata?.role,
            error,
          });
        }

        if (!mounted) return;

        if (!user) {
          setAuthState("unauthorized");
          router.replace("/login");
          return;
        }

        const role = user.user_metadata?.role;

        if (role === "admin") {
          setAuthState("authorized");
        } else {
          setAuthState("unauthorized");
          router.replace("/login");
        }
      } catch (e) {
        if (process.env.NODE_ENV === "development") {
          // eslint-disable-next-line no-console
          console.error("admin page auth error:", e);
        }
        if (!mounted) return;
        setAuthState("unauthorized");
        router.replace("/login");
      }
    };

    void run();

    return () => {
      mounted = false;
    };
  }, [router]);

  // KPI サマリーの取得（admin 認証後にのみ実行）
  useEffect(() => {
    if (authState !== "authorized") return;

    let cancelled = false;

    const fetchKpi = async () => {
      setKpiLoading(true);
      const nextKpi: KpiStats = {
        todayOrders: 0,
        todayGmv: 0,
        todayCompletionRate: 0,
        pendingPayouts: 0,
        unresolvedFraud: 0,
        activeCreators30d: 0,
      };
      const nextErrors: KpiErrors = {};
      let hasHighSeverityFraud = false;

      const now = new Date();
      // UTCベースで「今日の 00:00」を簡易算出（タイムゾーン厳密でなくてOK）
      const startOfToday = new Date(
        Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
      );
      const thirtyDaysAgo = new Date(
        Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) -
          29 * 24 * 60 * 60 * 1000
      );

      // 1. 今日の注文数 & GMV（全ステータスも取得して完了率計算用に）
      try {
        const [completedRes, allRes] = await Promise.all([
          supabase
            .from("orders")
            .select("amount, status, created_at")
            .eq("status", "completed")
            .gte("created_at", startOfToday.toISOString()),
          supabase
            .from("orders")
            .select("status, created_at")
            .gte("created_at", startOfToday.toISOString()),
        ]);

        if (completedRes.error) {
          if (process.env.NODE_ENV === "development") {
            // eslint-disable-next-line no-console
            console.error("Admin KPI: 今日の注文取得エラー", completedRes.error);
          }
          nextErrors.today = true;
        } else if (completedRes.data) {
          nextKpi.todayGmv = completedRes.data.reduce(
            (sum, o) => sum + (o.amount ?? 0),
            0
          );
        }

        // 完了率計算
        if (allRes.error) {
          if (process.env.NODE_ENV === "development") {
            // eslint-disable-next-line no-console
            console.error("Admin KPI: 今日の全注文取得エラー", allRes.error);
          }
        } else if (allRes.data) {
          nextKpi.todayOrders = allRes.data.length;
          const completed = allRes.data.filter(
            (o) => o.status === "completed"
          ).length;
          nextKpi.todayCompletionRate =
            allRes.data.length > 0 ? (completed / allRes.data.length) * 100 : 0;
        }
      } catch (e) {
        if (process.env.NODE_ENV === "development") {
          // eslint-disable-next-line no-console
          console.error("Admin KPI: 今日の注文取得例外", e);
        }
        nextErrors.today = true;
      }

      // 2. 未処理 Payout 件数
      try {
        const { data, error } = await supabase
          .from("payouts")
          .select("id, status")
          .in("status", ["pending", "approved"]);

        if (error) {
          if (process.env.NODE_ENV === "development") {
            // eslint-disable-next-line no-console
            console.error("Admin KPI: payouts 取得エラー", error);
          }
          nextErrors.payouts = true;
        } else if (data) {
          nextKpi.pendingPayouts = data.length;
        }
      } catch (e) {
        if (process.env.NODE_ENV === "development") {
          // eslint-disable-next-line no-console
          console.error("Admin KPI: payouts 取得例外", e);
        }
        nextErrors.payouts = true;
      }

      // 3. 未レビュー Fraud 件数（high / low / medium も取得してガイダンスに利用）
      try {
        const { data, error } = await supabase
          .from("fraud_flags")
          .select("id, reviewed, severity")
          .eq("reviewed", false);

        if (error) {
          if (process.env.NODE_ENV === "development") {
            // eslint-disable-next-line no-console
            console.error("Admin KPI: fraud_flags 取得エラー", error);
          }
          nextErrors.fraud = true;
        } else if (data) {
          nextKpi.unresolvedFraud = data.length;
          hasHighSeverityFraud = data.some(
            (f: { severity?: string | null }) => f.severity === "high"
          );
        }
      } catch (e) {
        if (process.env.NODE_ENV === "development") {
          // eslint-disable-next-line no-console
          console.error("Admin KPI: fraud_flags 取得例外", e);
        }
        nextErrors.fraud = true;
      }

      // 4. アクティブ Creator 数（直近30日）
      try {
        const { data, error } = await supabase
          .from("orders")
          .select("creator_id, status, created_at")
          .eq("status", "completed")
          .gte("created_at", thirtyDaysAgo.toISOString());

        if (error) {
          if (process.env.NODE_ENV === "development") {
            // eslint-disable-next-line no-console
            console.error("Admin KPI: active creators 取得エラー", error);
          }
          nextErrors.activeCreators = true;
        } else if (data) {
          const ids = new Set(
            data
              .map((o) => o.creator_id)
              .filter(
                (id) => typeof id === "string" && (id as string).length > 0
              )
          );
          nextKpi.activeCreators30d = ids.size;
        }
      } catch (e) {
        if (process.env.NODE_ENV === "development") {
          // eslint-disable-next-line no-console
          console.error("Admin KPI: active creators 取得例外", e);
        }
        nextErrors.activeCreators = true;
      }

      if (cancelled) return;

      // ガイダンスレベル判定
      let nextGuidance: GuidanceLevel = "normal";
      if (!nextErrors.fraud && hasHighSeverityFraud) {
        nextGuidance = "critical";
      } else if (
        !nextErrors.fraud &&
        !nextErrors.payouts &&
        (nextKpi.unresolvedFraud > 0 || nextKpi.pendingPayouts > 0)
      ) {
        nextGuidance = "warning";
      } else if (!nextErrors.payouts && nextKpi.pendingPayouts > 0) {
        nextGuidance = "warning";
      }

      setKpi(nextKpi);
      setKpiErrors(nextErrors);
      setKpiLoading(false);
      setGuidanceLevel(nextGuidance);
    };

    void fetchKpi();

    return () => {
      cancelled = true;
    };
  }, [authState]);

  // アラート一覧の取得（admin 認証後にのみ実行）
  useEffect(() => {
    if (authState !== "authorized") return;

    let cancelled = false;

    const fetchAlerts = async () => {
      setAlertsLoading(true);
      try {
        const { data, error } = await supabase
          .from("admin_alerts")
          .select("*")
          .eq("resolved", false)
          .order("detected_at", { ascending: false })
          .limit(10);

        if (error) {
          if (process.env.NODE_ENV === "development") {
            // eslint-disable-next-line no-console
            console.error("Admin Alerts: 取得エラー", error);
          }
        } else if (data) {
          if (!cancelled) {
            setAlerts(data as AdminAlert[]);
          }
        }
      } catch (e) {
        if (process.env.NODE_ENV === "development") {
          // eslint-disable-next-line no-console
          console.error("Admin Alerts: 取得例外", e);
        }
      } finally {
        if (!cancelled) {
          setAlertsLoading(false);
        }
      }
    };

    void fetchAlerts();

    return () => {
      cancelled = true;
    };
  }, [authState]);

  // 30日トレンドデータの取得（admin 認証後にのみ実行）
  useEffect(() => {
    if (authState !== "authorized") return;

    let cancelled = false;

    const fetchTrendData = async () => {
      setTrendLoading(true);
      const now = new Date();
      const thirtyDaysAgo = new Date(
        Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) -
          29 * 24 * 60 * 60 * 1000
      );

      try {
        // 1. Orders & GMV（日別集計）
        const { data: ordersData, error: ordersError } = await supabase
          .from("orders")
          .select("amount, status, created_at")
          .gte("created_at", thirtyDaysAgo.toISOString());

        if (ordersError) {
          if (process.env.NODE_ENV === "development") {
            // eslint-disable-next-line no-console
            console.error("Admin Trend: orders 取得エラー", ordersError);
          }
        } else if (ordersData) {
          // 日別集計
          const dailyMap = new Map<string, { gmv: number; orders: number }>();
          ordersData.forEach((o) => {
            const date = new Date(o.created_at);
            const dateKey = `${date.getFullYear()}-${String(
              date.getMonth() + 1
            ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

            const existing = dailyMap.get(dateKey) ?? { gmv: 0, orders: 0 };
            existing.orders += 1;
            if (o.status === "completed") {
              existing.gmv += o.amount ?? 0;
            }
            dailyMap.set(dateKey, existing);
          });

          // 30日分の配列を生成（データがない日は0で埋める）
          const series: DailySeriesPoint[] = [];
          for (let i = 29; i >= 0; i--) {
            const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            const dateKey = `${date.getFullYear()}-${String(
              date.getMonth() + 1
            ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
            const data = dailyMap.get(dateKey) ?? { gmv: 0, orders: 0 };
            series.push({
              date: dateKey,
              gmv: data.gmv,
              orders: data.orders,
            });
          }

          if (!cancelled) {
            setDailySeries(series);
          }
        }

        // 2. Payouts（日別集計）
        const { data: payoutsData, error: payoutsError } = await supabase
          .from("payouts")
          .select("status, created_at, gross_amount")
          .gte("created_at", thirtyDaysAgo.toISOString());

        if (payoutsError) {
          if (process.env.NODE_ENV === "development") {
            // eslint-disable-next-line no-console
            console.error("Admin Trend: payouts 取得エラー", payoutsError);
          }
        } else if (payoutsData) {
          const dailyMap = new Map<string, { paid: number; pending: number }>();
          payoutsData.forEach((p) => {
            const date = new Date(p.created_at ?? "");
            const dateKey = `${date.getFullYear()}-${String(
              date.getMonth() + 1
            ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

            const existing = dailyMap.get(dateKey) ?? { paid: 0, pending: 0 };
            if (p.status === "paid") {
              existing.paid += 1;
            } else if (p.status === "pending" || p.status === "approved") {
              existing.pending += 1;
            }
            dailyMap.set(dateKey, existing);
          });

          const payouts: DailyPayoutPoint[] = [];
          for (let i = 29; i >= 0; i--) {
            const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            const dateKey = `${date.getFullYear()}-${String(
              date.getMonth() + 1
            ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
            const data = dailyMap.get(dateKey) ?? { paid: 0, pending: 0 };
            payouts.push({
              date: dateKey,
              paid: data.paid,
              pending: data.pending,
            });
          }

          if (!cancelled) {
            setDailyPayouts(payouts);
          }
        }

        // 3. Fraud Flags（日別集計）
        const { data: fraudData, error: fraudError } = await supabase
          .from("fraud_flags")
          .select("severity, detected_at")
          .gte("detected_at", thirtyDaysAgo.toISOString());

        if (fraudError) {
          if (process.env.NODE_ENV === "development") {
            // eslint-disable-next-line no-console
            console.error("Admin Trend: fraud_flags 取得エラー", fraudError);
          }
        } else if (fraudData) {
          const dailyMap = new Map<
            string,
            { high: number; medium: number; low: number }
          >();
          fraudData.forEach((f) => {
            const date = new Date(f.detected_at ?? "");
            const dateKey = `${date.getFullYear()}-${String(
              date.getMonth() + 1
            ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

            const existing =
              dailyMap.get(dateKey) ?? { high: 0, medium: 0, low: 0 };
            const severity = f.severity ?? "low";
            if (severity === "high") existing.high += 1;
            else if (severity === "medium") existing.medium += 1;
            else existing.low += 1;
            dailyMap.set(dateKey, existing);
          });

          const fraud: DailyFraudPoint[] = [];
          for (let i = 29; i >= 0; i--) {
            const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            const dateKey = `${date.getFullYear()}-${String(
              date.getMonth() + 1
            ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
            const data = dailyMap.get(dateKey) ?? { high: 0, medium: 0, low: 0 };
            fraud.push({
              date: dateKey,
              high: data.high,
              medium: data.medium,
              low: data.low,
            });
          }

          if (!cancelled) {
            setDailyFraud(fraud);
          }
        }
      } catch (e) {
        if (process.env.NODE_ENV === "development") {
          // eslint-disable-next-line no-console
          console.error("Admin Trend: 取得例外", e);
        }
      } finally {
        if (!cancelled) {
          setTrendLoading(false);
        }
      }
    };

    void fetchTrendData();

    return () => {
      cancelled = true;
    };
  }, [authState]);

  // ヘッドライン計算（先週比 GMV）
  useEffect(() => {
    if (dailySeries.length === 0) return;

    const current7d = dailySeries.slice(-7);
    const prev7d = dailySeries.slice(-14, -7);

    const gmvCurrent7d = current7d.reduce((sum, d) => sum + d.gmv, 0);
    const gmvPrev7d = prev7d.reduce((sum, d) => sum + d.gmv, 0);

    if (gmvPrev7d > 0) {
      const diffPercent = ((gmvCurrent7d - gmvPrev7d) / gmvPrev7d) * 100;
      if (diffPercent > 0) {
        setHeadline(`今日の売上は先週比 +${diffPercent.toFixed(1)}% のペースです。`);
      } else {
        setHeadline(`今日の売上は先週比 ${diffPercent.toFixed(1)}% なので要注意です。`);
      }
    } else {
      setHeadline(null);
    }
  }, [dailySeries]);

  // 健康度インジケータデータの計算
  useEffect(() => {
    if (authState !== "authorized" || kpiLoading || trendLoading) return;

    let cancelled = false;

    const calculateHealth = async () => {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(
        Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) -
          29 * 24 * 60 * 60 * 1000
      );

      try {
        // 1. 売上ヘルス（完了率 + GMV成長率）
        const [current7dOrders, prev7dOrders] = await Promise.all([
          supabase
            .from("orders")
            .select("status, amount, created_at")
            .gte("created_at", sevenDaysAgo.toISOString()),
          supabase
            .from("orders")
            .select("status, amount, created_at")
            .gte("created_at", fourteenDaysAgo.toISOString())
            .lt("created_at", sevenDaysAgo.toISOString()),
        ]);

        let completionRate = 0;
        let gmvGrowth7d = 0;

        if (current7dOrders.data && current7dOrders.data.length > 0) {
          const total = current7dOrders.data.length;
          const completed = current7dOrders.data.filter(
            (o) => o.status === "completed"
          ).length;
          completionRate = (completed / total) * 100;
        }

        if (current7dOrders.data && prev7dOrders.data) {
          const currentGmv = current7dOrders.data
            .filter((o) => o.status === "completed")
            .reduce((sum, o) => sum + (o.amount ?? 0), 0);
          const prevGmv = prev7dOrders.data
            .filter((o) => o.status === "completed")
            .reduce((sum, o) => sum + (o.amount ?? 0), 0);

          if (prevGmv > 0) {
            gmvGrowth7d = ((currentGmv - prevGmv) / prevGmv) * 100;
          }
        }

        let salesStatus: HealthStatus = "healthy";
        if (completionRate < 50 || gmvGrowth7d < -20) {
          salesStatus = "critical";
        } else if (completionRate < 70 || gmvGrowth7d < 0) {
          salesStatus = "warning";
        }

        // 2. Payouts ヘルス（未処理金額 + 平均遅延日数）
        const { data: pendingPayouts } = await supabase
          .from("payouts")
          .select("gross_amount, created_at, status")
          .in("status", ["pending", "approved"]);

        let pendingAmount = 0;
        let avgDelayDays = 0;

        if (pendingPayouts) {
          pendingAmount = pendingPayouts.reduce(
            (sum, p) => sum + (p.gross_amount ?? 0),
            0
          );

          const delays = pendingPayouts
            .map((p) => {
              const created = new Date(p.created_at ?? "");
              const days = Math.floor(
                (now.getTime() - created.getTime()) / (24 * 60 * 60 * 1000)
              );
              return days;
            })
            .filter((d) => d >= 0);

          if (delays.length > 0) {
            avgDelayDays = delays.reduce((sum, d) => sum + d, 0) / delays.length;
          }
        }

        let payoutsStatus: HealthStatus = "healthy";
        if (pendingAmount > 1000000 || avgDelayDays > 7) {
          payoutsStatus = "critical";
        } else if (pendingAmount > 500000 || avgDelayDays > 3) {
          payoutsStatus = "warning";
        }

        // 3. Fraud ヘルス（未レビュー high + 直近7日件数）
        const { data: fraudData } = await supabase
          .from("fraud_flags")
          .select("severity, reviewed, detected_at")
          .gte("detected_at", sevenDaysAgo.toISOString());

        let unreviewedHigh = 0;
        let count7d = 0;

        if (fraudData) {
          count7d = fraudData.length;
          unreviewedHigh = fraudData.filter(
            (f) => f.severity === "high" && !f.reviewed
          ).length;
        }

        let fraudStatus: HealthStatus = "healthy";
        if (unreviewedHigh >= 3 || count7d > 20) {
          fraudStatus = "critical";
        } else if (unreviewedHigh >= 1 || count7d > 10) {
          fraudStatus = "warning";
        }

        // 4. Creator ヘルス（アクティブ数 + Top3集中度）
        const { data: creatorOrders } = await supabase
          .from("orders")
          .select("creator_id, amount, status, created_at")
          .eq("status", "completed")
          .gte("created_at", thirtyDaysAgo.toISOString());

        let active30d = 0;
        let top3GmvPercent = 0;

        if (creatorOrders) {
          const creatorGmvMap = new Map<string, number>();
          creatorOrders.forEach((o) => {
            if (o.creator_id) {
              const existing = creatorGmvMap.get(o.creator_id) ?? 0;
              creatorGmvMap.set(o.creator_id, existing + (o.amount ?? 0));
            }
          });

          active30d = creatorGmvMap.size;

          const sorted = Array.from(creatorGmvMap.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3);
          const top3Gmv = sorted.reduce((sum, [, gmv]) => sum + gmv, 0);
          const totalGmv = Array.from(creatorGmvMap.values()).reduce(
            (sum, gmv) => sum + gmv,
            0
          );

          if (totalGmv > 0) {
            top3GmvPercent = (top3Gmv / totalGmv) * 100;
          }
        }

        let creatorsStatus: HealthStatus = "healthy";
        if (active30d < 5 || top3GmvPercent > 80) {
          creatorsStatus = "critical";
        } else if (active30d < 10 || top3GmvPercent > 60) {
          creatorsStatus = "warning";
        }

        if (!cancelled) {
          setHealthData({
            sales: {
              completionRate,
              gmvGrowth7d,
              status: salesStatus,
            },
            payouts: {
              pendingAmount,
              avgDelayDays,
              status: payoutsStatus,
            },
            fraud: {
              unreviewedHigh,
              count7d,
              status: fraudStatus,
            },
            creators: {
              active30d,
              top3GmvPercent,
              status: creatorsStatus,
            },
          });
        }
      } catch (e) {
        if (process.env.NODE_ENV === "development") {
          // eslint-disable-next-line no-console
          console.error("Admin Health: 計算例外", e);
        }
      }
    };

    void calculateHealth();

    return () => {
      cancelled = true;
    };
  }, [authState, kpiLoading, trendLoading]);

  if (authState === "loading") {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-sm text-zinc-400">認証確認中...</p>
      </main>
    );
  }

  if (authState === "unauthorized") {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center px-4">
        <div className="text-center space-y-4 max-w-md">
          <h1 className="text-lg font-semibold">アクセス権限がありません</h1>
          <p className="text-sm text-zinc-400">
            管理者アカウントでないか、ログインセッションが無効です。
            再度ログインをお試しください。
          </p>
          <a
            href="/login"
            className="inline-flex items-center justify-center rounded-full bg-white px-6 py-2.5 text-xs font-semibold tracking-[0.18em] text-black shadow-[0_18px_40px_rgba(0,0,0,0.9)] transition hover:-translate-y-0.5 hover:bg-slate-50"
          >
            ログイン画面へ戻る
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">
        {/* ヘッダー */}
        <header>
          <h1 className="text-2xl font-semibold tracking-wide">
            SELL RUSH Admin Dashboard
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            プロダクト全体の状態を10秒で把握できるコックピット
          </p>
        </header>

        {/* 状態ガイダンスバー：異常状態を 3 段階で静かに示す */}
        {(() => {
          let bg = "bg-emerald-500/10 border-emerald-500/30";
          let text =
            "✅ 現在、確認が必要な異常はありません。";

          if (guidanceLevel === "critical") {
            bg = "bg-red-500/10 border-red-500/40";
            text =
              "🚨 高リスクの取引が検知されています。Fraud画面で内容を確認してください。";
          } else if (guidanceLevel === "warning") {
            bg = "bg-amber-500/10 border-amber-500/30";
            text =
              "⚠️ 確認待ちの取引があります。内容を確認してください。";
          }

          return (
            <section
              className={`rounded-xl border px-4 py-3 text-sm text-zinc-100 ${bg}`}
            >
              <p>{text}</p>
            </section>
          );
        })()}

        {/* A. アラート & ヘッドライン */}
        <section className="space-y-3">
          {/* アラート一覧 */}
          {alerts.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-xs font-semibold tracking-[0.18em] text-zinc-500 uppercase">
                Alerts
              </h2>
              <div className="space-y-2">
                {alerts.map((alert) => (
                  <AlertCard key={alert.id} alert={alert} />
                ))}
              </div>
            </div>
          )}

          {/* 今日のヘッドライン */}
          {headline && (
            <p className="text-xs text-zinc-400">{headline}</p>
          )}
        </section>

        {/* B. 今日のサマリー */}
        <section>
          <h2 className="mb-3 text-xs font-semibold tracking-[0.18em] text-zinc-500 uppercase">
            今日のサマリー
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <KpiCard
              label="今日の注文数"
              value={`${kpi.todayOrders.toLocaleString()} 件`}
              loading={kpiLoading}
              error={kpiErrors.today}
              description="本日の全注文数です。"
            />
            <KpiCard
              label="今日のGMV"
              value={`¥${kpi.todayGmv.toLocaleString()}`}
              loading={kpiLoading}
              error={kpiErrors.today}
              description="本日確定した売上金額です。"
            />
            <KpiCard
              label="今日の完了率"
              value={`${kpi.todayCompletionRate.toFixed(1)}%`}
              loading={kpiLoading}
              error={kpiErrors.today}
              description="本日の完了済み注文の割合です。"
            />
            <KpiCard
              label="未処理Payout件数"
              value={`${kpi.pendingPayouts.toLocaleString()} 件`}
              loading={kpiLoading}
              error={kpiErrors.payouts}
              description="承認または支払い待ちの件数です。"
            />
            <KpiCard
              label="未レビューFraud件数"
              value={`${kpi.unresolvedFraud.toLocaleString()} 件`}
              loading={kpiLoading}
              error={kpiErrors.fraud}
              description="確認待ちの不正検知フラグ数です。"
            />
            <KpiCard
              label="アクティブCreator数"
              value={`${kpi.activeCreators30d.toLocaleString()} 名`}
              loading={kpiLoading}
              error={kpiErrors.activeCreators}
              description="直近30日間で売上が発生したCreator数です。"
            />
          </div>
        </section>

        {/* C. 直近30日のミニグラフ群 */}
        <section>
          <h2 className="mb-3 text-xs font-semibold tracking-[0.18em] text-zinc-500 uppercase">
            直近30日トレンド
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* GMV & Orders */}
            <div className="rounded-2xl border border-white/10 bg-zinc-950/80 p-4">
              <p className="mb-2 text-xs font-semibold text-zinc-300">
                GMV & Orders
              </p>
              {trendLoading ? (
                <div className="h-[180px] flex items-center justify-center text-xs text-zinc-500">
                  読み込み中…
                </div>
              ) : dailySeries.length === 0 ? (
                <div className="h-[180px] flex items-center justify-center text-xs text-zinc-500">
                  直近30日のデータがありません
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <ComposedChart data={dailySeries}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(148,163,184,0.1)"
                    />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "#71717a", fontSize: 9 }}
                      tickFormatter={(value: string) => {
                        const parts = value.split("-");
                        if (parts.length === 3) {
                          return `${parts[1]}/${parts[2]}`;
                        }
                        return value;
                      }}
                    />
                    <YAxis
                      yAxisId="left"
                      tick={{ fill: "#71717a", fontSize: 9 }}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fill: "#71717a", fontSize: 9 }}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#020617",
                        border: "1px solid rgba(148,163,184,0.4)",
                        fontSize: 11,
                      }}
                      formatter={(value: number, name: string) => {
                        if (name === "gmv") {
                          return [`¥${value.toLocaleString()}`, "GMV"];
                        }
                        return [`${value} 件`, "Orders"];
                      }}
                    />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="gmv"
                      fill="#10b981"
                      fillOpacity={0.2}
                      stroke="#10b981"
                      strokeWidth={2}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="orders"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Payouts */}
            <div className="rounded-2xl border border-white/10 bg-zinc-950/80 p-4">
              <p className="mb-2 text-xs font-semibold text-zinc-300">
                Payouts
              </p>
              {trendLoading ? (
                <div className="h-[180px] flex items-center justify-center text-xs text-zinc-500">
                  読み込み中…
                </div>
              ) : dailyPayouts.length === 0 ? (
                <div className="h-[180px] flex items-center justify-center text-xs text-zinc-500">
                  直近30日のデータがありません
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={dailyPayouts}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(148,163,184,0.1)"
                    />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "#71717a", fontSize: 9 }}
                      tickFormatter={(value: string) => {
                        const parts = value.split("-");
                        if (parts.length === 3) {
                          return `${parts[1]}/${parts[2]}`;
                        }
                        return value;
                      }}
                    />
                    <YAxis tick={{ fill: "#71717a", fontSize: 9 }} />
                    <Tooltip
                      contentStyle={{
                        background: "#020617",
                        border: "1px solid rgba(148,163,184,0.4)",
                        fontSize: 11,
                      }}
                    />
                    <Bar dataKey="paid" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="pending" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Fraud Flags */}
            <div className="rounded-2xl border border-white/10 bg-zinc-950/80 p-4">
              <p className="mb-2 text-xs font-semibold text-zinc-300">
                Fraud Flags
              </p>
              {trendLoading ? (
                <div className="h-[180px] flex items-center justify-center text-xs text-zinc-500">
                  読み込み中…
                </div>
              ) : dailyFraud.length === 0 ? (
                <div className="h-[180px] flex items-center justify-center text-xs text-zinc-500">
                  直近30日のデータがありません
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={dailyFraud}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(148,163,184,0.1)"
                    />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "#71717a", fontSize: 9 }}
                      tickFormatter={(value: string) => {
                        const parts = value.split("-");
                        if (parts.length === 3) {
                          return `${parts[1]}/${parts[2]}`;
                        }
                        return value;
                      }}
                    />
                    <YAxis tick={{ fill: "#71717a", fontSize: 9 }} />
                    <Tooltip
                      contentStyle={{
                        background: "#020617",
                        border: "1px solid rgba(148,163,184,0.4)",
                        fontSize: 11,
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="high"
                      stroke="#ef4444"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="medium"
                      stroke="#f59e0b"
                      strokeWidth={1}
                      strokeOpacity={0.6}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="low"
                      stroke="#71717a"
                      strokeWidth={1}
                      strokeOpacity={0.4}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </section>

        {/* D. 健康度インジケータカード */}
        <section>
          <h2 className="mb-3 text-xs font-semibold tracking-[0.18em] text-zinc-500 uppercase">
            健康度インジケータ
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <HealthCard
              title="売上ヘルス"
              status={healthData.sales.status}
              items={[
                `完了率 ${healthData.sales.completionRate.toFixed(1)}%`,
                `直近7日の GMV 成長率 ${healthData.sales.gmvGrowth7d >= 0 ? "+" : ""}${healthData.sales.gmvGrowth7d.toFixed(1)}%`,
              ]}
              linkHref="/admin/orders"
              linkText="詳細を見る"
            />
            <HealthCard
              title="Payouts ヘルス"
              status={healthData.payouts.status}
              items={[
                `未処理 Payout 金額: ¥${healthData.payouts.pendingAmount.toLocaleString()}`,
                `平均遅延日数: ${healthData.payouts.avgDelayDays.toFixed(1)}日`,
              ]}
              linkHref="/admin/payouts"
              linkText="詳細を見る"
            />
            <HealthCard
              title="Fraud ヘルス"
              status={healthData.fraud.status}
              items={[
                `未レビュー high fraud: ${healthData.fraud.unreviewedHigh}件`,
                `直近7日間の fraud 件数: ${healthData.fraud.count7d}件`,
              ]}
              linkHref="/admin/security"
              linkText="詳細を見る"
            />
            <HealthCard
              title="Creator ヘルス"
              status={healthData.creators.status}
              items={[
                `アクティブ Creator 数（30日）: ${healthData.creators.active30d}名`,
                `Top3 Creator で GMV の ${healthData.creators.top3GmvPercent.toFixed(1)}%`,
              ]}
              linkHref="/admin/users"
              linkText="詳細を見る"
            />
          </div>
        </section>

      </div>
    </main>
  );
}

type KpiCardProps = {
  label: string;
  value: string;
  loading: boolean;
  error?: boolean;
  description: string;
};

/**
 * 単一 KPI カードコンポーネント（表示専用）
 */
function KpiCard({ label, value, loading, error, description }: KpiCardProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-950/80 px-4 py-3">
      <p className="text-xs text-zinc-400 mb-1">{label}</p>
      {loading ? (
        <p className="text-sm text-zinc-500">読み込み中…</p>
      ) : error ? (
        <p className="text-sm text-red-300">データ取得エラー</p>
      ) : (
        <p className="text-2xl font-semibold">{value}</p>
      )}
      <p className="mt-1 text-[11px] text-zinc-500">{description}</p>
    </div>
  );
}

type AlertCardProps = {
  alert: AdminAlert;
};

/**
 * アラートカードコンポーネント
 */
function AlertCard({ alert }: AlertCardProps) {
  // severity ごとの色分け
  const severityStyles = {
    info: "border-blue-500/30 bg-blue-500/10",
    warning: "border-amber-500/30 bg-amber-500/10",
    critical: "border-red-500/40 bg-red-500/10",
  };

  const severityIcons = {
    info: "ℹ️",
    warning: "⚠️",
    critical: "🚨",
  };

  // 相対時間の計算
  const getRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "たった今";
    if (diffMins < 60) return `${diffMins}分前`;
    if (diffHours < 24) return `${diffHours}時間前`;
    if (diffDays < 7) return `${diffDays}日前`;
    return date.toLocaleDateString("ja-JP", {
      month: "2-digit",
      day: "2-digit",
    });
  };

  return (
    <div
      className={`rounded-xl border px-4 py-3 text-sm ${severityStyles[alert.severity]}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-base">{severityIcons[alert.severity]}</span>
            <h3 className="font-semibold text-zinc-100">{alert.title}</h3>
          </div>
          <p className="text-xs text-zinc-300 mb-2">{alert.message}</p>
          <p className="text-[11px] text-zinc-500">
            {getRelativeTime(alert.detected_at)}
          </p>
        </div>
      </div>
    </div>
  );
}

type HealthCardProps = {
  title: string;
  status: HealthStatus;
  items: string[];
  linkHref: string;
  linkText: string;
};

/**
 * 健康度インジケータカードコンポーネント
 */
function HealthCard({
  title,
  status,
  items,
  linkHref,
  linkText,
}: HealthCardProps) {
  const statusStyles = {
    healthy: "border-emerald-500/30 bg-emerald-500/10",
    warning: "border-amber-500/30 bg-amber-500/10",
    critical: "border-red-500/40 bg-red-500/10",
  };

  const statusIcons = {
    healthy: "✅",
    warning: "⚠️",
    critical: "🚨",
  };

  return (
    <div
      className={`rounded-xl border px-4 py-3 text-sm ${statusStyles[status]}`}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-base">{statusIcons[status]}</span>
        <h3 className="font-semibold text-zinc-100">{title}</h3>
      </div>
      <div className="space-y-1 mb-3">
        {items.map((item, index) => (
          <p key={index} className="text-xs text-zinc-300">
            {item}
          </p>
        ))}
      </div>
      <a
        href={linkHref}
        className="inline-flex items-center text-[11px] text-zinc-400 hover:text-zinc-200 underline underline-offset-2"
      >
        {linkText} →
      </a>
    </div>
  );
}


