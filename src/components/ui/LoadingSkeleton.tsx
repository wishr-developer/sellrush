"use client";

/**
 * スケルトンローディングコンポーネント
 */

export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-black text-white pb-16 md:pb-0">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* ヘッダースケルトン */}
        <div className="mb-8">
          <div className="h-8 w-64 bg-zinc-900 rounded-lg animate-pulse mb-2" />
          <div className="h-4 w-96 bg-zinc-900 rounded-lg animate-pulse" />
        </div>

        {/* KPIカードスケルトン */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-950/80 to-zinc-900/60 p-4"
            >
              <div className="h-4 w-24 bg-zinc-800 rounded animate-pulse mb-3" />
              <div className="h-8 w-32 bg-zinc-800 rounded animate-pulse mb-2" />
              <div className="h-3 w-20 bg-zinc-800 rounded animate-pulse" />
            </div>
          ))}
        </div>

        {/* グラフスケルトン */}
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-950/80 to-zinc-900/60 p-5 mb-8">
          <div className="h-4 w-32 bg-zinc-800 rounded animate-pulse mb-4" />
          <div className="h-64 bg-zinc-900/50 rounded-lg animate-pulse" />
        </div>

        {/* リストスケルトン */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-950/80 to-zinc-900/60 p-5"
            >
              <div className="h-4 w-24 bg-zinc-800 rounded animate-pulse mb-4" />
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((j) => (
                  <div
                    key={j}
                    className="h-16 bg-zinc-900/50 rounded-lg animate-pulse"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-950/80 to-zinc-900/60 p-4 animate-pulse">
      <div className="h-4 w-24 bg-zinc-800 rounded mb-3" />
      <div className="h-8 w-32 bg-zinc-800 rounded mb-2" />
      <div className="h-3 w-20 bg-zinc-800 rounded" />
    </div>
  );
}

export function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="h-16 bg-zinc-900/50 rounded-lg animate-pulse"
        />
      ))}
    </div>
  );
}

