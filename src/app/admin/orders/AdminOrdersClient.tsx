"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { ShoppingCart, LogOut, Filter, X } from "lucide-react";

type Order = {
  id: string;
  product_id: string;
  product_name: string;
  creator_id: string;
  brand_id: string;
  amount: number;
  status: string;
  source: string;
  created_at: string;
};

type FilterState = {
  dateFrom: string;
  dateTo: string;
  brandId: string;
  creatorId: string;
  status: string;
  source: string;
};

/**
 * Admin Orders Client Component
 * 全注文の閲覧・管理画面
 */
export default function AdminOrdersClient() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [filters, setFilters] = useState<FilterState>({
    dateFrom: "",
    dateTo: "",
    brandId: "",
    creatorId: "",
    status: "",
    source: "",
  });
  const [showFilters, setShowFilters] = useState(false);

  /**
   * アクセスチェックとデータ取得
   */
  const checkAccessAndFetch = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || user.user_metadata?.role !== "admin") {
        router.replace("/login");
        return;
      }

      setIsAuthorized(true);
      await fetchOrders();
    } catch (error) {
      // 本番環境では詳細なエラー情報をログに出力しない（セキュリティ）
      if (process.env.NODE_ENV === "development") {
        console.error("Admin access check error:", error);
      }
      router.replace("/login");
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void checkAccessAndFetch();

    // リアルタイム更新: orders テーブルの変更を監視
    const channel = supabase
      .channel("admin-orders-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        async () => {
          // 本番環境ではログを出力しない（開発環境のみ）
          if (process.env.NODE_ENV === "development") {
            console.log("注文データが更新されました");
          }
          await fetchOrders();
        }
      )
      .subscribe();

    // クリーンアップ
    return () => {
      supabase.removeChannel(channel);
    };
  }, [checkAccessAndFetch]);

  /**
   * 全 orders を取得
   * RLS により Admin のみ全件取得可能
   */
  const fetchOrders = async () => {
    try {
      // orders を取得
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select("id, product_id, creator_id, amount, status, source, created_at")
        .order("created_at", { ascending: false });

      if (ordersError) {
        // 本番環境では詳細なエラー情報をログに出力しない
        if (process.env.NODE_ENV === "development") {
          console.error("注文データの取得に失敗しました:", ordersError);
        }
        setOrders([]);
        setFilteredOrders([]);
        return;
      }

      if (!ordersData || ordersData.length === 0) {
        setOrders([]);
        setFilteredOrders([]);
        return;
      }

      // 商品IDを収集
      const productIds = [
        ...new Set(ordersData.map((o) => o.product_id).filter(Boolean)),
      ];

      // products を一括取得
      const { data: productsData } = await supabase
        .from("products")
        .select("id, name, brand_id")
        .in("id", productIds);

      // 商品マップを作成
      const productMap = new Map(
        (productsData || []).map((p) => [p.id, p])
      );

      // データを整形
      const formattedOrders: Order[] = ordersData.map((order: any) => {
        const product = productMap.get(order.product_id);
        return {
          id: order.id,
          product_id: order.product_id,
          product_name: product?.name || "商品名不明",
          creator_id: order.creator_id || "",
          brand_id: product?.brand_id || "",
          amount: order.amount || 0,
          status: order.status || "completed",
          source: order.source || "demo",
          created_at: order.created_at,
        };
      });

      setOrders(formattedOrders);
      setFilteredOrders(formattedOrders);
    } catch (error) {
      // 本番環境では詳細なエラー情報をログに出力しない
      if (process.env.NODE_ENV === "development") {
        console.error("注文データの取得エラー:", error);
      }
      setOrders([]);
      setFilteredOrders([]);
    }
  };

  /**
   * フィルタを適用
   */
  useEffect(() => {
    let filtered = [...orders];

    // 日付フィルタ
    if (filters.dateFrom) {
      filtered = filtered.filter(
        (order) => new Date(order.created_at) >= new Date(filters.dateFrom)
      );
    }
    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(
        (order) => new Date(order.created_at) <= toDate
      );
    }

    // brand_id フィルタ
    if (filters.brandId) {
      filtered = filtered.filter((order) =>
        order.brand_id.toLowerCase().includes(filters.brandId.toLowerCase())
      );
    }

    // creator_id フィルタ
    if (filters.creatorId) {
      filtered = filtered.filter((order) =>
        order.creator_id.toLowerCase().includes(filters.creatorId.toLowerCase())
      );
    }

    // status フィルタ
    if (filters.status) {
      filtered = filtered.filter((order) => order.status === filters.status);
    }

    // source フィルタ
    if (filters.source) {
      filtered = filtered.filter((order) => order.source === filters.source);
    }

    setFilteredOrders(filtered);
  }, [orders, filters]);

  /**
   * フィルタをリセット
   */
  const resetFilters = () => {
    setFilters({
      dateFrom: "",
      dateTo: "",
      brandId: "",
      creatorId: "",
      status: "",
      source: "",
    });
  };

  /**
   * アクティブなフィルタの数を取得
   */
  const activeFilterCount = Object.values(filters).filter((v) => v !== "").length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-sm text-slate-300">Loading...</p>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-white">Admin Orders</h1>
            <p className="mt-1 text-sm text-slate-400">
              All orders management and monitoring
            </p>
          </div>
          <nav className="flex items-center gap-4">
            <Link
              href="/admin"
              className="text-sm text-slate-300 hover:text-white transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href="/admin/payouts"
              className="text-sm text-slate-300 hover:text-white transition-colors"
            >
              Payouts
            </Link>
            <Link
              href="/admin/users"
              className="text-sm text-slate-300 hover:text-white transition-colors"
            >
              Users
            </Link>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                router.replace("/login");
              }}
              className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
            >
              Log out
            </button>
          </nav>
        </header>

        {/* Filters */}
        <div className="mb-6">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 bg-zinc-950/70 text-sm text-slate-300 hover:text-white transition-colors"
          >
            <Filter className="w-4 h-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs">
                {activeFilterCount}
              </span>
            )}
          </button>

          {showFilters && (
            <div className="mt-4 p-4 rounded-lg border border-white/10 bg-zinc-950/70">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* 日付フィルタ */}
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    From Date
                  </label>
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) =>
                      setFilters({ ...filters, dateFrom: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    To Date
                  </label>
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) =>
                      setFilters({ ...filters, dateTo: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Brand ID フィルタ */}
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Brand ID
                  </label>
                  <input
                    type="text"
                    value={filters.brandId}
                    onChange={(e) =>
                      setFilters({ ...filters, brandId: e.target.value })
                    }
                    placeholder="Filter by brand ID"
                    className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Creator ID フィルタ */}
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Creator ID
                  </label>
                  <input
                    type="text"
                    value={filters.creatorId}
                    onChange={(e) =>
                      setFilters({ ...filters, creatorId: e.target.value })
                    }
                    placeholder="Filter by creator ID"
                    className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Status フィルタ */}
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Status
                  </label>
                  <select
                    value={filters.status}
                    onChange={(e) =>
                      setFilters({ ...filters, status: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">All</option>
                    <option value="completed">Completed</option>
                    <option value="pending">Pending</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="refunded">Refunded</option>
                  </select>
                </div>

                {/* Source フィルタ */}
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Source
                  </label>
                  <select
                    value={filters.source}
                    onChange={(e) =>
                      setFilters({ ...filters, source: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">All</option>
                    <option value="demo">Demo</option>
                    <option value="production">Production</option>
                  </select>
                </div>
              </div>

              {activeFilterCount > 0 && (
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={resetFilters}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white transition-colors"
                  >
                    <X className="w-3 h-3" />
                    Reset Filters
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Orders Table */}
        <div className="rounded-2xl border border-white/10 bg-zinc-950/70 overflow-hidden">
          {filteredOrders.length === 0 ? (
            <div className="p-12 text-center">
              <ShoppingCart className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 text-sm">
                {orders.length === 0
                  ? "No orders found"
                  : "No orders match the current filters"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-zinc-900/50">
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">
                      Order ID
                    </th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">
                      Product Name
                    </th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">
                      Creator ID
                    </th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">
                      Brand ID
                    </th>
                    <th className="text-right py-3 px-4 text-slate-400 font-medium">
                      Amount
                    </th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">
                      Source
                    </th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">
                      Created At
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => (
                    <tr
                      key={order.id}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors"
                    >
                      <td className="py-3 px-4 text-slate-200 font-mono text-xs">
                        {order.id.substring(0, 8)}...
                      </td>
                      <td className="py-3 px-4 text-slate-200">
                        {order.product_name}
                      </td>
                      <td className="py-3 px-4 text-slate-300 font-mono text-xs">
                        {order.creator_id
                          ? `${order.creator_id.substring(0, 8)}...`
                          : "-"}
                      </td>
                      <td className="py-3 px-4 text-slate-300 font-mono text-xs">
                        {order.brand_id
                          ? `${order.brand_id.substring(0, 8)}...`
                          : "-"}
                      </td>
                      <td className="py-3 px-4 text-right text-emerald-300 font-semibold">
                        ¥{order.amount.toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                            order.status === "completed"
                              ? "bg-emerald-500/20 text-emerald-300"
                              : order.status === "pending"
                              ? "bg-amber-500/20 text-amber-300"
                              : order.status === "cancelled"
                              ? "bg-red-500/20 text-red-300"
                              : "bg-slate-500/20 text-slate-300"
                          }`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                            order.source === "production"
                              ? "bg-blue-500/20 text-blue-300"
                              : "bg-slate-500/20 text-slate-300"
                          }`}
                        >
                          {order.source}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-xs">
                        {new Date(order.created_at).toLocaleString("ja-JP", {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Summary */}
          {filteredOrders.length > 0 && (
            <div className="border-t border-white/10 px-4 py-3 bg-zinc-900/50">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">
                  Showing {filteredOrders.length} of {orders.length} orders
                </span>
                <span className="text-emerald-300 font-semibold">
                  Total: ¥
                  {filteredOrders
                    .reduce((sum, order) => sum + order.amount, 0)
                    .toLocaleString()}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

