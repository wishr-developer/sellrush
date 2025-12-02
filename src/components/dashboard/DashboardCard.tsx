/**
 * ダッシュボードカードコンポーネント
 * ローディング状態とエラー状態を表示する統一されたカードコンポーネント
 */

import { ReactNode } from "react";
import { CardSkeleton } from "@/components/ui/LoadingSkeleton";
import { RefreshCw, AlertCircle } from "lucide-react";

interface DashboardCardProps {
  /** カードのタイトル */
  title: string;
  /** タイトルのアイコン */
  icon?: ReactNode;
  /** カードの内容 */
  children: ReactNode;
  /** ローディング状態 */
  isLoading?: boolean;
  /** エラーメッセージ */
  error?: string | null;
  /** エラー時のリトライ関数 */
  onRetry?: () => void;
  /** カードのクラス名 */
  className?: string;
}

/**
 * ダッシュボードカードコンポーネント
 * 
 * 機能:
 * - ローディング状態の表示（スケルトンローディング）
 * - エラー状態の表示（エラーメッセージ + リトライボタン）
 * - 通常状態の表示（children）
 */
export function DashboardCard({
  title,
  icon,
  children,
  isLoading = false,
  error = null,
  onRetry,
  className = "",
}: DashboardCardProps) {
  // ローディング状態
  if (isLoading) {
    return (
      <div className={`rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-950/80 to-zinc-900/60 p-4 ${className}`}>
        <div className="flex items-center gap-2 mb-2">
          {icon}
          <p className="text-xs text-zinc-400 uppercase tracking-wide">
            {title}
          </p>
        </div>
        <CardSkeleton />
      </div>
    );
  }

  // エラー状態
  if (error) {
    return (
      <div className={`rounded-2xl border border-red-500/20 bg-red-500/5 p-4 ${className}`}>
        <div className="flex items-center gap-2 mb-2">
          {icon}
          <p className="text-xs text-zinc-400 uppercase tracking-wide">
            {title}
          </p>
        </div>
        <div className="flex flex-col items-center justify-center py-4 space-y-2">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <p className="text-sm text-red-300 text-center">{error}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-300 border border-red-500/30 rounded-lg hover:bg-red-500/10 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              再試行
            </button>
          )}
        </div>
      </div>
    );
  }

  // 通常状態
  return (
    <div className={`rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-950/80 to-zinc-900/60 p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <p className="text-xs text-zinc-400 uppercase tracking-wide">
          {title}
        </p>
      </div>
      {children}
    </div>
  );
}

