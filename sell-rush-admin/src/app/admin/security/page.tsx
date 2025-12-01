"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type RangeKey = "7d" | "30d";

type FraudRow = {
  id: string;
  order_id?: string | null;
  creator_id?: string | null;
  brand_id?: string | null;
  severity?: string | null;
  reason?: string | null;
  detected_at?: string | null;
  reviewed?: boolean | null;
  reviewed_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  flags: string[];
};

type SeverityBucket = {
  severity: string;
  count: number;
};

/**
 * Admin Security 画面（不正検知状況の俯瞰）
 */
export default function AdminSecurityPage() {
  const [range, setRange] = useState<RangeKey>("30d");
  const [flags, setFlags] = useState<FraudRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchFlags = async () => {
      setLoading(true);
      setError(null);
      try {
        const now = new Date();
        let from: Date;
        if (range === "7d") {
          from = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
        } else {
          from = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
        }

        const { data, error: fetchError } = await supabase
          .from("fraud_flags")
          .select(
            "id, order_id, creator_id, brand_id, severity, reason, detected_at, reviewed, reviewed_at, created_at, updated_at"
          )
          .gte("detected_at", from.toISOString())
          .order("detected_at", { ascending: false })
          .limit(1000);

        if (fetchError) {
          if (process.env.NODE_ENV === "development") {
            // eslint-disable-next-line no-console
            console.error("Admin Security: fetch error", fetchError);
          }
          if (!cancelled) {
            setError("データ取得に失敗しました。");
            setFlags([]);
          }
          return;
        }

        if (!cancelled) {
          const mapped =
            (data as FraudRow[] | null)?.map((r) => ({
              ...r,
              flags: [],
            })) ?? [];
          setFlags(mapped);
        }
      } catch (e) {
        if (process.env.NODE_ENV === "development") {
          // eslint-disable-next-line no-console
          console.error("Admin Security: fetch exception", e);
        }
        if (!cancelled) {
          setError("データ取得中にエラーが発生しました。");
          setFlags([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void fetchFlags();

    return () => {
      cancelled = true;
    };
  }, [range]);

  const {
    kpi,
    buckets,
    dailyData,
    riskPatterns,
    flagsWithFlags,
    summaryMessage,
  } = useMemo(() => {
    if (flags.length === 0) {
      return {
        kpi: {
          openFraudFlags: 0,
          openHighSeverity: 0,
          last7dHighFlags: 0,
          last30dFlags: 0,
          reviewedRatio: 0,
          repeatedOrders: 0,
        },
        buckets: [],
        dailyData: [],
        riskPatterns: {
          repeatedOrderFlags: 0,
          repeatedCreatorHighFlags: 0,
        },
        flagsWithFlags: [],
        summaryMessage: "データがありません。",
      };
    }

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);

    let openFraudFlags = 0;
    let openHighSeverity = 0;
    let last7dHighFlags = 0;
    let last30dFlags = 0;
    let reviewedCount = 0;
    const severityMap = new Map<string, number>();
    const dailyMap = new Map<string, number>();
    const orderIdMap = new Map<string, number>();
    const creatorHighMap = new Map<string, number>();

    flags.forEach((f) => {
      const severity = f.severity ?? "unknown";
      const reviewed = !!f.reviewed;
      const detectedAt = f.detected_at
        ? new Date(f.detected_at)
        : f.created_at
        ? new Date(f.created_at)
        : null;

      // Open Fraud Flags
      if (!reviewed) {
        openFraudFlags += 1;
        if (severity === "high") {
          openHighSeverity += 1;
        }
      }

      // Reviewed Count
      if (reviewed) {
        reviewedCount += 1;
      }

      // Last 7 Days High Severity
      if (detectedAt && detectedAt >= sevenDaysAgo && severity === "high") {
        last7dHighFlags += 1;
      }

      // Last 30 Days Flags
      if (detectedAt && detectedAt >= thirtyDaysAgo) {
        last30dFlags += 1;
      }

      // Severity 分布
      severityMap.set(severity, (severityMap.get(severity) ?? 0) + 1);

      // 日別集計
      if (detectedAt) {
        const dayKey = `${detectedAt.getFullYear()}-${String(
          detectedAt.getMonth() + 1
        ).padStart(2, "0")}-${String(detectedAt.getDate()).padStart(2, "0")}`;
        dailyMap.set(dayKey, (dailyMap.get(dayKey) ?? 0) + 1);
      }

      // Repeated Orders
      if (f.order_id) {
        orderIdMap.set(
          f.order_id,
          (orderIdMap.get(f.order_id) ?? 0) + 1
        );
      }

      // Repeated Creator High Flags
      if (f.creator_id && severity === "high") {
        creatorHighMap.set(
          f.creator_id,
          (creatorHighMap.get(f.creator_id) ?? 0) + 1
        );
      }
    });

    // Reviewed Ratio
    const reviewedRatio =
      flags.length > 0 ? (reviewedCount / flags.length) * 100 : 0;

    // Repeated Orders（同じ order_id に2件以上）
    const repeatedOrders = Array.from(orderIdMap.values()).filter(
      (count) => count >= 2
    ).length;

    // Severity 分布
    const bucketsArr: SeverityBucket[] = Array.from(severityMap.entries())
      .map(([severity, count]) => ({ severity, count }))
      .sort((a, b) => {
        const order = { high: 0, medium: 1, low: 2 };
        return (
          (order[a.severity as keyof typeof order] ?? 99) -
          (order[b.severity as keyof typeof order] ?? 99)
        );
      });

    // 日別データ
    const dailyDataArr = Array.from(dailyMap.entries())
      .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
      .map(([date, count]) => ({ date, count }));

    // リスクパターン
    const repeatedCreatorHighFlags = Array.from(creatorHighMap.values()).filter(
      (count) => count >= 2
    ).length;

    // Flags with Flags
    const flagsWithFlagsArr: FraudRow[] = flags.map((f) => {
      const flagsList: string[] = [];
      const detectedAt = f.detected_at
        ? new Date(f.detected_at)
        : f.created_at
        ? new Date(f.created_at)
        : null;

      // severity = 'high' AND reviewed = false → "要確認"
      if (f.severity === "high" && !f.reviewed) {
        flagsList.push("要確認");
      }

      // detected_at から 7日以上経過 AND reviewed = false → "放置"
      if (detectedAt && !f.reviewed) {
        const daysSince = (now.getTime() - detectedAt.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSince >= 7) {
          flagsList.push("放置");
        }
      }

      // 同じ order_id に複数フラグがある → "重複"
      if (f.order_id && (orderIdMap.get(f.order_id) ?? 0) >= 2) {
        flagsList.push("重複");
      }

      return {
        ...f,
        flags: flagsList,
      };
    });

    // 経営者向け一文サマリ生成
    let summaryMessage = "";
    if (openHighSeverity >= 3) {
      summaryMessage = `⚠️ 高リスクの未処理フラグが${openHighSeverity}件存在します。運営側で優先確認が必要です。`;
    } else if (dailyDataArr.length >= 3) {
      const last3DaysAvg =
        dailyDataArr.slice(-3).reduce((sum, d) => sum + d.count, 0) / 3;
      const periodAvg = dailyDataArr.reduce((sum, d) => sum + d.count, 0) / dailyDataArr.length;
      if (last3DaysAvg > periodAvg * 1.5) {
        summaryMessage = `⚠️ 直近数日で不正検知件数が増加しています。キャンペーンや特定商品の影響を確認してください。`;
      } else if (reviewedRatio < 70) {
        summaryMessage = `⚠️ レビューされていないフラグが多く、運営の処理遅延が発生しています。`;
      } else {
        summaryMessage = "✓ 現時点で目立った不正リスクや処理遅延は見られません。";
      }
    } else if (reviewedRatio < 70) {
      summaryMessage = `⚠️ レビューされていないフラグが多く、運営の処理遅延が発生しています。`;
    } else {
      summaryMessage = "✓ 現時点で目立った不正リスクや処理遅延は見られません。";
    }

    return {
      kpi: {
        openFraudFlags,
        openHighSeverity,
        last7dHighFlags,
        last30dFlags,
        reviewedRatio,
        repeatedOrders,
      },
      buckets: bucketsArr,
      dailyData: dailyDataArr,
      riskPatterns: {
        repeatedOrderFlags: repeatedOrders,
        repeatedCreatorHighFlags,
      },
      flagsWithFlags: flagsWithFlagsArr,
      summaryMessage,
    };
  }, [flags]);

  return (
    <main className="min-h-screen bg-transparent text-white">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <header className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-wide">
              不正検知・リスク監視
            </h1>
            <p className="text-sm text-zinc-400">
              Fraud / 不正リスクを一目で把握する管制塔
            </p>
          </div>
          {/* 範囲タブ */}
          <div className="rounded-full bg-black/60 border border-white/10 p-1 text-[11px] inline-flex">
            {[
              { key: "7d", label: "Last 7 Days" },
              { key: "30d", label: "Last 30 Days" },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setRange(item.key as RangeKey)}
                className={`px-3 py-1 rounded-full ${
                  range === item.key
                    ? "bg-white text-black"
                    : "text-zinc-300 hover:text-white"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </header>

        {/* 経営者向け一文サマリ */}
        {summaryMessage && (
          <section className="rounded-2xl border border-white/10 bg-zinc-950/80 px-4 py-3">
            <p
              className={`text-sm font-medium ${
                summaryMessage.includes("⚠️")
                  ? "text-amber-300"
                  : summaryMessage.includes("✓")
                  ? "text-emerald-300"
                  : "text-zinc-300"
              }`}
            >
              {summaryMessage}
            </p>
          </section>
        )}

        {/* 最上段KPI（リスク指標） */}
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <RiskKpiCard
            label="Open Fraud Flags"
            value={`${kpi.openFraudFlags.toLocaleString()} 件`}
            subValue={
              kpi.openHighSeverity > 0
                ? `（High: ${kpi.openHighSeverity}件）`
                : undefined
            }
            description="未レビューの不正検知フラグ数です。"
            isWarning={kpi.openHighSeverity > 0}
          />
          <RiskKpiCard
            label="High Severity (Last 7 Days)"
            value={`${kpi.last7dHighFlags.toLocaleString()} 件`}
            description="直近7日間、severity = 'high' の件数です。"
          />
          <RiskKpiCard
            label="Flags (Last 30 Days)"
            value={`${kpi.last30dFlags.toLocaleString()} 件`}
            description="直近30日で発生した全フラグ件数です。"
          />
          <RiskKpiCard
            label="Reviewed Ratio"
            value={`${kpi.reviewedRatio.toFixed(1)}%`}
            description="reviewed = true の件数 / 全件数 (%) です。"
            isWarning={kpi.reviewedRatio < 70}
          />
          <RiskKpiCard
            label="Repeated Orders"
            value={`${kpi.repeatedOrders.toLocaleString()} 件`}
            description="同じ order_id に対して2件以上フラグが立っている件数です。"
          />
        </section>

        {/* Severity 分布チャート + 日別発生数トレンド */}
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-zinc-950/80 p-4">
            <p className="mb-2 text-xs font-semibold text-zinc-300">
              Severity 分布
            </p>
            <p className="mb-3 text-[11px] text-zinc-500">
              どのレベルのフラグが多いかを一瞬で把握できます。
            </p>
            <div className="h-60">
              {loading ? (
                <div className="flex h-full items-center justify-center text-xs text-zinc-500">
                  読み込み中…
                </div>
              ) : buckets.length === 0 ? (
                <div className="flex h-full items-center justify-center text-xs text-zinc-500">
                  データがありません。
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={buckets}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(148,163,184,0.2)"
                    />
                    <XAxis
                      dataKey="severity"
                      tick={{ fill: "#71717a", fontSize: 10 }}
                    />
                    <YAxis tick={{ fill: "#71717a", fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{
                        background: "#020617",
                        border: "1px solid rgba(148,163,184,0.4)",
                        fontSize: 11,
                      }}
                      formatter={(value: number) => [`${value} 件`, "件数"]}
                    />
                    <Bar dataKey="count" radius={4}>
                      {buckets.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            entry.severity === "high"
                              ? "#ef4444"
                              : entry.severity === "medium"
                              ? "#f59e0b"
                              : "#71717a"
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-zinc-950/80 p-4">
            <p className="mb-2 text-xs font-semibold text-zinc-300">
              日別 Fraud 発生数トレンド
            </p>
            <p className="mb-3 text-[11px] text-zinc-500">
              急増タイミング（スパイク）を視覚的に確認できます。
            </p>
            <div className="h-60">
              {loading ? (
                <div className="flex h-full items-center justify-center text-xs text-zinc-500">
                  読み込み中…
                </div>
              ) : dailyData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-xs text-zinc-500">
                  データがありません。
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(148,163,184,0.2)"
                    />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "#71717a", fontSize: 10 }}
                      tickFormatter={(value: string) => {
                        const parts = value.split("-");
                        if (parts.length === 3) {
                          return `${parts[1]}/${parts[2]}`;
                        }
                        return value;
                      }}
                    />
                    <YAxis tick={{ fill: "#71717a", fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{
                        background: "#020617",
                        border: "1px solid rgba(148,163,184,0.4)",
                        fontSize: 11,
                      }}
                      formatter={(value: number) => [`${value} 件`, "発生数"]}
                      labelFormatter={(label: string) => {
                        const date = new Date(label);
                        return date.toLocaleDateString("ja-JP", {
                          month: "2-digit",
                          day: "2-digit",
                        });
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#ef4444"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </section>

        {/* リスクパターンカード */}
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-zinc-950/80 p-4">
            <p className="mb-2 text-xs font-semibold text-zinc-300">
              Risk Patterns（集計ベース）
            </p>
            <div className="space-y-3 mt-3">
              <div className="rounded-lg border border-zinc-800 bg-black/40 px-3 py-2">
                <p className="text-xs text-zinc-200">
                  同一 order_id に複数フラグ
                </p>
                <p className="mt-1 text-lg font-semibold text-white">
                  {riskPatterns.repeatedOrderFlags} 件
                </p>
                <p className="mt-1 text-[11px] text-zinc-500">
                  同一注文に複数フラグが付いている件数です。
                </p>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-black/40 px-3 py-2">
                <p className="text-xs text-zinc-200">
                  同一 creator_id に high severity が複数
                </p>
                <p className="mt-1 text-lg font-semibold text-white">
                  {riskPatterns.repeatedCreatorHighFlags} 件
                </p>
                <p className="mt-1 text-[11px] text-zinc-500">
                  同一 Creator に high severity フラグが複数立っている件数です。
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-zinc-950/80 p-4">
            <p className="mb-2 text-xs font-semibold text-zinc-300">
              Detection Notes（将来実装予定）
            </p>
            <div className="space-y-3 mt-3">
              <div className="rounded-lg border border-zinc-800 bg-black/40 px-3 py-2">
                <p className="text-xs text-zinc-200">IP アドレス異常</p>
                <p className="mt-1 text-[11px] text-zinc-500">
                  同一 IP からの短時間での試行回数を集計する予定です。
                </p>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-black/40 px-3 py-2">
                <p className="text-xs text-zinc-200">決済カードの多重利用</p>
                <p className="mt-1 text-[11px] text-zinc-500">
                  決済カード単位での多重購入パターンを検知する予定です。
                </p>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-black/40 px-3 py-2">
                <p className="text-xs text-zinc-200">配送先パターン</p>
                <p className="mt-1 text-[11px] text-zinc-500">
                  配送先の異常パターン（同一住所への大量配送など）を検知する予定です。
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* フラグ一覧テーブル + フラグ列 */}
        <section className="rounded-2xl border border-white/10 bg-zinc-950/80 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-zinc-300">
              フラグ一覧（判断補助）
            </p>
            {loading && (
              <p className="text-[11px] text-zinc-500">読み込み中…</p>
            )}
            {error && !loading && (
              <p className="text-[11px] text-red-400">{error}</p>
            )}
          </div>
          <div className="max-h-[480px] overflow-y-auto text-xs">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 bg-zinc-950">
                <tr className="text-zinc-400">
                  <th className="px-2 py-2 text-left font-normal">Detected At</th>
                  <th className="px-2 py-2 text-left font-normal">Severity</th>
                  <th className="px-2 py-2 text-left font-normal">Order ID</th>
                  <th className="px-2 py-2 text-left font-normal">Creator ID</th>
                  <th className="px-2 py-2 text-left font-normal">Reviewed</th>
                  <th className="px-2 py-2 text-left font-normal">Reviewed At</th>
                  <th className="px-2 py-2 text-left font-normal">Reason</th>
                  <th className="px-2 py-2 text-left font-normal">Flags</th>
                </tr>
              </thead>
              <tbody>
                {flagsWithFlags.length === 0 && !loading ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-2 py-6 text-center text-zinc-500"
                    >
                      データがありません。
                    </td>
                  </tr>
                ) : (
                  flagsWithFlags.map((f) => {
                    const detectedAt = f.detected_at
                      ? new Date(f.detected_at)
                      : f.created_at
                      ? new Date(f.created_at)
                      : null;
                    return (
                      <tr
                        key={f.id}
                        className={`border-t border-zinc-800/80 text-[11px] hover:bg-zinc-900/70 ${
                          f.flags.length > 0 ? "text-amber-300" : ""
                        }`}
                      >
                        <td className="px-2 py-2">
                          {detectedAt
                            ? detectedAt.toLocaleString("ja-JP", {
                                month: "2-digit",
                                day: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "-"}
                        </td>
                        <td className="px-2 py-2">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] ${
                              f.severity === "high"
                                ? "bg-red-500/10 text-red-300"
                                : f.severity === "medium"
                                ? "bg-amber-500/10 text-amber-300"
                                : "bg-zinc-700/60 text-zinc-100"
                            }`}
                          >
                            {f.severity ?? "unknown"}
                          </span>
                        </td>
                        <td className="px-2 py-2">
                          {f.order_id ? (
                            <Link
                              href={`/admin/orders?focus_order=${f.order_id}`}
                              className="font-mono text-xs text-slate-300 underline underline-offset-2 decoration-slate-500 hover:decoration-emerald-400 hover:text-emerald-300"
                            >
                              {f.order_id.length > 12
                                ? `${f.order_id.slice(0, 8)}…`
                                : f.order_id}
                            </Link>
                          ) : (
                            <span className="text-slate-500">-</span>
                          )}
                        </td>
                        <td className="px-2 py-2">
                          {f.creator_id ? (
                            <Link
                              href={`/admin/orders?focus_creator=${f.creator_id}`}
                              className="font-mono text-xs text-slate-300 underline underline-offset-2 decoration-slate-500 hover:decoration-emerald-400 hover:text-emerald-300"
                            >
                              {f.creator_id.length > 12
                                ? `${f.creator_id.slice(0, 8)}…`
                                : f.creator_id}
                            </Link>
                          ) : (
                            <span className="text-slate-500">-</span>
                          )}
                        </td>
                        <td className="px-2 py-2">
                          {f.reviewed ? (
                            <span className="text-emerald-300">Yes</span>
                          ) : (
                            <span className="text-amber-300">No</span>
                          )}
                        </td>
                        <td className="px-2 py-2">
                          {f.reviewed_at
                            ? new Date(f.reviewed_at).toLocaleDateString("ja-JP")
                            : "-"}
                        </td>
                        <td className="px-2 py-2" title={f.reason ?? undefined}>
                          {f.reason
                            ? f.reason.length > 30
                              ? `${f.reason.slice(0, 30)}…`
                              : f.reason
                            : "-"}
                        </td>
                        <td className="px-2 py-2">
                          {f.flags.length > 0 ? (
                            <span className="inline-flex items-center gap-1 text-amber-400">
                              <span>⚠️</span>
                              <span className="text-[10px]">
                                {f.flags.join(", ")}
                              </span>
                            </span>
                          ) : (
                            <span className="text-zinc-500 text-[10px]">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

type RiskKpiCardProps = {
  label: string;
  value: string;
  subValue?: string;
  description: string;
  isWarning?: boolean;
};

function RiskKpiCard({
  label,
  value,
  subValue,
  description,
  isWarning = false,
}: RiskKpiCardProps) {
  return (
    <div
      className={`rounded-2xl border ${
        isWarning
          ? "border-amber-500/30 bg-amber-950/20"
          : "border-white/10 bg-zinc-950/80"
      } px-4 py-3`}
    >
      <p className="text-xs text-zinc-400">{label}</p>
      <div className="mt-1">
        <p
          className={`text-xl font-semibold ${
            isWarning ? "text-amber-300" : "text-white"
          }`}
        >
          {value}
        </p>
        {subValue && (
          <p className="mt-0.5 text-sm text-zinc-400">{subValue}</p>
        )}
      </div>
      <p className="mt-1 text-[11px] text-zinc-500">{description}</p>
    </div>
  );
}



