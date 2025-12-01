"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

/**
 * 注文ステータスの型定義
 */
type OrderStatus = "paid" | "pending_shipment" | "shipped" | "cancelled" | "refunded";

/**
 * 注文データの型定義（referrer と companyName / productDescription を含む）
 */
type OrderWithReferrer = {
  id: string;
  customerName: string;
  customerEmail: string;
  orderDate: string;
  productId: string;
  productName: string;
  influencerId: string;
  influencerName: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  status: OrderStatus;
  shippingAddress: string;
  shippingPostalCode: string;
  trackingNumber?: string;
  shippedAt?: string;
  cancelledAt?: string;
  refundedAt?: string;
  notes?: string;
  referrer: string | null;
  companyName?: string | null;
  productDescription?: string | null;
};

/**
 * SupabaseのRow型をOrder型に変換するヘルパー関数
 */
function mapSupabaseRowToOrder(row: any): OrderWithReferrer {
  return {
    id: row.id || `order-${Date.now()}`,
    customerName: row.buyer_name || row.customer_name || 'ゲスト購入者',
    customerEmail: row.customer_email || 'guest@example.com',
    orderDate: row.order_date || row.created_at || new Date().toISOString(),
    productId: row.product_id || '',
    productName: row.product_name || '商品名不明',
    influencerId: row.influencer_id || '',
    influencerName: row.influencer_name || '販売担当者未設定',
    quantity: row.quantity || 1,
    unitPrice: row.price || row.amount || 0,
    totalAmount: row.price || row.amount || 0,
    status: mapStatusToOrderStatus(row.status),
    shippingAddress: row.shipping_address || '',
    shippingPostalCode: row.shipping_postal_code || '',
    trackingNumber: row.tracking_number || undefined,
    shippedAt: row.shipped_at || undefined,
    cancelledAt: row.cancelled_at || undefined,
    refundedAt: row.refunded_at || undefined,
    notes: row.notes || undefined,
    referrer: row.referrer || null,
    companyName: row.company_name || undefined,
    productDescription: row.product_description || undefined,
  };
}

/**
 * SupabaseのステータスをOrderStatusにマッピング
 */
function mapStatusToOrderStatus(status: string): OrderStatus {
  const statusMap: Record<string, OrderStatus> = {
    pending: 'pending_shipment',
    'pending_shipment': 'pending_shipment',
    paid: 'paid',
    shipped: 'shipped',
    cancelled: 'cancelled',
    refunded: 'refunded',
  };
  return statusMap[status] || 'pending_shipment';
}

/**
 * ダッシュボード注文一覧ページ
 */
export default function DashboardOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderWithReferrer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.replace("/login");
          return;
        }

        // 自分の注文を取得
        const { data, error } = await supabase
          .from("orders")
          .select("*")
          .eq("creator_id", user.id)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("注文データの取得に失敗しました:", error);
          return;
        }

        if (data) {
          const mappedOrders = data.map((row) => mapSupabaseRowToOrder(row));
          setOrders(mappedOrders);
        }
      } catch (error) {
        console.error("エラーが発生しました:", error);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchOrders();
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center">
        <p className="text-slate-300">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 p-6">
      <h1 className="text-2xl font-bold mb-6">注文一覧</h1>
      {orders.length === 0 ? (
        <p className="text-slate-300">注文がありません</p>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-slate-900 border border-slate-800 rounded-lg p-4"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-lg font-semibold">{order.productName}</h2>
                  <p className="text-slate-400 text-sm">
                    {new Date(order.orderDate).toLocaleDateString("ja-JP")}
                  </p>
                  {order.companyName && (
                    <p className="text-slate-300 text-sm mt-1">
                      企業: {order.companyName}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">¥{order.totalAmount.toLocaleString()}</p>
                  <p className="text-slate-400 text-sm">{order.status}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

