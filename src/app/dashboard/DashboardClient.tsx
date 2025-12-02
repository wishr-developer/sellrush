"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/language";
import { copy, t } from "@/lib/copy";
import {
  TrendingUp,
  DollarSign,
  Trophy,
  Package,
  ArrowRight,
  LogOut,
  Zap,
  Target,
  Plus,
  X,
  CheckCircle,
  Flame,
  ArrowRightCircle,
  Link2,
} from "lucide-react";
import {
  LineChart,
  Line,
  ComposedChart,
  Area,
  AreaChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import MobileTabBar from "@/components/MobileTabBar";
import RankingBoard from "@/components/RankingBoard";
import { PasswordSetupModal } from "@/components/auth/PasswordSetupModal";
import { AffiliateLinkModal } from "@/components/dashboard/AffiliateLinkModal";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { showErrorToast, showSuccessToast } from "@/components/ui/Toast";
import { DashboardSkeleton } from "@/components/ui/LoadingSkeleton";
import type {
  User,
  ProductSummary,
  OrderRow,
  SalesStats,
  PayoutStats,
  BattleStatus,
  DailyPoint,
} from "@/types/dashboard";
import type { LoadingState, ErrorState } from "@/types/dashboard-loading";
import {
  initialLoadingState,
  initialErrorState,
} from "@/types/dashboard-loading";
import {
  calculateTodayStats,
  calculateDailyData,
  calculateAverageOrderValue,
  getBattleRank,
  getEstimatedCommissionDescription,
} from "@/lib/dashboard-calculations";

// 型定義は @/types/dashboard からインポート

/**
 * 司令室 / コマンドセンター（クライアント側コンポーネント）
 * ログイン後のトップページ
 */
export default function DashboardClient() {
  const router = useRouter();
  const { language } = useLanguage();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showPasswordSetup, setShowPasswordSetup] = useState(false);
  const [showAffiliateLinkModal, setShowAffiliateLinkModal] = useState(false);
  const [salesStats, setSalesStats] = useState<SalesStats>({
    totalSales: 0,
    totalRevenue: 0,
    estimatedCommission: 0,
  });
  const [payoutStats, setPayoutStats] = useState<PayoutStats>({
    totalPending: 0,
    totalPaid: 0,
    pendingCount: 0,
    paidCount: 0,
  });
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [battles, setBattles] = useState<BattleStatus[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [showCreateOrderModal, setShowCreateOrderModal] = useState(false);
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [orderAmount, setOrderAmount] = useState<number>(0);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);

  // 認証エラー表示用（/login へのハードリダイレクトは行わず、画面上で静かに表示する）
  const [authError, setAuthError] = useState<string | null>(null);

  // 個別のローディング/エラー状態管理
  const [loadingState, setLoadingState] = useState<LoadingState>(initialLoadingState);
  const [errorState, setErrorState] = useState<ErrorState>(initialErrorState);

  // getUser が null を返した場合のリトライ制御用フラグ。
  // ログイン直後はセッション確立に僅かなラグがあるため、
  // 1 回だけ再取得してから未ログイン扱いとする。
  const hasRetriedUserRef = useRef(false);
  // Realtime subscribe の重複実行を防ぐための ref
  const realtimeSubscribedRef = useRef<string | null>(null);

  // 初期化処理（1回のみ実行）
  useEffect(() => {
    let mounted = true;
    let hasRedirected = false; // リダイレクトフラグ（1回のみ実行）

    const init = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        // コンポーネントがアンマウントされていたら処理を中断
        if (!mounted || hasRedirected) return;

        if (!user) {
          // 初回だけ少し待ってから再取得してみる（ログイン直後のラグ対策）
          if (!hasRetriedUserRef.current) {
            hasRetriedUserRef.current = true;
            await new Promise((resolve) => setTimeout(resolve, 400));
            const {
              data: { user: retryUser },
            } = await supabase.auth.getUser();

            if (!mounted || hasRedirected) return;

            if (retryUser) {
              // ここで user が取れた場合は通常フローに乗せる
              setUser(retryUser);
            } else {
              // それでも user が取れない場合は未ログインとして /login へ戻す
              window.location.replace("/login");
              return;
            }
          } else {
            // 既にリトライ済みなら未ログインとして扱い、/login へ戻す
            window.location.replace("/login");
            return;
          }
        }

        // role チェック: Creator / Influencer のみアクセス可能
        // セキュリティ: 想定外 role は即リダイレクト
        // ただし、過去に作成された role 未設定ユーザーは Creator として扱い、
        // ループを避けるため /login には戻さない。
        const userRole = user?.user_metadata?.role;
        if (userRole === "admin") {
          hasRedirected = true;
          setIsLoading(false); // リダイレクト前に loading を解除
          // Admin ロールは 3003 ポートの Admin アプリに委譲する
          window.location.href = "http://localhost:3003/admin";
          return;
        }
        if (userRole === "brand" || userRole === "company") {
          hasRedirected = true;
          setIsLoading(false); // リダイレクト前に loading を解除
          window.location.href = "/brand/dashboard";
          return;
        }
        // creator / influencer 以外はアクセス不可（role が明示的に設定されている場合のみ）
        if (
          userRole &&
          userRole !== "creator" &&
          userRole !== "influencer"
        ) {
          // /login へ戻さず、画面上でアクセス不可メッセージを示す
          setUser(null);
          setAuthError("このダッシュボードにはアクセスできません。");
          setIsLoading(false);
          return;
        }

        // コンポーネントがアンマウントされていたら処理を中断
        if (!mounted || hasRedirected) return;

        setUser(user);

        // Check if password setup is needed
        // Show password setup if:
        // 1. User has only email provider (Magic Link login)
        // 2. User hasn't dismissed the modal before
        const providers = user?.app_metadata?.providers || [];
        const hasEmailOnly = providers.length === 1 && providers[0] === "email";

        // Show password setup if email-only provider
        if (hasEmailOnly && user?.id) {
          // Check if user has dismissed this before (localStorage)
          const dismissed = localStorage.getItem(`password-setup-dismissed-${user.id}`);
          if (!dismissed) {
            setShowPasswordSetup(true);
          }
        }

        // コンポーネントがアンマウントされていたら処理を中断
        if (!mounted || hasRedirected) return;

        // データ取得（エラーが発生しても続行）
        if (!user?.id) return;
        try {
          await fetchSalesData(user.id!);
        } catch (e) {
          // 本番環境では詳細なエラー情報をログに出力しない（セキュリティ）
          if (process.env.NODE_ENV === "development") {
            console.error("売上データ取得エラー:", e);
          }
        }

        if (!mounted || hasRedirected) return;

        if (!user?.id) return;
        try {
          await fetchPayoutStats(user.id!);
        } catch (e) {
          if (process.env.NODE_ENV === "development") {
            console.error("報酬データ取得エラー:", e);
          }
        }

        if (!mounted || hasRedirected) return;

        if (!user?.id) return;
        try {
          await fetchBattleStatus(user.id!);
        } catch (e) {
          // 本番環境では詳細なエラー情報をログに出力しない（セキュリティ）
          if (process.env.NODE_ENV === "development") {
            console.error("バトル状況取得エラー:", e);
          }
        }

        if (!mounted || hasRedirected) return;

        try {
          await fetchProducts();
        } catch (e) {
          // 本番環境では詳細なエラー情報をログに出力しない（セキュリティ）
          if (process.env.NODE_ENV === "development") {
            console.error("商品データ取得エラー:", e);
          }
        }
      } catch (error) {
        // 本番環境では詳細なエラー情報をログに出力しない（セキュリティ）
        if (process.env.NODE_ENV === "development") {
          console.error("ユーザー認証エラー:", error);
        }
        if (mounted && !hasRedirected) {
          // 認証エラー時も /login には戻さず、この画面上で静かにメッセージを表示
          setUser(null);
          setAuthError("認証エラーが発生しました。もう一度サインインしてください。");
          setIsLoading(false);
        }
      } finally {
        // どの分岐でも loading を必ず解除（リダイレクトしていない場合のみ）
        if (mounted && !hasRedirected) {
          setIsLoading(false);
        }
      }
    };

    init();

    // クリーンアップ関数
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 依存配列を空にして、マウント時のみ実行

  // Realtime subscribe（user が設定された後に1回だけ実行）
  useEffect(() => {
    if (!user?.id) return; // user.id が設定されるまで待つ
    
    // 既に同じ user.id で購読済みの場合はスキップ
    if (realtimeSubscribedRef.current === user.id) return;

    let mounted = true;
    let channel: any = null;
    const userId = user.id; // クロージャーで固定

    // 購読済みフラグを設定
    realtimeSubscribedRef.current = userId;

    // リアルタイム更新: orders テーブルの変更を監視
    channel = supabase
      .channel(`orders-changes-${userId}`) // ユニークなチャンネル名
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
          filter: `creator_id=eq.${userId}`,
        },
        async (payload) => {
          // 本番環境ではログを出力しない（開発環境のみ）
          if (process.env.NODE_ENV === "development") {
            console.log("新しい売上が生成されました:", payload);
          }
          // データを再取得してダッシュボードを更新
          if (mounted) {
            try {
              await fetchSalesData(userId);
              await fetchBattleStatus(userId);
            } catch (e) {
              // エラーは無視（非ブロッキング）
              if (process.env.NODE_ENV === "development") {
                console.error("リアルタイム更新エラー:", e);
              }
            }
          }
        }
      )
      .subscribe();

    // クリーンアップ関数
    return () => {
      mounted = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
      // クリーンアップ時に ref をリセット（新しい user.id で再購読可能にする）
      if (realtimeSubscribedRef.current === userId) {
        realtimeSubscribedRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]); // user.id が設定された時のみ実行（1回のみ）

  /**
   * 売上データを取得（実DB接続）
   * RLS で creator_id === auth.uid() の行のみ取得可能
   * useCallback でメモ化して再レンダリングループを防止
   */
  const fetchSalesData = useCallback(async (userId: string) => {
    try {
      // 1. 自分の affiliate_links を取得
      const { data: affiliateLinks, error: linksError } = await supabase
        .from("affiliate_links")
        .select("id, product_id")
        .eq("creator_id", userId)
        .eq("status", "active");

      if (linksError) {
        if (process.env.NODE_ENV === "development") {
          console.error("Affiliate links fetch error:", linksError);
        }
        return;
      }

      if (!affiliateLinks || affiliateLinks.length === 0) {
        // 紹介リンクが無い場合は、モックデータを使用するか売上0を設定
        if (shouldUseMockData()) {
          const mockStats = getMockSalesStats();
          const mockOrders = getMockOrders();
          setSalesStats(mockStats);
          setOrders(mockOrders);
        } else {
          setSalesStats({
            totalSales: 0,
            totalRevenue: 0,
            estimatedCommission: 0,
          });
          setOrders([]);
        }
        return;
      }

      const affiliateLinkIds = affiliateLinks.map((link) => link.id);

      // 2. 自分の affiliate_link_id 経由の注文を取得
      const { data, error } = await supabase
        .from("orders")
        .select("id, amount, created_at, status, product_id, affiliate_link_id")
        .in("affiliate_link_id", affiliateLinkIds)
        .eq("status", "completed")
        .order("created_at", { ascending: false });

      if (error) {
        if (process.env.NODE_ENV === "development") {
          console.error("売上データの取得に失敗しました:", error);
        }
        setErrorState((prev) => ({
          ...prev,
          sales: "売上データの取得に失敗しました",
        }));
        showErrorToast("売上データの取得に失敗しました");
        return;
      }

      // 3. 商品ごとの分配率を取得
      const productIds = [...new Set(data?.map((o) => o.product_id).filter(Boolean) || [])];
      const { data: products } = await supabase
        .from("products")
        .select("id, creator_share_rate")
        .in("id", productIds);

      const productRateMap = new Map(
        (products || []).map((p) => [p.id, p.creator_share_rate || 0.25])
      );

      if (data && data.length > 0) {
        const totalSales = data.length;
        const totalRevenue = data.reduce((sum, order) => {
          return sum + (order.amount || 0);
        }, 0);
        
        // 商品ごとの分配率で報酬を計算
        const estimatedCommission = data.reduce((sum, order) => {
          const rate = productRateMap.get(order.product_id) || 0.25;
          return sum + Math.floor((order.amount || 0) * rate);
        }, 0);

        // 注文データを保持
        setOrders((prev) => {
          if (
            prev.length === data.length &&
            prev.every((p, i) => p.id === data[i]?.id)
          ) {
            return prev;
          }
          return (data as OrderRow[]) ?? [];
        });

        // 前回の値と比較して、変更がある場合のみ state を更新
        setSalesStats((prev) => {
          if (
            prev.totalSales === totalSales &&
            prev.totalRevenue === totalRevenue &&
            prev.estimatedCommission === estimatedCommission
          ) {
            return prev; // 変更がない場合は前回の state を返す
          }
          return {
            totalSales,
            totalRevenue,
            estimatedCommission,
          };
        });
      } else {
        // データがない場合: モックデータを使用するか初期値を設定
        if (shouldUseMockData()) {
          const mockStats = getMockSalesStats();
          const mockOrders = getMockOrders();
          setSalesStats(mockStats);
          setOrders(mockOrders);
        } else {
          setSalesStats((prev) => {
            if (
              prev.totalSales === 0 &&
              prev.totalRevenue === 0 &&
              prev.estimatedCommission === 0
            ) {
              return prev;
            }
            return {
              totalSales: 0,
              totalRevenue: 0,
              estimatedCommission: 0,
            };
          });
          setOrders([]);
        }
      }
    } catch (error) {
      // 本番環境では詳細なエラー情報をログに出力しない（セキュリティ）
      if (process.env.NODE_ENV === "development") {
        console.error("売上データの取得エラー:", error);
      }
      // エラー時も初期値を設定（変更がある場合のみ）
      setSalesStats((prev) => {
        if (
          prev.totalSales === 0 &&
          prev.totalRevenue === 0 &&
          prev.estimatedCommission === 0
        ) {
          return prev;
        }
        return {
          totalSales: 0,
          totalRevenue: 0,
          estimatedCommission: 0,
        };
      });
      setOrders((prev) => (prev.length === 0 ? prev : []));
    } finally {
      // ローディング終了
      setLoadingState((prev) => ({ ...prev, sales: false }));
    }
  }, []); // 依存配列を空にして、関数を固定

  /**
   * 報酬データを取得（payouts テーブルから）
   * 
   * データソース:
   * - payouts (自分の報酬レコード)
   * 
   * 計算ロジック:
   * - totalPending: status = 'pending' の creator_amount を合計
   * - totalPaid: status = 'paid' の creator_amount を合計
   * - pendingCount: status = 'pending' の件数
   * - paidCount: status = 'paid' の件数
   */
  const fetchPayoutStats = useCallback(async (userId: string) => {
    // ローディング開始、エラー状態をクリア
    setLoadingState((prev) => ({ ...prev, payouts: true }));
    setErrorState((prev) => ({ ...prev, payouts: null }));

    try {
      const { data, error } = await supabase
        .from("payouts")
        .select("creator_amount, status")
        .eq("creator_id", userId);

      if (error) {
        if (process.env.NODE_ENV === "development") {
          console.error("Payout stats fetch error:", error);
        }
        setErrorState((prev) => ({
          ...prev,
          payouts: "報酬データの取得に失敗しました",
        }));
        showErrorToast("報酬データの取得に失敗しました");
        return;
      }

      if (data && data.length > 0) {
        const pending = data.filter((p) => p.status === "pending");
        const paid = data.filter((p) => p.status === "paid");

        const totalPending = pending.reduce((sum, p) => sum + (p.creator_amount || 0), 0);
        const totalPaid = paid.reduce((sum, p) => sum + (p.creator_amount || 0), 0);

        setPayoutStats({
          totalPending,
          totalPaid,
          pendingCount: pending.length,
          paidCount: paid.length,
        });
      } else {
        // データがない場合: モックデータを使用するか初期値を設定
        if (shouldUseMockData()) {
          setPayoutStats(getMockPayoutStats());
        } else {
          setPayoutStats({
            totalPending: 0,
            totalPaid: 0,
            pendingCount: 0,
            paidCount: 0,
          });
        }
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Payout stats fetch error:", error);
      }
      setErrorState((prev) => ({
        ...prev,
        payouts: "報酬データの取得中にエラーが発生しました",
      }));
    } finally {
      // ローディング終了
      setLoadingState((prev) => ({ ...prev, payouts: false }));
    }
  }, []);

  // 日別集計データ（直近30日）
  // データソース: orders
  // 計算ロジック: calculateDailyData() を使用
  // フォールバック: モックデータ（NEXT_PUBLIC_USE_MOCK_DATA=true の場合）
  const dailyData = useMemo(() => {
    const realData = calculateDailyData(orders);
    return getDataWithFallback(realData, getMockDailyData(), shouldUseMockData());
  }, [orders]);

  // 今日の売上と注文件数
  // データソース: orders
  // 計算ロジック: calculateTodayStats() を使用
  const todayStats = useMemo(() => {
    return calculateTodayStats(orders);
  }, [orders]);

  /**
   * ランキングを取得（API経由）
   * API エンドポイント経由で全体ランキングを取得し、自分の順位を更新
   * useCallback でメモ化して再レンダリングループを防止
   *
   * データソース:
   * - /api/rankings (Service Role Key を使用して全注文を集計)
   * 
   * 計算ロジック:
   * - myRank: API から返された自分の順位
   * 
   * NOTE: fetchBattleStatus からも参照されるため、
   * TDZ（Temporal Dead Zone）を避ける目的で先に定義している。
   */
  const fetchRanking = useCallback(async (userId: string) => {
    // ローディング開始、エラー状態をクリア
    setLoadingState((prev) => ({ ...prev, ranking: true }));
    setErrorState((prev) => ({ ...prev, ranking: null }));

    try {
      const response = await fetch("/api/rankings");
      
      if (!response.ok) {
        // 本番環境では詳細なエラー情報をログに出力しない（セキュリティ）
        if (process.env.NODE_ENV === "development") {
          console.error("ランキングAPIの取得に失敗しました");
        }
        setErrorState((prev) => ({
          ...prev,
          ranking: "ランキングの取得に失敗しました",
        }));
        setMyRank(null);
        return;
      }

      const data = await response.json();
      
      // APIから返された自分の順位を設定
      if (data.myRank !== undefined && data.myRank !== null) {
        setMyRank(data.myRank);
      } else {
        setMyRank(null);
      }
    } catch (error) {
      // 本番環境では詳細なエラー情報をログに出力しない（セキュリティ）
      if (process.env.NODE_ENV === "development") {
        console.error("ランキングデータの取得エラー:", error);
      }
      setErrorState((prev) => ({
        ...prev,
        ranking: "ランキングデータの取得中にエラーが発生しました",
      }));
      setMyRank(null);
    } finally {
      // ローディング終了
      setLoadingState((prev) => ({ ...prev, ranking: false }));
    }
  }, []); // 依存配列を空にして、関数を固定

  /**
   * 参加中のバトル状況を取得（実DB接続）
   * useCallback でメモ化して再レンダリングループを防止
   */
  const fetchBattleStatus = useCallback(async (userId: string) => {
    try {
      // 1. ユーザーが参加しているバトルを取得
      const { data: participants, error: participantsError } = await supabase
        .from("battle_participants")
        .select("battle_id")
        .eq("creator_id", userId);

      if (participantsError) {
        // 本番環境では詳細なエラー情報をログに出力しない（セキュリティ）
        if (process.env.NODE_ENV === "development") {
          console.error("バトル参加情報の取得に失敗しました:", participantsError);
        }
        setBattles((prev) => (prev.length === 0 ? prev : []));
        return;
      }

      if (!participants || participants.length === 0) {
        // 参加バトルがない場合: モックデータを使用するか空配列を設定
        if (shouldUseMockData()) {
          setBattles(getMockBattles());
        } else {
          setBattles((prev) => (prev.length === 0 ? prev : []));
        }
        return;
      }

      const battleIds = participants.map((p) => p.battle_id);

      // 2. 参加中のバトルの詳細を取得
      const { data: battlesData, error: battlesError } = await supabase
        .from("battles")
        .select("id, category, title, is_active")
        .in("id", battleIds)
        .eq("is_active", true);

      if (battlesError) {
        // 本番環境では詳細なエラー情報をログに出力しない（セキュリティ）
        if (process.env.NODE_ENV === "development") {
          console.error("バトル情報の取得に失敗しました:", battlesError);
        }
        setErrorState((prev) => ({
          ...prev,
          battles: "バトル情報の取得に失敗しました",
        }));
        setBattles((prev) => (prev.length === 0 ? prev : []));
        return;
      }

      if (!battlesData || battlesData.length === 0) {
        // アクティブバトルがない場合: モックデータを使用するか空配列を設定
        if (shouldUseMockData()) {
          setBattles(getMockBattles());
        } else {
          setBattles((prev) => (prev.length === 0 ? prev : []));
        }
        return;
      }

      // 3. 各バトルの参加者IDを一括取得
      const { data: allParticipants } = await supabase
        .from("battle_participants")
        .select("battle_id, creator_id")
        .in("battle_id", battleIds);

      // バトルごとに参加者をグループ化
      const participantsByBattle = new Map<string, string[]>();
      allParticipants?.forEach((p) => {
        const current = participantsByBattle.get(p.battle_id) || [];
        current.push(p.creator_id);
        participantsByBattle.set(p.battle_id, current);
      });

      // 4. 各バトルの参加者の orders を一括取得して集計
      const allParticipantIds = Array.from(
        new Set(allParticipants?.map((p) => p.creator_id) || [])
      );

      const { data: allBattleOrders } = await supabase
        .from("orders")
        .select("creator_id, amount")
        .in("creator_id", allParticipantIds);

      // creator_id ごとに売上を集計
      const creatorSales = new Map<string, number>();
      allBattleOrders?.forEach((order) => {
        const current = creatorSales.get(order.creator_id) || 0;
        creatorSales.set(order.creator_id, current + (order.amount || 0));
      });

      // 5. 各バトルのステータスを計算
      const battleStatuses: BattleStatus[] = battlesData.map((battle) => {
        const battleParticipantIds =
          participantsByBattle.get(battle.id) || [];
        const participantsCount = battleParticipantIds.length;

        // このバトルの参加者の売上合計を GMV として計算
        const gmv = battleParticipantIds.reduce((sum, creatorId) => {
          return sum + (creatorSales.get(creatorId) || 0);
        }, 0);

        // このバトル内でのユーザーの順位を計算
        const battleCreatorSales = battleParticipantIds
          .map((creatorId) => ({
            creatorId,
            sales: creatorSales.get(creatorId) || 0,
          }))
          .sort((a, b) => b.sales - a.sales);

        const rank =
          battleCreatorSales.findIndex((c) => c.creatorId === userId) + 1;

        return {
          id: battle.id,
          category: battle.category || "未分類",
          title: battle.title || battle.category || "バトル",
          rank: rank > 0 ? rank : 0,
          participants: participantsCount,
          gmv,
        };
      });

      // 前回の値と比較して、変更がある場合のみ state を更新
      setBattles((prev) => {
        // 配列の内容が同じかチェック
        if (
          prev.length === battleStatuses.length &&
          prev.every((p, i) => {
            const b = battleStatuses[i];
            return (
              p.id === b.id &&
              p.rank === b.rank &&
              p.participants === b.participants &&
              p.gmv === b.gmv
            );
          })
        ) {
          return prev; // 変更がない場合は前回の state を返す
        }
        return battleStatuses;
      });

      // 全体のランキングを計算（全バトル合計）
      await fetchRanking(userId);
    } catch (error) {
      // 本番環境では詳細なエラー情報をログに出力しない（セキュリティ）
      if (process.env.NODE_ENV === "development") {
        console.error("バトル状況の取得エラー:", error);
      }
      // 変更がある場合のみ state を更新
      setBattles((prev) => {
        if (prev.length === 0) {
          return prev;
        }
        return [];
      });
      setErrorState((prev) => ({
        ...prev,
        battles: "バトル状況の取得中にエラーが発生しました",
      }));
    } finally {
      // ローディング終了
      setLoadingState((prev) => ({ ...prev, battles: false }));
    }
  }, [fetchRanking]); // fetchRanking を依存配列に追加

  /**
   * 商品一覧を取得
   * useCallback でメモ化して再レンダリングループを防止
   * 
   * データソース:
   * - products (status = 'active' の商品)
   * 
   * 用途:
   * - テスト売上生成モーダルで使用
   */
  const fetchProducts = useCallback(async () => {
    // ローディング開始、エラー状態をクリア
    setLoadingState((prev) => ({ ...prev, products: true }));
    setErrorState((prev) => ({ ...prev, products: null }));

    try {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, price")
        .eq("status", "active")
        .limit(10);

      if (error) {
        // 本番環境では詳細なエラー情報をログに出力しない（セキュリティ）
        if (process.env.NODE_ENV === "development") {
          console.error("商品データの取得に失敗しました:", error);
        }
        setErrorState((prev) => ({
          ...prev,
          products: "商品データの取得に失敗しました",
        }));
        return;
      }

      if (data) {
        // 前回の値と比較して、変更がある場合のみ state を更新
        setProducts((prev) => {
          // 配列の内容が同じかチェック
          if (
            prev.length === data.length &&
            prev.every((p, i) => p.id === data[i].id)
          ) {
            return prev; // 変更がない場合は前回の state を返す
          }
          return data as ProductSummary[];
        });
        // 最初の商品を選択（変更がある場合のみ）
        if (data.length > 0) {
          setSelectedProductId((prev) => {
            if (prev === data[0].id) return prev;
            return data[0].id;
          });
          setOrderAmount((prev) => {
            const newAmount = data[0].price || 0;
            if (prev === newAmount) return prev;
            return newAmount;
          });
        }
      }
    } catch (error) {
      // 本番環境では詳細なエラー情報をログに出力しない（セキュリティ）
      if (process.env.NODE_ENV === "development") {
        console.error("商品データの取得エラー:", error);
      }
      setErrorState((prev) => ({
        ...prev,
        products: "商品データの取得中にエラーが発生しました",
      }));
    } finally {
      // ローディング終了
      setLoadingState((prev) => ({ ...prev, products: false }));
    }
  }, []); // 依存配列を空にして、関数を固定

  /**
   * 売上を生成（テスト用）
   */
  const handleCreateOrder = async () => {
    if (!selectedProductId || !orderAmount || orderAmount <= 0) {
      showErrorToast("商品と金額を選択してください");
      return;
    }

    setIsCreatingOrder(true);
    try {
      const response = await fetch("/api/orders/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          product_id: selectedProductId,
          amount: orderAmount,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "売上の生成に失敗しました");
      }

      // 成功: データを再取得してダッシュボードを更新
      if (user) {
        await fetchSalesData(user.id);
        await fetchBattleStatus(user.id);
      }

      setShowCreateOrderModal(false);
      showSuccessToast("売上を生成しました！");
    } catch (error: any) {
      // 本番環境では詳細なエラー情報をログに出力しない（セキュリティ）
      if (process.env.NODE_ENV === "development") {
        console.error("売上生成エラー:", error);
      }
      showErrorToast(error.message || "売上の生成に失敗しました");
    } finally {
      setIsCreatingOrder(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.replace("/");
    } catch (error) {
      // 本番環境では詳細なエラー情報をログに出力しない（セキュリティ）
      if (process.env.NODE_ENV === "development") {
        console.error("ログアウトエラー:", error);
      }
    }
  };

  // loading 中はスケルトンローディングを表示
  if (isLoading) {
    return <DashboardSkeleton />;
  }

  // user 情報が取得できなかった場合は、/login に戻さず静かなエラーメッセージだけ表示する
  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-4">
          <p className="text-sm text-zinc-300">
            {authError ??
              "ログイン情報を取得できませんでした。もう一度サインインしてください。"}
          </p>
          <a
            href="/login"
            className="inline-flex items-center justify-center rounded-full bg-white px-6 py-2.5 text-xs font-semibold tracking-[0.18em] text-black shadow-[0_18px_40px_rgba(0,0,0,0.9)] transition hover:-translate-y-0.5 hover:bg-slate-50"
          >
            ログイン画面に戻る
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-16 md:pb-0">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* ヘッダー */}
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">SELL RUSH コマンドセンター</h1>
            <p className="text-zinc-400 text-sm mt-1">
              あなたの「販売バトル」の状況をリアルタイムで把握できます。
            </p>
          </div>
        </header>

        {/* ヘッダー右側：ログアウトボタン（控えめに配置） */}
        <div className="mb-6 flex justify-end">
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 transition-colors hover:text-slate-200"
          >
            <LogOut className="w-3.5 h-3.5" />
            {t(copy.auth.dashboard.logout, language)}
          </button>
        </div>

        {/* ガイダンスバー */}
        {(() => {
          const hasRevenue = salesStats.totalRevenue > 0;
          const hasActiveBattles = battles.length > 0;

          let guidanceText = "";
          let GuidanceIcon = CheckCircle;
          let bgColor = "bg-sky-500/10";
          let borderColor = "border-sky-500/20";
          let textColor = "text-sky-200";

          if (!hasRevenue) {
            // 売上 = 0
            guidanceText = "今やること：紹介リンクをSNSに投稿してください";
            GuidanceIcon = CheckCircle;
            bgColor = "bg-emerald-500/10";
            borderColor = "border-emerald-500/20";
            textColor = "text-emerald-200";
          } else if (hasActiveBattles) {
            // 売上 > 0 かつ 参加中バトルあり
            guidanceText = "進行中：このバトルを伸ばしましょう";
            GuidanceIcon = Flame;
            bgColor = "bg-amber-500/10";
            borderColor = "border-amber-500/20";
            textColor = "text-amber-200";
          } else {
            // 売上 > 0 かつ バトル未参加
            guidanceText = "次の販売バトルに参加してスコアを伸ばしましょう";
            GuidanceIcon = ArrowRightCircle;
            bgColor = "bg-blue-500/10";
            borderColor = "border-blue-500/20";
            textColor = "text-blue-200";
          }

          return (
            <div
              className={`mb-6 rounded-lg border ${borderColor} ${bgColor} px-4 py-2.5`}
            >
              <div className="flex items-center gap-2.5">
                <GuidanceIcon className={`w-4 h-4 ${textColor} flex-shrink-0`} />
                <p className={`text-sm font-medium ${textColor}`}>
                  {guidanceText}
                </p>
              </div>
            </div>
          );
        })()}

        {/* 主CTA：紹介リンクを発行する */}
        <div className="mb-6">
          <button
            onClick={() => setShowAffiliateLinkModal(true)}
            className="w-full md:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl bg-white text-black text-base font-semibold tracking-wide shadow-[0_18px_40px_rgba(0,0,0,0.9)] transition-all hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-[0_20px_50px_rgba(0,0,0,0.95)]"
          >
            <Link2 className="w-5 h-5" />
            紹介リンクを発行する
          </button>
        </div>

        {/* 上部: Tonight Battle / 今日のサマリ / 報酬見込み / 順位 */}
        <section className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Tonight Battle / アクティブバトル */}
            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-950/80 to-zinc-900/60 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <p className="text-xs text-zinc-400 uppercase tracking-wide">
                  今夜のバトル
                </p>
              </div>
              {battles.length > 0 ? (
                <div>
                  <p className="text-lg font-semibold text-white mb-1">
                    {battles[0].title || battles[0].category}
                  </p>
                  <p className="text-[11px] text-zinc-500">
                    順位: #{battles[0].rank > 0 ? battles[0].rank : "未確定"} / 参加者{" "}
                    {battles[0].participants}人
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-lg font-semibold text-zinc-400 mb-1">
                    参加中なし
                  </p>
                  <p className="text-[11px] text-zinc-500">
                    次のバトルに参加しましょう
                  </p>
                </div>
              )}
            </div>

            {/* 今日の売上 */}
            {/* データソース: orders (fetchSalesData で取得) */}
            {/* 計算ロジック: calculateTodayStats() を使用 */}
            <DashboardCard
              title="今日の売上"
              icon={<TrendingUp className="w-4 h-4 text-sky-400" />}
              isLoading={loadingState.sales}
              error={errorState.sales}
              onRetry={user?.id ? () => fetchSalesData(user.id) : undefined}
            >
              <p className="text-lg font-semibold text-white mb-1">
                ¥{todayStats.gmv.toLocaleString()}
              </p>
              <p className="text-[11px] text-zinc-500">
                {todayStats.count} 件の注文
              </p>
            </DashboardCard>

            {/* 報酬見込み */}
            {/* データソース: salesStats.estimatedCommission (fetchSalesData で計算) */}
            {/* 計算ロジック: 商品ごとの creator_share_rate で計算 */}
            <DashboardCard
              title="報酬見込み"
              icon={<Trophy className="w-4 h-4 text-emerald-400" />}
              isLoading={loadingState.sales}
              error={errorState.sales}
              onRetry={user?.id ? () => fetchSalesData(user.id) : undefined}
            >
              <p className="text-lg font-semibold text-white mb-1">
                ¥{salesStats.estimatedCommission.toLocaleString()}
              </p>
              <p className="text-[11px] text-zinc-500">
                {getEstimatedCommissionDescription(salesStats)}
              </p>
            </DashboardCard>
          </div>

          {/* 報酬サマリー（確定済み/pending） */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* 確定済み報酬 */}
            {/* データソース: payoutStats.totalPaid (fetchPayoutStats で計算) */}
            {/* 計算ロジック: payouts から status = 'paid' をフィルタ → creator_amount を合計 */}
            <DashboardCard
              title="確定済み報酬"
              icon={<CheckCircle className="w-4 h-4 text-emerald-400" />}
              isLoading={loadingState.payouts}
              error={errorState.payouts}
              onRetry={user?.id ? () => fetchPayoutStats(user.id) : undefined}
              className="border-emerald-500/20 bg-emerald-500/5"
            >
              <p className="text-xl font-semibold text-emerald-400 mb-1">
                ¥{payoutStats.totalPaid.toLocaleString()}
              </p>
              <p className="text-[11px] text-zinc-500">
                {payoutStats.paidCount}件の支払い済み
              </p>
            </DashboardCard>

            {/* 支払い待ち報酬 */}
            {/* データソース: payoutStats.totalPending (fetchPayoutStats で計算) */}
            {/* 計算ロジック: payouts から status = 'pending' をフィルタ → creator_amount を合計 */}
            <DashboardCard
              title="支払い待ち"
              icon={<Zap className="w-4 h-4 text-amber-400" />}
              isLoading={loadingState.payouts}
              error={errorState.payouts}
              onRetry={user?.id ? () => fetchPayoutStats(user.id) : undefined}
              className="border-amber-500/20 bg-amber-500/5"
            >
              <p className="text-xl font-semibold text-amber-400 mb-1">
                ¥{payoutStats.totalPending.toLocaleString()}
              </p>
              <p className="text-[11px] text-zinc-500">
                {payoutStats.pendingCount}件の処理待ち
              </p>
            </DashboardCard>
          </div>

          {/* 現在の順位 */}
          <DashboardCard
            title="現在のポジション"
            icon={<Target className="w-4 h-4 text-purple-400" />}
            isLoading={loadingState.battles || loadingState.ranking}
            error={errorState.battles || errorState.ranking}
            onRetry={
              user?.id
                ? () => {
                    fetchBattleStatus(user.id);
                    fetchRanking(user.id);
                  }
                : undefined
            }
          >
            {(() => {
              // データソース: battles[0].rank または myRank
              // 計算ロジック: バトル内順位を優先、なければ全体ランキング
              const battleRank = getBattleRank(battles);
              
              if (battleRank !== null) {
                return (
                  <div>
                    <p className="text-lg font-semibold text-white mb-1">
                      #{battleRank}
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      {battles[0].title || battles[0].category}内
                    </p>
                  </div>
                );
              } else if (myRank !== null) {
                return (
                  <div>
                    <p className="text-lg font-semibold text-white mb-1">
                      #{myRank}
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      全体ランキング
                    </p>
                  </div>
                );
              } else {
                return (
                  <div>
                    <p className="text-lg font-semibold text-zinc-400 mb-1">
                      —
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      バトルに参加すると表示されます
                    </p>
                  </div>
                );
              }
            })()}
          </DashboardCard>

          {/* 累計サマリ（小さめ） */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 累計販売件数 */}
            {/* データソース: salesStats.totalSales (fetchSalesData で計算) */}
            <div className="rounded-xl border border-white/10 bg-zinc-950/50 px-4 py-3">
              <p className="text-xs text-zinc-400 mb-1">累計販売件数</p>
              <p className="text-lg font-semibold text-white">
                {salesStats.totalSales.toLocaleString()} 件
              </p>
            </div>
            {/* 累計売上 */}
            {/* データソース: salesStats.totalRevenue (fetchSalesData で計算) */}
            <div className="rounded-xl border border-white/10 bg-zinc-950/50 px-4 py-3">
              <p className="text-xs text-zinc-400 mb-1">累計売上</p>
              <p className="text-lg font-semibold text-white">
                ¥{salesStats.totalRevenue.toLocaleString()}
              </p>
            </div>
            {/* 平均注文単価 */}
            {/* データソース: salesStats (計算値) */}
            {/* 計算ロジック: calculateAverageOrderValue() を使用 */}
            <div className="rounded-xl border border-white/10 bg-zinc-950/50 px-4 py-3">
              <p className="text-xs text-zinc-400 mb-1">平均注文単価</p>
              <p className="text-lg font-semibold text-white">
                ¥{calculateAverageOrderValue(salesStats).toLocaleString()}
              </p>
            </div>
          </div>
        </section>

        {/* 中段: グラフエリア（売上推移） */}
        <section className="mb-8">
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-950/80 to-zinc-900/60 p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-sky-400" />
              <h2 className="text-sm font-semibold tracking-wide uppercase text-zinc-200">
                売上推移（直近30日）
              </h2>
            </div>
            <div className="h-64">
              {dailyData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-zinc-500">
                  まだ実績がありません。紹介リンクを投稿すると反映されます。
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={dailyData}>
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
                    <YAxis
                      yAxisId="left"
                      tick={{ fill: "#71717a", fontSize: 10 }}
                      tickFormatter={(value: number) => {
                        if (value >= 10000) {
                          return `¥${(value / 10000).toFixed(1)}万`;
                        }
                        return `¥${value}`;
                      }}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fill: "#71717a", fontSize: 10 }}
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
                        return [`${value} 件`, "注文件数"];
                      }}
                      labelFormatter={(label: string) => {
                        const date = new Date(label);
                        return date.toLocaleDateString("ja-JP", {
                          month: "2-digit",
                          day: "2-digit",
                        });
                      }}
                    />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="gmv"
                      fill="rgba(59, 130, 246, 0.2)"
                      stroke="#3b82f6"
                      strokeWidth={2}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="orders"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>
            <p className="mt-2 text-[11px] text-zinc-500">
              青のエリア: GMV（売上高）、緑の線: 注文件数
            </p>
          </div>
        </section>

        {/* 下段: 直近注文リスト + アクティブバトルカード */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* 直近注文リスト */}
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-950/80 to-zinc-900/60 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Package className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-semibold tracking-wide uppercase text-zinc-200">
                直近の注文
              </h2>
            </div>
            <div className="max-h-[400px] overflow-y-auto">
              {orders.length === 0 ? (
                <p className="text-center text-sm text-zinc-500 py-8">
                  まだ注文は発生していません
                </p>
              ) : (
                <div className="space-y-2">
                  {orders.slice(0, 20).map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 text-xs"
                    >
                      <div className="flex-1">
                        <p className="text-zinc-300 font-medium mb-1">
                          {order.created_at
                            ? new Date(order.created_at).toLocaleString("ja-JP", {
                                month: "2-digit",
                                day: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "-"}
                        </p>
                        <p className="text-[11px] text-zinc-500">
                          {order.status || "completed"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-zinc-100 font-semibold">
                          ¥{(order.amount || 0).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* アクティブバトルカード */}
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-950/80 to-zinc-900/60 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <h2 className="text-sm font-semibold tracking-wide uppercase text-zinc-200">
                  アクティブバトル
                </h2>
              </div>
              <button className="flex items-center gap-1 text-xs text-sky-300 hover:text-sky-200">
                バトル一覧
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-3">
              {battles.length === 0 ? (
                <p className="text-center text-sm text-zinc-500 py-8">
                  現在参加中のバトルはありません
                </p>
              ) : (
                battles.map((battle) => (
                  <div
                    key={battle.id}
                    className="rounded-xl border border-white/10 bg-black/40 px-4 py-3"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold text-zinc-100">
                        {battle.title || battle.category}
                      </p>
                      <span className="text-xs text-emerald-300 font-semibold">
                        #{battle.rank > 0 ? battle.rank : "未確定"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-zinc-400">
                      <span>参加者 {battle.participants} 人</span>
                      <span>GMV ¥{battle.gmv.toLocaleString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* ランキングボード */}
        <section className="mb-8">
          <RankingBoard currentUserId={user.id} myRank={myRank} />
        </section>
      </div>

      {/* 開発用：テスト売上生成ボタン（控えめに配置） */}
      {process.env.NODE_ENV === "development" && (
        <div className="mt-8 flex justify-center">
          <button
            onClick={() => setShowCreateOrderModal(true)}
            className="inline-flex items-center gap-1.5 text-[10px] text-zinc-500 border border-zinc-700/50 px-2 py-1 rounded transition-colors hover:bg-zinc-800/50"
          >
            <Plus className="w-3 h-3" />
            テスト売上を生成（開発用）
          </button>
        </div>
      )}

      <MobileTabBar />

      {/* Password Setup Modal */}
      {showPasswordSetup && user && (
        <PasswordSetupModal
          onClose={() => {
            setShowPasswordSetup(false);
            localStorage.setItem(`password-setup-dismissed-${user.id}`, "true");
          }}
        />
      )}

      {/* Affiliate Link Modal */}
      <AffiliateLinkModal
        isOpen={showAffiliateLinkModal}
        onClose={() => setShowAffiliateLinkModal(false)}
        onSuccess={(affiliateCode, productId) => {
          // 紹介リンク生成成功時の処理
          // 必要に応じてデータを再取得
          if (user?.id) {
            fetchSalesData(user.id);
          }
        }}
      />

      {/* Create Order Modal */}
      {showCreateOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">テスト売上を生成</h2>
              <button
                onClick={() => setShowCreateOrderModal(false)}
                className="text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-2">
                  商品を選択
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => {
                    setSelectedProductId(e.target.value);
                    const product = products.find((p) => p.id === e.target.value);
                    if (product) {
                      setOrderAmount(product.price || 0);
                    }
                  }}
                  className="w-full bg-zinc-800 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} (¥{product.price?.toLocaleString() || 0})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-2">
                  売上金額
                </label>
                <input
                  type="number"
                  value={orderAmount}
                  onChange={(e) => setOrderAmount(Number(e.target.value))}
                  min="1"
                  className="w-full bg-zinc-800 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="金額を入力"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowCreateOrderModal(false)}
                  className="flex-1 px-4 py-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleCreateOrder}
                  disabled={isCreatingOrder || !selectedProductId || orderAmount <= 0}
                  className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreatingOrder ? "生成中..." : "生成する"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


